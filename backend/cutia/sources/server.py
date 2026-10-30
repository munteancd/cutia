"""Starea lui server2: discul, ultimele backup-uri (unitățile systemd) și căderile de net de azi
(de la internet-monitor, care ascultă doar pe localhost)."""
import asyncio
import datetime
import shutil
import subprocess

import httpx

from ..settings import Settings

BACKUPS = {"restic-backup": "local", "backup-otto-gdrive": "Google Drive"}
NET = "http://127.0.0.1:8765"


def _disk() -> tuple[int, int]:
    u = shutil.disk_usage("/")
    return round(u.used / u.total * 100), round(u.free / 1e9)


def _units(names) -> dict[str, tuple[str, str]]:
    out = {}
    for n in names:
        try:
            r = subprocess.run(["systemctl", "--user", "show", f"{n}.service", "-p", "Result", "-p",
                                "ExecMainExitTimestamp", "--value"], capture_output=True, text=True, timeout=5)
        except (OSError, subprocess.TimeoutExpired):
            continue
        lines = r.stdout.splitlines()
        if r.returncode == 0 and len(lines) >= 2 and lines[1]:
            out[n] = (lines[0], lines[1])
    return out


async def _net() -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            st = (await c.get(f"{NET}/api/state")).json()
            logs = (await c.get(f"{NET}/api/logs", params={"date": datetime.date.today().isoformat()})).json() or []
    except (httpx.HTTPError, ValueError):
        return None
    return {"up": st.get("status") == "connected", "drops_today": sum(e.get("event") == "disconnected" for e in logs)}


async def fetch(s: Settings) -> dict:
    used, free = await asyncio.to_thread(_disk)
    units = await asyncio.to_thread(_units, BACKUPS)
    backups = [{"name": label, "ok": units[u][0] == "success", "when": units[u][1]}
               for u, label in BACKUPS.items() if u in units]
    return {"disk": {"used_pct": used, "free_gb": free}, "backups": backups, "net": await _net()}
