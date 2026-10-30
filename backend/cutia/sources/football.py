"""Clasamente și meciuri de la FotMob (toate cele 7 ligi, sezonul curent).

ESPN are ligile mari, dar Liga 1 e blocată pe sezonul trecut și Liga 2 lipsește,
deci luăm totul dintr-o singură sursă.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx

from ..settings import Settings

RO = ZoneInfo("Europe/Bucharest")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"


def _match(m: dict) -> dict:
    st = m["status"]
    utc = datetime.fromisoformat(st["utcTime"].replace("Z", "+00:00"))
    started = bool(st.get("started"))
    score = (st.get("scoreStr") or "").replace(" ", "") if started else None
    return {"date": utc.astimezone(RO).isoformat(), "home": m["home"]["name"],
            "away": m["away"]["name"], "score": score or None,
            "live": started and not st.get("finished")}


def parse(d: dict) -> dict:
    rows = d["table"][0]["data"]["table"]["all"]
    standings = [{"pos": r["idx"], "team": r["name"], "played": r["played"],
                  "pts": r["pts"], "gd": r["goalConDiff"]} for r in rows]
    matches = [m for m in d["fixtures"]["allMatches"] if not m["status"].get("cancelled")]
    done = [m for m in matches if m["status"].get("finished")]
    todo = [m for m in matches if not m["status"].get("finished")]
    last, nxt = [], []
    if done:
        r = max(int(m["round"]) for m in done)
        last = [_match(m) for m in done if int(m["round"]) == r]
    if todo:
        r = min(int(m["round"]) for m in todo)
        nxt = [_match(m) for m in todo if int(m["round"]) == r]
    by_date = lambda m: m["date"]  # noqa: E731
    return {"standings": standings, "last": sorted(last, key=by_date),
            "next": sorted(nxt, key=by_date), "live": any(m["live"] for m in nxt)}


async def fetch(s: Settings, league_id: int) -> dict:
    async with httpx.AsyncClient(timeout=8, headers={"User-Agent": UA}) as c:
        r = await c.get("https://www.fotmob.com/api/data/leagues",
                        params={"id": league_id, "ccode3": "ROU"})
        r.raise_for_status()
        return parse(r.json())
