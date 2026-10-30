import asyncio

import httpx
from fastapi import Body, FastAPI, HTTPException
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .cache import cached
from .settings import ROOT, Settings
from .sources import camera, diacritics, football, notes, server, gmail, iptv, karakeep, modal_credit, otto, phone, pihole, printer, weather, youtube

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
    "server": (server.fetch, 60),
}
SPEAK = "/home/cristi/casa/anunta.sh"  # puntea Vocii casei spre boxa Nest


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


@app.get("/api/radio")
async def radio() -> list:
    return [st | {"play": st["url"] if st["url"].startswith("https://")
                  else f"/api/radio/{i}/stream"}
            for i, st in enumerate(settings.config("radio"))]


@app.get("/api/radio/{idx}/stream")
async def radio_stream(idx: int):
    """Stream-urile http:// trec prin server, ca pagina https să le poată reda."""
    stations = settings.config("radio")
    if not 0 <= idx < len(stations) or not stations[idx]["url"].startswith("http://"):
        raise HTTPException(404, "stație necunoscută")
    client = httpx.AsyncClient(timeout=httpx.Timeout(10, read=None), follow_redirects=True)
    upstream = await client.send(client.build_request("GET", stations[idx]["url"]), stream=True)

    async def body():
        try:
            async for chunk in upstream.aiter_raw():
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    media = upstream.headers.get("content-type", "audio/mpeg")
    return StreamingResponse(body(), media_type=media, headers={"Cache-Control": "no-store"})


@app.get("/api/print3d")
async def print3d() -> list:
    return settings.config("print3d")


@app.get("/api/jocuri")
async def jocuri() -> list:
    return settings.config("jocuri")


@app.get("/api/tv")
async def tv() -> dict:
    return await cached("tv", 24 * 60 * 60, lambda: iptv.fetch(settings), timeout=30)



@app.post("/api/diacritice")
async def diacritice(text: str = Body(..., embed=True, max_length=20000)) -> dict:
    try:
        return {"text": await diacritics.restore(settings, text)}
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
        raise HTTPException(502, f"Gemini n-a putut pune diacriticele ({type(e).__name__})")



@app.get("/api/notes")
async def notes_list() -> list:
    return notes.all_notes(settings)


@app.put("/api/notes/{note_id}")
async def note_save(note_id: str, title: str = Body("", max_length=200),
                    body: str = Body("", max_length=200_000)) -> dict:
    try:
        return notes.save(settings, note_id, title, body)
    except ValueError:
        raise HTTPException(400, "id greșit")


@app.delete("/api/notes/{note_id}")
async def note_delete(note_id: str) -> dict:
    notes.delete(settings, note_id)
    return {"ok": True}


@app.get("/api/clip")
async def clip_get() -> dict:
    return notes.get_clip(settings)


@app.put("/api/clip")
async def clip_set(text: str = Body("", embed=True, max_length=200_000)) -> dict:
    return notes.set_clip(settings, text)


@app.get("/api/printer/snapshot")
async def printer_snapshot() -> Response:
    try:
        jpg = await camera.snapshot(settings)
    except httpx.HTTPError:
        jpg = None
    if not jpg:
        raise HTTPException(502, "camera nu răspunde")
    return Response(jpg, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


async def _speak(text: str) -> str:
    p = await asyncio.create_subprocess_exec(settings.get("SPEAK_SCRIPT") or SPEAK, text,
                                             stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    out, _ = await asyncio.wait_for(p.communicate(), 90)
    return out.decode(errors="replace").strip().splitlines()[-1] if out.strip() else "Gata."


@app.post("/api/speak")
async def speak(text: str = Body(..., embed=True, min_length=1, max_length=500)) -> dict:
    try:
        return {"message": await _speak(text)}
    except (OSError, asyncio.TimeoutError):
        raise HTTPException(502, "boxa nu răspunde")


app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
