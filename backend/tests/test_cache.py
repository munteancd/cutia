import asyncio
import time

import pytest

from cutia import cache


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()


async def test_cache_returns_fresh_then_cached():
    calls = 0

    async def fetch():
        nonlocal calls
        calls += 1
        return 5

    a = await cache.cached("k", 60, fetch)
    b = await cache.cached("k", 60, fetch)
    assert a["ok"] and a["value"] == 5 and not a["stale"]
    assert b["value"] == 5
    assert calls == 1


async def test_cache_serves_stale_on_error():
    async def good():
        return 5

    async def bad():
        raise RuntimeError("pică")

    await cache.cached("k", 0, good)
    await cache.cached("k", 0, bad)   # pornește reîmprospătarea din fundal, care pică
    await asyncio.sleep(0.05)
    env = await cache.cached("k", 60, bad)
    assert env["ok"] is True
    assert env["value"] == 5
    assert env["stale"] is True
    assert "pică" in env["error"]


async def test_cache_no_value_on_first_error():
    async def bad():
        raise RuntimeError("x")

    env = await cache.cached("k", 60, bad)
    assert env["ok"] is False
    assert env["value"] is None


async def test_slow_source_does_not_block():
    async def slow():
        await asyncio.sleep(10)

    t = time.monotonic()
    env = await cache.cached("k", 60, slow, timeout=0.2)
    assert time.monotonic() - t < 1
    assert env["ok"] is False


async def test_expired_value_returned_at_once_and_refreshed_in_background():
    n = 0

    async def slow():
        nonlocal n
        n += 1
        if n > 1:
            await asyncio.sleep(0.5)
        return n

    await cache.cached("k", 0, slow)            # prima dată: așteptăm (n=1)
    t = time.monotonic()
    env = await cache.cached("k", 0, slow)      # expirat: primim imediat valoarea veche
    assert time.monotonic() - t < 0.2
    assert env["value"] == 1 and env["ok"]
    await asyncio.sleep(0.7)                    # reîmprospătarea din fundal a terminat
    assert (await cache.cached("k", 60, slow))["value"] == 2


async def test_background_refresh_failure_marks_stale():
    n = 0

    async def flaky():
        nonlocal n
        n += 1
        if n > 1:
            raise RuntimeError("căzut")
        return "bun"

    await cache.cached("k", 0, flaky)
    await cache.cached("k", 0, flaky)           # pornește reîmprospătarea, care pică
    await asyncio.sleep(0.05)
    env = await cache.cached("k", 60, flaky)
    assert env["value"] == "bun" and env["stale"] is True and "căzut" in env["error"]
