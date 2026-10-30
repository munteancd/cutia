import json
from pathlib import Path

import pytest
import respx

from cutia.settings import Settings
from cutia.sources import football

REAL = json.loads((Path(__file__).parent / "fixtures" / "fotmob_liga1.json").read_text(encoding="utf-8"))


def match(rnd, home, away, utc, finished=False, started=None, score=None):
    return {"round": str(rnd), "home": {"name": home}, "away": {"name": away},
            "status": {"utcTime": utc, "finished": finished,
                       "started": finished if started is None else started,
                       "scoreStr": score}}


def test_fotmob_standings_parsed():
    st = football.parse(REAL)["standings"]
    assert len(st) == 16
    first = st[0]
    assert set(first) == {"pos", "team", "played", "pts", "gd"}
    assert first["pos"] == 1
    assert [r["pos"] for r in st] == list(range(1, 17))


def test_matches_split_last_next():
    data = {"table": [{"data": {"table": {"all": []}}}], "fixtures": {"allMatches": [
        match(9, "A", "B", "2026-10-18T15:00:00Z", True, score="2 - 1"),
        match(10, "C", "D", "2026-10-25T15:00:00Z", True, score="0 - 0"),
        match(10, "E", "F", "2026-10-26T18:00:00Z", True, score="1 - 3"),
        match(11, "G", "H", "2026-11-01T17:30:00Z"),
        match(12, "I", "J", "2026-11-08T17:30:00Z"),
    ]}}
    p = football.parse(data)
    assert [(m["home"], m["score"]) for m in p["last"]] == [("C", "0-0"), ("E", "1-3")]
    assert [m["home"] for m in p["next"]] == ["G"]
    assert p["next"][0]["score"] is None


def test_live_match_counts_as_next_with_score():
    data = {"table": [{"data": {"table": {"all": []}}}], "fixtures": {"allMatches": [
        match(10, "C", "D", "2026-10-25T15:00:00Z", True, score="0 - 0"),
        match(11, "G", "H", "2026-10-30T13:00:00Z", False, started=True, score="1 - 0"),
        match(11, "K", "L", "2026-11-01T17:30:00Z"),
    ]}}
    p = football.parse(data)
    assert [m["home"] for m in p["next"]] == ["G", "K"]
    assert p["next"][0]["live"] is True and p["next"][0]["score"] == "1-0"
    assert p["live"] is True


def test_match_time_in_bucharest():
    data = {"table": [{"data": {"table": {"all": []}}}], "fixtures": {"allMatches": [
        match(11, "G", "H", "2026-11-01T17:30:00Z")]}}
    assert football.parse(data)["next"][0]["date"] == "2026-11-01T19:30:00+02:00"


@respx.mock
async def test_fetch_uses_league_id():
    s = Settings(env={})
    route = respx.get("https://www.fotmob.com/api/data/leagues").respond(json=REAL)
    out = await football.fetch(s, 189)
    assert route.calls[0].request.url.params["id"] == "189"
    assert len(out["standings"]) == 16
