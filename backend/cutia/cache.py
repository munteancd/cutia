"""Cache în memorie cu „ultima valoare bună".

Fiecare sursă trece prin `cached`. Prima dată așteptăm răspunsul (cu timeout).
După aceea pagina primește mereu imediat ce știm deja; dacă valoarea a expirat,
o reîmprospătăm în fundal. Dacă reîmprospătarea pică, valoarea veche rămâne,
marcată `stale`, ca o căsuță să nu se golească la un sughiț.
"""
import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

_store: dict[str, tuple[float, Any, str]] = {}  # key -> (monotonic, value, iso)
_errors: dict[str, str] = {}                    # key -> eroarea ultimei reîmprospătări
_pending: dict[str, asyncio.Task] = {}          # reîmprospătări în fundal, una pe cheie


def clear() -> None:
    _store.clear()
    _errors.clear()
    _pending.clear()


def envelope(ok: bool, value: Any = None, updated: str | None = None,
             stale: bool = False, error: str | None = None) -> dict:
    return {"ok": ok, "value": value, "updated": updated, "stale": stale, "error": error}


async def _refresh(key: str, fetch: Callable[[], Awaitable[Any]], timeout: float) -> None:
    try:
        value = await asyncio.wait_for(fetch(), timeout)
    except Exception as e:  # noqa: BLE001 — orice eroare de sursă = căsuță gri / veche
        _errors[key] = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
    else:
        _store[key] = (time.monotonic(), value,
                       datetime.now(timezone.utc).isoformat(timespec="seconds"))
        _errors.pop(key, None)
    finally:
        _pending.pop(key, None)


async def cached(key: str, ttl: float, fetch: Callable[[], Awaitable[Any]],
                 timeout: float = 4.0) -> dict:
    hit = _store.get(key)
    if hit is None:
        await _refresh(key, fetch, timeout)
        hit = _store.get(key)
        if hit is None:
            return envelope(False, error=_errors.get(key))
        return envelope(True, hit[1], hit[2])
    if time.monotonic() - hit[0] >= ttl and key not in _pending:
        _pending[key] = asyncio.create_task(_refresh(key, fetch, timeout))
    err = _errors.get(key)
    return envelope(True, hit[1], hit[2], stale=err is not None, error=err)
