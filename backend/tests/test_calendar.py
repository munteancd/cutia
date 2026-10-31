from datetime import date

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from cutia import remind
from cutia.settings import Settings
from cutia.sources import calendar


@pytest.fixture
def s(tmp_path):
    return Settings(env={"DATA_DIR": str(tmp_path)})


def test_events_sorted_by_day_then_hour(s):
    calendar.save(s, "c", "2026-11-05", "Turneu ping-pong", "", "")
    calendar.save(s, "b", "2026-11-04", "AJOFM", "11:00", "")
    calendar.save(s, "a", "2026-11-04", "Interviu", "09:30", "Str. Lungă 3")
    assert [e["id"] for e in calendar.all_events(s)] == ["a", "b", "c"]
    assert calendar.all_events(s)[0]["place"] == "Str. Lungă 3"


def test_event_without_hour_comes_first_that_day(s):
    calendar.save(s, "a", "2026-11-04", "Interviu", "09:30", "")
    calendar.save(s, "b", "2026-11-04", "Ziua lui Carol", "", "")
    assert [e["id"] for e in calendar.on_day(s, date(2026, 11, 4))] == ["b", "a"]


def test_update_and_delete(s):
    calendar.save(s, "a", "2026-11-04", "Interviu", "", "")
    calendar.save(s, "a", "2026-11-06", "Interviu mutat", "", "")
    assert [(e["date"], e["title"]) for e in calendar.all_events(s)] == [("2026-11-06", "Interviu mutat")]
    calendar.delete(s, "a")
    assert calendar.all_events(s) == []


@pytest.mark.parametrize("day,title,hour", [
    ("2026-13-01", "x", ""), ("mâine", "x", ""), ("2026-11-04", "  ", ""), ("2026-11-04", "x", "25:00")])
def test_bad_event_rejected(s, day, title, hour):
    with pytest.raises(ValueError):
        calendar.save(s, "a", day, title, hour, "")


def test_message_lists_the_day():
    evs = [{"title": "Turneu ping-pong", "time": "", "place": ""},
           {"title": "Interviu", "time": "09:30", "place": "Str. Lungă 3"}]
    assert calendar.message("maine", date(2026, 11, 4), evs) == (
        "📅 Mâine, miercuri 4 nov:\n• Turneu ping-pong\n• 09:30 Interviu — Str. Lungă 3")
    assert calendar.message("azi", date(2026, 11, 4), evs[:1]).startswith("📅 Azi, miercuri 4 nov:")


def test_no_message_on_empty_day():
    assert calendar.message("azi", date(2026, 11, 4), []) is None


async def test_home_fetch_today_and_tomorrow(s, monkeypatch):
    monkeypatch.setattr(calendar, "_today", lambda: date(2026, 11, 4))
    calendar.save(s, "a", "2026-11-04", "Interviu", "", "")
    calendar.save(s, "b", "2026-11-05", "Turneu", "", "")
    calendar.save(s, "c", "2026-11-09", "Altceva", "", "")
    out = await calendar.fetch(s)
    assert [e["title"] for e in out["today"]] == ["Interviu"]
    assert [e["title"] for e in out["tomorrow"]] == ["Turneu"]


# --- mementoul pe WhatsApp ---

@respx.mock
def test_remind_tomorrow_sends_whatsapp(s):
    calendar.save(s, "a", "2026-11-05", "AJOFM", "", "")
    route = respx.post("http://127.0.0.1:3100/send").respond(json={"success": True})
    assert remind.run(s, "maine", date(2026, 11, 4)) is True
    body = route.calls[0].request.content.decode()
    assert "40771550321@s.whatsapp.net" in body and "AJOFM" in body and "Mâine" in body


@respx.mock
def test_remind_quiet_day_sends_nothing(s):
    route = respx.post("http://127.0.0.1:3100/send").respond(json={"success": True})
    assert remind.run(s, "azi", date(2026, 11, 4)) is None
    assert not route.called


@respx.mock
def test_remind_failure_is_reported(s, monkeypatch):
    monkeypatch.setattr(remind.time, "sleep", lambda _: None)
    calendar.save(s, "a", "2026-11-04", "Interviu", "", "")
    respx.post("http://127.0.0.1:3100/send").mock(side_effect=httpx.ConnectError("x"))
    assert remind.run(s, "azi", date(2026, 11, 4)) is False


@respx.mock
def test_remind_retries_once(s, monkeypatch):
    monkeypatch.setattr(remind.time, "sleep", lambda _: None)
    calendar.save(s, "a", "2026-11-04", "Interviu", "", "")
    route = respx.post("http://127.0.0.1:3100/send").mock(
        side_effect=[httpx.ConnectError("x"), httpx.Response(200, json={"success": True})])
    assert remind.run(s, "azi", date(2026, 11, 4)) is True
    assert route.call_count == 2


# --- API ---

@pytest.fixture
def client(s, monkeypatch):
    from cutia import app as appmod
    monkeypatch.setattr(appmod, "settings", s)
    return TestClient(appmod.app)


def test_api_calendar_crud(client):
    r = client.put("/api/calendar/e1", json={"date": "2026-11-04", "title": "Interviu", "time": "", "place": ""})
    assert r.status_code == 200
    assert [e["title"] for e in client.get("/api/calendar").json()] == ["Interviu"]
    assert client.put("/api/calendar/e1", json={"date": "ieri", "title": "x"}).status_code == 400
    assert client.delete("/api/calendar/e1").status_code == 200
    assert client.get("/api/calendar").json() == []
