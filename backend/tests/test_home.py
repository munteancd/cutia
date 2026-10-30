import asyncio
import time

import pytest
from fastapi.testclient import TestClient

from cutia import app as appmod
from cutia import cache

KEYS = {"weather", "gmail", "otto", "pihole", "printer", "phone", "youtube", "modal"}


@pytest.fixture
def client(monkeypatch):
    cache.clear()

    def ok(v):
        async def f(s):
            return v
        return f

    for k in KEYS:
        monkeypatch.setitem(appmod.HOME_SOURCES, k, (ok({"k": k}), 60))
    return TestClient(appmod.app)


def test_home_has_all_keys(client):
    d = client.get("/api/home").json()
    assert KEYS | {"shortcuts"} <= set(d)
    for k in KEYS:
        assert set(d[k]) == {"ok", "value", "updated", "stale", "error"}
        assert d[k]["value"] == {"k": k}
    assert isinstance(d["shortcuts"], list)


def test_home_one_source_failing(client, monkeypatch):
    async def boom(s):
        raise RuntimeError("căzut")
    monkeypatch.setitem(appmod.HOME_SOURCES, "pihole", (boom, 60))
    r = client.get("/api/home")
    assert r.status_code == 200
    assert r.json()["pihole"]["ok"] is False
    assert r.json()["weather"]["ok"] is True


def test_home_hangs_bounded(client, monkeypatch):
    async def hang(s):
        await asyncio.sleep(30)
    monkeypatch.setitem(appmod.HOME_SOURCES, "printer", (hang, 60))
    t = time.monotonic()
    d = client.get("/api/home").json()
    assert time.monotonic() - t < 5
    assert d["printer"]["ok"] is False
