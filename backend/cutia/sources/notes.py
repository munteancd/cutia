"""Notițele și clipboardul comun PC ↔ telefon, într-un fișier JSON pe server (DATA_DIR)."""
import json
import os
import re
import threading
import time
from pathlib import Path

from ..settings import ROOT, Settings

_lock = threading.Lock()
ID = re.compile(r"[A-Za-z0-9_-]{1,40}")


def _file(s: Settings) -> Path:
    d = Path(s.get("DATA_DIR") or ROOT / "data")
    d.mkdir(parents=True, exist_ok=True)
    return d / "notes.json"


def _load(s: Settings) -> dict:
    f = _file(s)
    data = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    return {"notes": data.get("notes", {}), "clip": data.get("clip", {"text": "", "updated": 0})}


def _save(s: Settings, data: dict) -> None:
    f = _file(s)
    tmp = f.with_suffix(".tmp")  # scris întâi alături, ca o cădere să nu lase fișierul pe jumătate
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, f)


def all_notes(s: Settings) -> list[dict]:
    with _lock:
        notes = _load(s)["notes"]
    return sorted(({"id": k, **v} for k, v in notes.items()), key=lambda n: -n["updated"])


def save(s: Settings, note_id: str, title: str, body: str) -> dict:
    if not ID.fullmatch(note_id):
        raise ValueError("id greșit")
    with _lock:
        data = _load(s)
        data["notes"][note_id] = {"title": title, "body": body, "updated": time.time()}
        _save(s, data)
    return {"id": note_id, **data["notes"][note_id]}


def delete(s: Settings, note_id: str) -> None:
    with _lock:
        data = _load(s)
        data["notes"].pop(note_id, None)
        _save(s, data)


def get_clip(s: Settings) -> dict:
    with _lock:
        return _load(s)["clip"]


def set_clip(s: Settings, text: str) -> dict:
    with _lock:
        data = _load(s)
        data["clip"] = {"text": text, "updated": time.time()}
        _save(s, data)
    return data["clip"]
