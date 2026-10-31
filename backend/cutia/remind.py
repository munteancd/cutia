"""Mementoul din calendar pe WhatsApp, trimis de Otto prin bridge-ul lui.

    python -m cutia.remind maine   # seara: ce ai mâine
    python -m cutia.remind azi     # dimineața: ce ai azi

Rulat de timerele systemd din deploy/; într-o zi liberă nu trimite nimic."""
import sys
import time
from datetime import date, timedelta

import httpx

from .settings import Settings
from .sources import calendar

BRIDGE = "http://127.0.0.1:3100/send"
CHAT = "40771550321@s.whatsapp.net"  # Cristi


def _send(s: Settings, text: str) -> bool:
    for attempt in range(2):  # bridge-ul mai pică o clipă; încă o dată după 5 s
        try:
            r = httpx.post(s.get("WHATSAPP_BRIDGE") or BRIDGE, timeout=30,
                           json={"chatId": s.get("WHATSAPP_CHAT") or CHAT, "message": text})
            r.raise_for_status()
            return True
        except httpx.HTTPError as e:
            print(f"[remind] trimiterea a dat greș ({attempt + 1}/2): {type(e).__name__}: {e}", file=sys.stderr)
            if attempt == 0:
                time.sleep(5)
    return False


def run(s: Settings, kind: str, today: date | None = None) -> bool | None:
    """Trimite mementoul: True a plecat, False n-a putut pleca, None ziua e liberă."""
    today = today or date.today()
    day = today + timedelta(days=1) if kind == "maine" else today
    text = calendar.message(kind, day, calendar.on_day(s, day))
    return _send(s, text) if text else None


if __name__ == "__main__":
    if sys.argv[1:] not in (["maine"], ["azi"]):
        sys.exit("folosire: python -m cutia.remind maine|azi")
    sent = run(Settings.load(), sys.argv[1])
    print({True: "trimis", None: "nimic de trimis"}.get(sent, "NU s-a putut trimite"))
    sys.exit(sent is False)  # eșecul apare ca „failed” în systemd
