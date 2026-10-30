"""Mailuri necitite din Inbox-ul principal (fără Promoții/Social), prin IMAP."""
import asyncio
import imaplib

from ..settings import Settings


def _count(user: str, password: str) -> int:
    m = imaplib.IMAP4_SSL("imap.gmail.com", timeout=4)
    try:
        m.login(user, password)
        m.select("INBOX", readonly=True)
        _, data = m.search(None, "X-GM-RAW", '"category:primary is:unread"')
        return len(data[0].split()) if data and data[0] else 0
    finally:
        try:
            m.logout()
        except Exception:  # noqa: BLE001
            pass


async def fetch(s: Settings) -> dict:
    pw = s.get("GMAIL_APP_PASSWORD")
    if not pw:
        raise RuntimeError("lipsește GMAIL_APP_PASSWORD")
    return {"unread": await asyncio.to_thread(_count, s.get("GMAIL_USER") or "", pw)}
