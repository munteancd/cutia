from fastapi.testclient import TestClient

from cutia import app as appmod

STATIONS = [
    {"group": "România", "name": "Kiss FM", "url": "https://live.kissfm.ro/kissfm.aacp"},
    {"group": "România", "name": "Digi FM", "url": "http://edge76.rdsnet.ro:84/digifm/digifm.mp3"},
]


def client(monkeypatch):
    monkeypatch.setattr(appmod.settings, "config",
                        lambda name: STATIONS if name == "radio" else [])
    return TestClient(appmod.app)


def test_radio_play_urls(monkeypatch):
    d = client(monkeypatch).get("/api/radio").json()
    assert d[0]["play"] == "https://live.kissfm.ro/kissfm.aacp"
    assert d[1]["play"] == "/api/radio/1/stream"
    assert d[1]["group"] == "România"


def test_radio_proxy_only_for_http_stations(monkeypatch):
    c = client(monkeypatch)
    assert c.get("/api/radio/0/stream").status_code == 404
    assert c.get("/api/radio/9/stream").status_code == 404
