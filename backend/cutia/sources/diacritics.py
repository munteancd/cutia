"""Diacritice: ş/ţ cu sedilă → ș/ț, iar cele care lipsesc le pune Gemini.

Cheia Gemini e în .env-ul lui Hermes (ca la YouTube). Gemini are voie doar să
pună diacritice: dacă răspunsul, fără diacritice, nu e identic cu textul trimis,
îl refuzăm (ar fi schimbat cuvinte).
"""
import unicodedata
from pathlib import Path

import httpx

from ..settings import Settings, _read_env

MODEL = "gemini-3-flash-preview"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
PROMPT = ("Pune diacriticele românești corecte (ă, â, î, ș, ț) în textul de mai jos. "
          "Nu schimba nimic altceva: aceleași cuvinte, aceeași punctuație, aceleași rânduri. "
          "Răspunde doar cu textul.\n\n")
CEDILLA = str.maketrans("şţŞŢ", "șțȘȚ")


def fix_cedilla(text: str) -> str:
    return text.translate(CEDILLA)


def _bare(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c))


async def restore(s: Settings, text: str) -> str:
    key = _read_env(Path(s.get("HERMES_ENV") or "~/.hermes/.env").expanduser())["GEMINI_API_KEY"]
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(URL, params={"key": key}, json={
            "contents": [{"parts": [{"text": PROMPT + text}]}],
            "generationConfig": {"temperature": 0}})
        r.raise_for_status()
    parts = r.json()["candidates"][0]["content"]["parts"]
    out = fix_cedilla("".join(p.get("text", "") for p in parts if not p.get("thought")))
    # Gemini mai taie spațiile de la capete; le păstrăm pe cele din original
    out = text[:len(text) - len(text.lstrip())] + out.strip() + text[len(text.rstrip()):]
    if _bare(out) != _bare(fix_cedilla(text)):
        raise ValueError("Gemini a schimbat și altceva decât diacriticele")
    return out
