"""Bateria telefonului, din Home Assistant (aplicația Companion de pe A52s)."""
import httpx

from ..settings import Settings


async def fetch(s: Settings) -> dict:
    base, entity = s.get("HA_URL"), s.get("HA_PHONE_ENTITY")
    if not (s.get("HA_TOKEN") and entity):
        raise RuntimeError("lipsește HA_TOKEN / HA_PHONE_ENTITY")
    h = {"Authorization": f"Bearer {s.get('HA_TOKEN')}"}
    async with httpx.AsyncClient(timeout=3, headers=h) as c:
        lvl = await c.get(f"{base}/api/states/{entity}_battery_level")
        lvl.raise_for_status()
        st = await c.get(f"{base}/api/states/{entity}_battery_state")
    charging = st.status_code == 200 and st.json()["state"].lower() in ("charging", "full")
    return {"battery": int(float(lvl.json()["state"])), "charging": charging}
