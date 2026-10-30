"""Abonații canalelor lui, prin tokenurile OAuth pe care Otto le are deja.

Cheile stau în .env-ul lui Hermes (HERMES_ENV); config/youtube.yaml spune doar
ce sufixe de chei folosește fiecare canal, deci în repo nu ajunge niciun secret.
"""
from pathlib import Path

import httpx

from ..settings import Settings, _read_env


async def _subs(c: httpx.AsyncClient, cid: str, secret: str, refresh: str) -> int:
    r = await c.post("https://oauth2.googleapis.com/token", data={
        "client_id": cid, "client_secret": secret,
        "refresh_token": refresh, "grant_type": "refresh_token"})
    r.raise_for_status()
    token = r.json()["access_token"]
    r = await c.get("https://www.googleapis.com/youtube/v3/channels",
                    params={"part": "statistics", "mine": "true"},
                    headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return int(r.json()["items"][0]["statistics"]["subscriberCount"])


async def fetch(s: Settings) -> dict:
    henv = _read_env(Path(s.get("HERMES_ENV") or "~/.hermes/.env").expanduser())
    out = []
    async with httpx.AsyncClient(timeout=4) as c:
        for ch in s.config("youtube"):
            subs = await _subs(c, henv[f"YOUTUBE_CLIENT_ID{ch['client']}"],
                               henv[f"YOUTUBE_CLIENT_SECRET{ch['client']}"],
                               henv[f"YOUTUBE_REFRESH_TOKEN{ch['token']}"])
            out.append({"name": ch["name"], "subs": subs})
    return {"channels": out}
