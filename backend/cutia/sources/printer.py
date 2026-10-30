"""Imprimanta Elegoo Centauri Carbon 2, prin brokerul MQTT de pe ea.

Cerem un raport de stare (Cmd 0, doar citire) și ascultăm câteva secunde.
Conexiune refuzată = oprită; niciun progres în fereastră = liberă.
"""
import asyncio
import json
import secrets
import time

import paho.mqtt.client as mqtt

from ..settings import Settings

WAIT_S = 3.0


def _collect(host: str, port: int, sn: str, code: str, wait: float = WAIT_S) -> list[dict]:
    msgs: list[dict] = []
    c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"cutia-{secrets.token_hex(3)}")
    c.username_pw_set("elegoo", code)

    def on_message(_c, _u, m):
        try:
            msgs.append(json.loads(m.payload))
        except ValueError:
            pass

    c.on_message = on_message
    c.connect(host, port, keepalive=10)
    c.subscribe(f"elegoo/{sn}/api_status")
    c.subscribe(f"elegoo/{sn}/cutia/api_response")
    req = {"Id": "", "Topic": "", "Data": {
        "Cmd": 0, "Data": {}, "MainboardID": "", "RequestID": secrets.token_hex(8),
        "TimeStamp": int(time.time()), "From": 0}}
    c.loop_start()
    try:
        c.publish(f"elegoo/{sn}/cutia/api_request", json.dumps(req))
        time.sleep(wait)
    finally:
        c.loop_stop()
        c.disconnect()
    return msgs


def _progress(msgs: list[dict]) -> int | None:
    for m in reversed(msgs):
        res = m.get("result") or (m.get("Data") or {}).get("Data") or {}
        ms = res.get("machine_status") if isinstance(res, dict) else None
        if isinstance(ms, dict) and ms.get("progress") is not None:
            return int(ms["progress"])
    return None


async def fetch(s: Settings) -> dict:
    hostport = s.get("PRINTER_HOST") or ""
    host, _, port = hostport.partition(":")
    try:
        msgs = await asyncio.to_thread(
            _collect, host, int(port or 1883), s.get("PRINTER_SN") or "",
            s.get("PRINTER_ACCESS_CODE") or "")
    except (ConnectionRefusedError, OSError):
        return {"state": "off", "progress": None}
    p = _progress(msgs)
    if p is None or p >= 100:
        return {"state": "idle", "progress": None}
    return {"state": "printing", "progress": p}
