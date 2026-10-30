import json
import time

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from cutia.settings import Settings
from cutia.sources import camera, notes, server


@pytest.fixture
def s(tmp_path):
    return Settings(env={"DATA_DIR": str(tmp_path)})


# --- notițe ---

def test_notes_start_empty(s):
    assert notes.all_notes(s) == []


def test_note_saved_and_listed_newest_first(s):
    notes.save(s, "a1", "Cumpărături", "[ ] lapte")
    time.sleep(0.01)
    notes.save(s, "b2", "Idei", "ceas")
    assert [n["id"] for n in notes.all_notes(s)] == ["b2", "a1"]
    assert notes.all_notes(s)[1]["body"] == "[ ] lapte"


def test_note_update_keeps_one_copy(s):
    notes.save(s, "a1", "x", "1")
    notes.save(s, "a1", "x", "2")
    assert [(n["id"], n["body"]) for n in notes.all_notes(s)] == [("a1", "2")]


def test_note_delete(s):
    notes.save(s, "a1", "x", "1")
    notes.delete(s, "a1")
    assert notes.all_notes(s) == []


def test_bad_note_id_rejected(s):
    with pytest.raises(ValueError):
        notes.save(s, "../etc", "x", "y")


def test_clip_roundtrip(s):
    assert notes.get_clip(s)["text"] == ""
    notes.set_clip(s, "https://exemplu.ro")
    assert notes.get_clip(s)["text"] == "https://exemplu.ro"


# --- server ---

@respx.mock
async def test_server_status(s, monkeypatch):
    monkeypatch.setattr(server, "_disk", lambda: (36, 138))
    monkeypatch.setattr(server, "_units", lambda names: {
        "restic-backup": ("success", "Fri 2026-10-30 03:35:21 EET"),
        "backup-otto-gdrive": ("exit-code", "Fri 2026-10-30 04:23:48 EET")})
    respx.get("http://127.0.0.1:8765/api/state").respond(json={"status": "connected", "uptime_pct": 97.99})
    respx.get(url__startswith="http://127.0.0.1:8765/api/logs").respond(json=[
        {"event": "disconnected"}, {"event": "connected"}, {"event": "disconnected"}, {"event": "degraded"}])
    out = await server.fetch(s)
    assert out["disk"] == {"used_pct": 36, "free_gb": 138}
    assert out["backups"] == [
        {"name": "local", "ok": True, "when": "Fri 2026-10-30 03:35:21 EET"},
        {"name": "Google Drive", "ok": False, "when": "Fri 2026-10-30 04:23:48 EET"}]
    assert out["net"] == {"up": True, "drops_today": 2}


@respx.mock
async def test_server_status_without_net_monitor(s, monkeypatch):
    monkeypatch.setattr(server, "_disk", lambda: (50, 100))
    monkeypatch.setattr(server, "_units", lambda names: {})
    respx.get(url__startswith="http://127.0.0.1:8765").mock(side_effect=httpx.ConnectError("x"))
    out = await server.fetch(s)
    assert out["net"] is None and out["backups"] == []


# --- camera ---

def test_carve_first_jpeg():
    stream = b"--frame\r\nContent-Type: image/jpeg\r\n\r\n\xff\xd8abc\xff\xd9\r\n--frame\r\n\xff\xd8zzz"
    assert camera.carve(stream) == b"\xff\xd8abc\xff\xd9"


def test_carve_incomplete_is_none():
    assert camera.carve(b"\xff\xd8abc") is None


# --- API ---

@pytest.fixture
def client(s, monkeypatch):
    from cutia import app as appmod
    monkeypatch.setattr(appmod, "settings", s)
    return TestClient(appmod.app)


def test_api_notes_crud(client):
    assert client.put("/api/notes/n1", json={"title": "T", "body": "B"}).status_code == 200
    assert [n["title"] for n in client.get("/api/notes").json()] == ["T"]
    assert client.delete("/api/notes/n1").status_code == 200
    assert client.get("/api/notes").json() == []
    assert client.put("/api/notes/a.b", json={"title": "", "body": ""}).status_code == 400


def test_api_clip(client):
    client.put("/api/clip", json={"text": "salut"})
    assert client.get("/api/clip").json()["text"] == "salut"


def test_api_speak_runs_script(client, monkeypatch):
    from cutia import app as appmod
    seen = {}

    async def fake(text):
        seen["text"] = text
        return "Am spus în casă."
    monkeypatch.setattr(appmod, "_speak", fake)
    r = client.post("/api/speak", json={"text": "Masa e gata"})
    assert r.json() == {"message": "Am spus în casă."} and seen["text"] == "Masa e gata"
