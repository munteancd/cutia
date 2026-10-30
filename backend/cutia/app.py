from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .settings import ROOT, Settings

settings = Settings.load()
app = FastAPI(title="Cutia")


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
