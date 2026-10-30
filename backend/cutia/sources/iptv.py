"""Canale TV din lista publică iptv-org, grupate pe țări, România prima.

Scoatem canalele cu plată (config/tv_exclude.yaml) și stream-urile http://,
pe care browserul nu le pornește într-o pagină https.
"""
import re

import httpx

from ..settings import Settings

URL = "https://iptv-org.github.io/iptv/index.country.m3u"
_ATTR = re.compile(r'([\w-]+)="([^"]*)"')
_TAGS = re.compile(r"\s*(\(\d+[pi]\)|\[[^\]]*\])")


def parse(text: str, exclude: list[str]) -> list[dict]:
    groups: dict[str, list[dict]] = {}
    lines = [l.strip() for l in text.splitlines()]
    for i, line in enumerate(lines):
        if not line.startswith("#EXTINF"):
            continue
        url = lines[i + 1] if i + 1 < len(lines) else ""
        if not url.startswith("https://"):
            continue
        attrs = dict(_ATTR.findall(line))
        name = _TAGS.sub("", line.rsplit(",", 1)[-1]).strip()
        low = name.lower()
        if not name or any(low.startswith(x) for x in exclude):
            continue
        country = attrs.get("group-title") or "Altele"
        groups.setdefault(country, []).append(
            {"name": name, "url": url, "logo": attrs.get("tvg-logo") or None})
    order = sorted(groups, key=lambda c: (c != "Romania", c))
    return [{"country": c, "channels": sorted(groups[c], key=lambda ch: ch["name"].lower())}
            for c in order]


async def fetch(s: Settings) -> list[dict]:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as c:
        r = await c.get(URL)
        r.raise_for_status()
    return parse(r.text, [x.lower() for x in s.config("tv_exclude")])
