"""Pi-hole v6: e viu + cât la sută a blocat azi.

DHCP l-a mutat între .192 și .193, deci încercăm pe rând adresele din
PIHOLE_HOSTS. Sesiunea (sid) ține 30 de minute; o refolosim.
"""
import httpx

from ..settings import Settings

_sid: dict[str, str] = {}  # host -> sid


async def _summary(c: httpx.AsyncClient, host: str, password: str) -> dict:
    for attempt in range(2):
        sid = _sid.get(host)
        if not sid:
            r = await c.post(f"http://{host}/api/auth", json={"password": password})
            r.raise_for_status()
            sid = r.json()["session"]["sid"]
            _sid[host] = sid
        r = await c.get(f"http://{host}/api/stats/summary", headers={"sid": sid})
        if r.status_code == 401 and attempt == 0:
            _sid.pop(host, None)  # sesiune expirată: ne logăm din nou
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError("autentificare Pi-hole eșuată")


async def fetch(s: Settings) -> dict:
    hosts = [h.strip() for h in (s.get("PIHOLE_HOSTS") or "").split(",") if h.strip()]
    last: Exception | None = None
    async with httpx.AsyncClient(timeout=2) as c:
        for host in hosts:
            try:
                d = await _summary(c, host, s.get("PIHOLE_PASSWORD") or "")
                return {"up": True, "blocked_pct": round(d["queries"]["percent_blocked"], 1)}
            except (httpx.HTTPError, ValueError, KeyError) as e:  # alt aparat pe IP-ul ăla
                last = e
    raise RuntimeError(f"Pi-hole nu răspunde: {last}")
