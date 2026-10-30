"""Creditul Modal rămas luna asta.

Modal nu dă soldul direct; dă cât s-a cheltuit (`modal billing report`).
Rămas = creditul lunar inclus (MODAL_MONTHLY_CREDIT, implicit 30 $) − cheltuit.
"""
import asyncio
import json

from ..settings import Settings


async def _run(*args: str) -> str:
    p = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL, cwd="/tmp")
    out, _ = await p.communicate()
    if p.returncode:
        raise RuntimeError(f"modal billing a ieșit cu {p.returncode}")
    return out.decode()


async def fetch(s: Settings) -> dict:
    out = await _run(s.get("MODAL_BIN") or "modal", "billing", "report",
                     "--for", "this month", "--json")
    spent = round(sum(float(r["Cost"]) for r in json.loads(out)), 2)
    credit = float(s.get("MODAL_MONTHLY_CREDIT") or 30)
    return {"spent": spent, "credit": credit, "left": round(credit - spent, 2)}
