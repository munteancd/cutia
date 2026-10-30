import httpx
import pytest
import respx

from cutia.settings import Settings
from cutia.sources import otto, pihole, printer, weather


@pytest.fixture
def s():
    return Settings(env={
        "PIHOLE_HOSTS": "192.168.0.192,192.168.0.193",
        "PIHOLE_PASSWORD": "pw",
        "PRINTER_HOST": "192.168.0.239",
        "PRINTER_SN": "SN1",
        "PRINTER_ACCESS_CODE": "code",
        "OTTO_HEALTH_URL": "http://127.0.0.1:3110/health",
    })


@pytest.fixture(autouse=True)
def reset_pihole():
    pihole._sid.clear()


@respx.mock
async def test_weather_parses_open_meteo(s):
    respx.get(url__startswith="https://api.open-meteo.com/v1/forecast").respond(json={
        "current": {"temperature_2m": 12.3, "weather_code": 3},
        "daily": {"temperature_2m_min": [6.1], "temperature_2m_max": [14.8]},
    })
    w = await weather.fetch(s)
    assert w == {"temp": 12.3, "desc": "înnorat", "min": 6.1, "max": 14.8}


@respx.mock
async def test_pihole_falls_back_to_second_host(s):
    respx.post("http://192.168.0.192/api/auth").mock(side_effect=httpx.ConnectError("no"))
    respx.post("http://192.168.0.193/api/auth").respond(json={"session": {"sid": "abc", "valid": True}})
    respx.get("http://192.168.0.193/api/stats/summary").respond(
        json={"queries": {"percent_blocked": 23.4}})
    assert await pihole.fetch(s) == {"up": True, "blocked_pct": 23.4}


@respx.mock
async def test_pihole_reuses_sid(s):
    auth = respx.post("http://192.168.0.192/api/auth").respond(
        json={"session": {"sid": "abc", "valid": True}})
    summ = respx.get("http://192.168.0.192/api/stats/summary").respond(
        json={"queries": {"percent_blocked": 10.0}})
    await pihole.fetch(s)
    await pihole.fetch(s)
    assert auth.call_count == 1
    assert summ.calls[-1].request.headers["sid"] == "abc"


async def test_printer_idle_when_no_progress(s, monkeypatch):
    monkeypatch.setattr(printer, "_collect", lambda *a, **k: [])
    assert await printer.fetch(s) == {"state": "idle", "progress": None}


async def test_printer_printing(s, monkeypatch):
    msgs = [{"method": 6000, "result": {"extruder": {"temperature": 210}}},
            {"method": 6000, "result": {"machine_status": {"progress": 64}}}]
    monkeypatch.setattr(printer, "_collect", lambda *a, **k: msgs)
    assert await printer.fetch(s) == {"state": "printing", "progress": 64}


async def test_printer_off_when_connection_refused(s, monkeypatch):
    def refuse(*a, **k):
        raise ConnectionRefusedError()
    monkeypatch.setattr(printer, "_collect", refuse)
    assert await printer.fetch(s) == {"state": "off", "progress": None}


async def test_otto_down_when_service_inactive(s, monkeypatch):
    async def inactive():
        return "inactive"
    monkeypatch.setattr(otto, "_service_state", inactive)
    o = await otto.fetch(s)
    assert o["up"] is False
    assert "inactive" in o["detail"]


@respx.mock
async def test_otto_up_when_service_and_bridge_ok(s, monkeypatch):
    async def active():
        return "active"
    monkeypatch.setattr(otto, "_service_state", active)
    respx.get("http://127.0.0.1:3110/health").respond(json={"ok": True})
    assert (await otto.fetch(s))["up"] is True


class FakeMqtt:
    """Client MQTT fals: răspunde imediat cu progresul, ca imprimanta reală."""
    last = None

    def __init__(self, *a, **k):
        FakeMqtt.last = self
        self.connect_timeout = None

    def username_pw_set(self, *a): pass
    def connect(self, *a, **k): pass
    def subscribe(self, *a): pass
    def loop_stop(self): pass
    def disconnect(self): pass

    def loop_start(self):
        import json as _j
        msg = type("M", (), {"payload": _j.dumps({"result": {"machine_status": {"progress": 42}}}).encode()})
        self.on_message(self, None, msg)

    def publish(self, *a): pass


def test_printer_returns_early_when_status_arrives(monkeypatch):
    import time as _t
    monkeypatch.setattr(printer.mqtt, "Client", FakeMqtt)
    t = _t.monotonic()
    msgs = printer._collect("h", 1883, "SN", "code")
    assert _t.monotonic() - t < 1
    assert printer._progress(msgs) == 42


def test_printer_connect_timeout_is_short(monkeypatch):
    monkeypatch.setattr(printer.mqtt, "Client", FakeMqtt)
    printer._collect("h", 1883, "SN", "code")
    assert FakeMqtt.last.connect_timeout is not None and FakeMqtt.last.connect_timeout <= 1.5


@respx.mock
async def test_pihole_falls_back_when_first_host_is_not_pihole(s):
    respx.post("http://192.168.0.192/api/auth").respond(text="<html>alt aparat</html>")
    respx.post("http://192.168.0.193/api/auth").respond(json={"session": {"sid": "abc", "valid": True}})
    respx.get("http://192.168.0.193/api/stats/summary").respond(json={"queries": {"percent_blocked": 5.0}})
    assert (await pihole.fetch(s))["up"] is True
