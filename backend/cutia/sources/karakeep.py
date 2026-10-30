"""Bookmark-urile din Karakeep, pe listele (Smart Lists) de acolo."""
from urllib.parse import urlparse

import httpx

from ..settings import Settings


async def _items(c: httpx.AsyncClient, list_id: str) -> list[dict]:
    items, cursor = [], None
    while True:
        params = {"limit": 100} | ({"cursor": cursor} if cursor else {})
        r = await c.get(f"/lists/{list_id}/bookmarks", params=params)
        r.raise_for_status()
        d = r.json()
        for b in d["bookmarks"]:
            ct = b.get("content") or {}
            url = urlparse(ct.get("url") or "") if ct.get("type") == "link" else None
            if not url or url.scheme not in ("http", "https") or not url.netloc:
                continue  # fără javascript:, fără link-uri stricate care ar bloca pagina
            items.append({"title": b.get("title") or ct.get("title") or ct["url"],
                          "url": ct["url"], "favicon": ct.get("favicon")})
        cursor = d.get("nextCursor")
        if not cursor:
            return items


async def fetch(s: Settings) -> list[dict]:
    base = (s.get("KARAKEEP_URL") or "").rstrip("/") + "/api/v1"
    h = {"Authorization": f"Bearer {s.get('KARAKEEP_API_KEY')}"}
    async with httpx.AsyncClient(base_url=base, headers=h, timeout=8) as c:
        r = await c.get("/lists")
        r.raise_for_status()
        out = []
        for lst in r.json()["lists"]:
            out.append({"list": lst["name"], "icon": lst.get("icon") or "🔖",
                        "items": await _items(c, lst["id"])})
    return out
