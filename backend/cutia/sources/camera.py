"""O poză din camera imprimantei: stream-ul MJPEG de pe :8080, din care tăiem primul JPEG întreg."""
import httpx

from ..settings import Settings


def carve(buf: bytes) -> bytes | None:
    start = buf.find(b"\xff\xd8")
    end = buf.find(b"\xff\xd9", start + 2) if start >= 0 else -1
    return buf[start:end + 2] if end >= 0 else None


async def snapshot(s: Settings) -> bytes | None:
    host = (s.get("PRINTER_HOST") or "").partition(":")[0]
    buf = b""
    async with httpx.AsyncClient(timeout=4) as c:
        async with c.stream("GET", f"http://{host}:8080/?action=stream") as r:
            async for chunk in r.aiter_bytes():
                buf += chunk
                if (jpg := carve(buf)) or len(buf) > 2_000_000:
                    return jpg
    return None
