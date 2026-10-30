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
    env = await cache.cached("k", 0, bad)
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
