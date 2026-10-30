import json

import pytest
import respx

from cutia.settings import Settings
from cutia.sources import gmail, modal_credit, phone, youtube


@pytest.fixture
def s(tmp_path):
    hermes = tmp_path / "hermes.env"
    hermes.write_text(
        "YOUTUBE_CLIENT_ID=cid\nYOUTUBE_CLIENT_SECRET=sec\nYOUTUBE_REFRESH_TOKEN_LOCUL1=rt1\n"
        "YOUTUBE_CLIENT_ID_JCJ=cid2\nYOUTUBE_CLIENT_SECRET_JCJ=sec2\nYOUTUBE_REFRESH_TOKEN_JCJ=rt2\n",
        encoding="utf-8")
    cfg = tmp_path / "config"
    cfg.mkdir()
    (cfg / "youtube.yaml").write_text(
        "- name: Locul Unu\n  client: ''\n  token: _LOCUL1\n"
        "- name: Județ cu Județ\n  client: _JCJ\n  token: _JCJ\n", encoding="utf-8")
    return Settings(env={
        "GMAIL_USER": "u@gmail.com", "GMAIL_APP_PASSWORD": "pw",
        "HERMES_ENV": str(hermes), "MODAL_BIN": "modal", "MODAL_MONTHLY_CREDIT": "30",
        "HA_URL": "http://ha:8123", "HA_TOKEN": "t", "HA_PHONE_ENTITY": "sensor.a52s",
    }, config_dir=cfg)


class FakeImap:
    queries: list = []

    def __init__(self, host, timeout=None):
        self.host = host

    def login(self, u, p):
        pass

    def select(self, box, readonly=False):
        assert box == "INBOX" and readonly
        return "OK", [b"10"]

    def search(self, charset, *criteria):
        FakeImap.queries.append(criteria)
        return "OK", [b"1 2 3"]

    def logout(self):
        pass


async def test_gmail_counts_primary_unread(s, monkeypatch):
    monkeypatch.setattr(gmail.imaplib, "IMAP4_SSL", FakeImap)
    assert await gmail.fetch(s) == {"unread": 3}
    assert FakeImap.queries[-1] == ("X-GM-RAW", '"category:primary is:unread"')


@respx.mock
async def test_youtube_parses_two_channels(s):
    tok = respx.post("https://oauth2.googleapis.com/token")
    tok.side_effect = lambda req: respx.MockResponse(200, json={"access_token": "A" if b"rt1" in req.content else "B"})
    def channels(req):
        n = "127" if req.headers["Authorization"] == "Bearer A" else "72"
        return respx.MockResponse(200, json={"items": [{"statistics": {"subscriberCount": n}}]})
    respx.get(url__startswith="https://www.googleapis.com/youtube/v3/channels").mock(side_effect=channels)
    y = await youtube.fetch(s)
    assert y == {"channels": [{"name": "Locul Unu", "subs": 127},
                              {"name": "Județ cu Județ", "subs": 72}]}


async def test_modal_parses_spent_this_month(s, monkeypatch):
    report = [{"Description": "a", "Cost": "0.50"}, {"Description": "b", "Cost": "1.25"}]

    async def run(*args):
        return json.dumps(report)
    monkeypatch.setattr(modal_credit, "_run", run)
    assert await modal_credit.fetch(s) == {"spent": 1.75, "credit": 30.0, "left": 28.25}


@respx.mock
async def test_phone_battery_from_ha(s):
    respx.get("http://ha:8123/api/states/sensor.a52s_battery_level").respond(json={"state": "87"})
    respx.get("http://ha:8123/api/states/sensor.a52s_battery_state").respond(json={"state": "Charging"})
    assert await phone.fetch(s) == {"battery": 87, "charging": True}


def test_gmail_imap_has_timeout(s, monkeypatch):
    seen = {}

    class Imap(FakeImap):
        def __init__(self, host, timeout=None):
            seen["timeout"] = timeout
    monkeypatch.setattr(gmail.imaplib, "IMAP4_SSL", Imap)
    gmail._count("u", "p")
    assert seen["timeout"] and seen["timeout"] <= 5
