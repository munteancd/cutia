"""Calendarul: evenimente pe zile (interviu, AJOFM, turneu), într-un fișier JSON pe server (DATA_DIR).
Otto trimite pe WhatsApp seara ce e mâine și dimineața ce e azi (vezi cutia.remind)."""
import json
import os
import re
import threading
import time
from datetime import date, timedelta
from pathlib import Path

from ..settings import ROOT, Settings

_lock = threading.Lock()
ID = re.compile(r"[A-Za-z0-9_-]{1,40}")
HOUR = re.compile(r"([01]\d|2[0-3]):[0-5]\d")
ZILE = ["luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică"]
LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"]


def _file(s: Settings) -> Path:
    d = Path(s.get("DATA_DIR") or ROOT / "data")
    d.mkdir(parents=True, exist_ok=True)
    return d / "calendar.json"


def _load(s: Settings) -> dict:
    f = _file(s)
    return json.loads(f.read_text(encoding="utf-8")).get("events", {}) if f.exists() else {}


def _save(s: Settings, events: dict) -> None:
    f = _file(s)
    tmp = f.with_suffix(".tmp")  # scris întâi alături, ca o cădere să nu lase fișierul pe jumătate
    tmp.write_text(json.dumps({"events": events}, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, f)


def all_events(s: Settings) -> list[dict]:
    with _lock:
        events = _load(s)
    # în aceeași zi: întâi cele fără oră, apoi după oră
    return sorted(({"id": k, **v} for k, v in events.items()), key=lambda e: (e["date"], e["time"]))


def on_day(s: Settings, day: date) -> list[dict]:
    return [e for e in all_events(s) if e["date"] == day.isoformat()]


def save(s: Settings, event_id: str, day: str, title: str, hour: str = "", place: str = "") -> dict:
    if not ID.fullmatch(event_id) or not title.strip() or (hour and not HOUR.fullmatch(hour)):
        raise ValueError("eveniment greșit")
    date.fromisoformat(day)  # ValueError pe o dată greșită
    with _lock:
        events = _load(s)
        events[event_id] = {"date": day, "title": title.strip(), "time": hour,
                            "place": place.strip(), "updated": time.time()}
        _save(s, events)
    return {"id": event_id, **events[event_id]}


def delete(s: Settings, event_id: str) -> None:
    with _lock:
        events = _load(s)
        events.pop(event_id, None)
        _save(s, events)


def message(kind: str, day: date, events: list[dict]) -> str | None:
    """Mesajul de WhatsApp pentru o zi; None dacă ziua e liberă."""
    if not events:
        return None
    head = f"📅 {'Mâine' if kind == 'maine' else 'Azi'}, {ZILE[day.weekday()]} {day.day} {LUNI[day.month - 1]}:"
    lines = [f"• {e['time'] + ' ' if e['time'] else ''}{e['title']}{' — ' + e['place'] if e['place'] else ''}"
             for e in events]
    return "\n".join([head, *lines])


def _today() -> date:
    return date.today()


async def fetch(s: Settings) -> dict:
    """Căsuța de pe Acasă: ce e azi și mâine."""
    today = _today()
    return {"today": on_day(s, today), "tomorrow": on_day(s, today + timedelta(days=1))}
