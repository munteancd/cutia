"""Otto e viu dacă merge serviciul hermes-gateway și răspunde bridge-ul /cc."""
import asyncio

import httpx

from ..settings import Settings


async def _service_state() -> str:
    p = await asyncio.create_subprocess_exec(
        "systemctl", "--user", "is-active", "hermes-gateway.service",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    out, _ = await p.communicate()
    return out.decode().strip() or "unknown"


async def fetch(s: Settings) -> dict:
    state = await _service_state()
    if state != "active":
        return {"up": False, "detail": f"hermes-gateway: {state}"}
    try:
        async with httpx.AsyncClient(timeout=2) as c:
            r = await c.get(s.get("OTTO_HEALTH_URL") or "http://127.0.0.1:3110/health")
            r.raise_for_status()
    except httpx.HTTPError as e:
        return {"up": False, "detail": f"bridge: {type(e).__name__}"}
    return {"up": True, "detail": "merge"}
