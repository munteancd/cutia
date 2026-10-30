"""Cache în memorie cu „ultima valoare bună".

Fiecare sursă trece prin `cached`: dacă valoarea e proaspătă o dă din cache;
altfel o cere din nou, cu timeout. Dacă cererea pică, pagina primește ultima
valoare bună marcată `stale`, ca o căsuță să nu se golească la un sughiț.
"""
import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

_store: dict[str, tuple[float, Any, str]] = {}  # key -> (monotonic, value, iso)


def clear() -> None:
    _store.clear()


def envelope(ok: bool, value: Any = None, updated: str | None = None,
             stale: bool = False, error: str | None = None) -> dict:
    return {"ok": ok, "value": value, "updated": updated, "stale": stale, "error": error}


async def cached(key: str, ttl: float, fetch: Callable[[], Awaitable[Any]],
                 timeout: float = 4.0) -> dict:
    hit = _store.get(key)
    if hit and time.monotonic() - hit[0] < ttl:
        return envelope(True, hit[1], hit[2])
    try:
        value = await asyncio.wait_for(fetch(), timeout)
    except Exception as e:  # noqa: BLE001 — orice eroare de sursă = căsuță gri
        msg = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
        if hit:
            return envelope(True, hit[1], hit[2], stale=True, error=msg)
        return envelope(False, error=msg)
    iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    _store[key] = (time.monotonic(), value, iso)
    return envelope(True, value, iso)
