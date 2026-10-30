import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from .cache import cached
from .settings import ROOT, Settings
from .sources import football, gmail, karakeep, modal_credit, otto, phone, pihole, printer, weather, youtube

settings = Settings.load()
app = FastAPI(title="Cutia")

# căsuța de pe Acasă -> (fetch, cât timp e proaspătă valoarea, în secunde)
HOME_SOURCES = {
    "weather": (weather.fetch, 15 * 60),
    "gmail": (gmail.fetch, 2 * 60),
    "otto": (otto.fetch, 30),
    "pihole": (pihole.fetch, 30),
    "printer": (printer.fetch, 30),
    "phone": (phone.fetch, 5 * 60),
    "youtube": (youtube.fetch, 60 * 60),
    "modal": (modal_credit.fetch, 60 * 60),
}


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/home")
async def home() -> dict:
    names = list(HOME_SOURCES)
    envs = await asyncio.gather(*(
        cached(f"home:{n}", HOME_SOURCES[n][1],
               lambda f=HOME_SOURCES[n][0]: f(settings)) for n in names))
    out = dict(zip(names, envs))
    out["shortcuts"] = settings.config("shortcuts")
    return out


@app.get("/api/bookmarks")
async def bookmarks() -> dict:
    return await cached("bookmarks", 10 * 60, lambda: karakeep.fetch(settings), timeout=15)


@app.get("/api/football")
async def leagues() -> list:
    return settings.config("leagues")


_live: set[int] = set()  # ligi cu un meci în desfășurare -> cache mai scurt


@app.get("/api/football/{league_id}")
async def league(league_id: int) -> dict:
    if league_id not in {lg["id"] for lg in settings.config("leagues")}:
        raise HTTPException(404, "ligă necunoscută")
    ttl = 2 * 60 if league_id in _live else 10 * 60
    env = await cached(f"football:{league_id}", ttl,
                       lambda: football.fetch(settings, league_id), timeout=10)
    if env["ok"]:
        (_live.add if env["value"]["live"] else _live.discard)(league_id)
    return env


app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
