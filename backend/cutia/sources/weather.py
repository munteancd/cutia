"""Vremea în Moșnița Veche, de la Open-Meteo (fără cheie)."""
import httpx

from ..settings import Settings

LAT, LON = 45.716, 21.326

# Codurile WMO folosite de Open-Meteo, pe românește.
WMO = {
    0: "senin", 1: "aproape senin", 2: "parțial noros", 3: "înnorat",
    45: "ceață", 48: "ceață cu chiciură",
    51: "burniță slabă", 53: "burniță", 55: "burniță deasă",
    56: "burniță înghețată", 57: "burniță înghețată",
    61: "ploaie slabă", 63: "ploaie", 65: "ploaie torențială",
    66: "ploaie înghețată", 67: "ploaie înghețată",
    71: "ninsoare slabă", 73: "ninsoare", 75: "ninsoare abundentă", 77: "grăunțe de zăpadă",
    80: "averse slabe", 81: "averse", 82: "averse puternice",
    85: "averse de ninsoare", 86: "averse de ninsoare",
    95: "furtună", 96: "furtună cu grindină", 99: "furtună cu grindină",
}


async def fetch(s: Settings) -> dict:
    params = {
        "latitude": LAT, "longitude": LON, "timezone": "Europe/Bucharest",
        "current": "temperature_2m,weather_code",
        "daily": "temperature_2m_min,temperature_2m_max", "forecast_days": 1,
    }
    async with httpx.AsyncClient(timeout=4) as c:
        r = await c.get("https://api.open-meteo.com/v1/forecast", params=params)
        r.raise_for_status()
        d = r.json()
    cur = d["current"]
    return {
        "temp": cur["temperature_2m"],
        "desc": WMO.get(cur["weather_code"], "—"),
        "min": d["daily"]["temperature_2m_min"][0],
        "max": d["daily"]["temperature_2m_max"][0],
    }
