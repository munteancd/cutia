import pytest
import respx

from cutia.settings import Settings
from cutia.sources import karakeep

BASE = "http://kk:3010/api/v1"


def bm(title, url, kind="link"):
    content = {"type": kind}
    if kind == "link":
        content |= {"url": url, "title": title, "favicon": f"{url}/favicon.ico"}
    return {"title": None, "content": content}


@pytest.fixture
def s():
    return Settings(env={"KARAKEEP_URL": "http://kk:3010", "KARAKEEP_API_KEY": "k"})


@respx.mock
async def test_karakeep_groups_by_list(s):
    respx.get(f"{BASE}/lists").respond(json={"lists": [
        {"id": "a", "name": "Homelab", "icon": "🖥️"}, {"id": "b", "name": "3D", "icon": "🧊"}]})
    respx.get(f"{BASE}/lists/a/bookmarks").respond(json={"bookmarks": [bm("Pi", "https://pi.dev")], "nextCursor": None})
    respx.get(f"{BASE}/lists/b/bookmarks").respond(json={"bookmarks": [bm("Orca", "https://orca.io")], "nextCursor": None})
    out = await karakeep.fetch(s)
    assert [g["list"] for g in out] == ["Homelab", "3D"]
    assert out[0]["icon"] == "🖥️"
    assert out[0]["items"] == [{"title": "Pi", "url": "https://pi.dev", "favicon": "https://pi.dev/favicon.ico"}]


@respx.mock
async def test_karakeep_follows_cursor(s):
    respx.get(f"{BASE}/lists").respond(json={"lists": [{"id": "a", "name": "L", "icon": "x"}]})
    route = respx.get(f"{BASE}/lists/a/bookmarks")
    route.side_effect = [
        respx.MockResponse(200, json={"bookmarks": [bm("1", "https://1.ro")], "nextCursor": "c2"}),
        respx.MockResponse(200, json={"bookmarks": [bm("2", "https://2.ro")], "nextCursor": None}),
    ]
    out = await karakeep.fetch(s)
    assert [i["title"] for i in out[0]["items"]] == ["1", "2"]
    assert route.calls[1].request.url.params["cursor"] == "c2"


@respx.mock
async def test_karakeep_skips_non_link(s):
    respx.get(f"{BASE}/lists").respond(json={"lists": [{"id": "a", "name": "L", "icon": "x"}]})
    respx.get(f"{BASE}/lists/a/bookmarks").respond(json={"bookmarks": [
        bm("n", None, kind="text"), bm("ok", "https://ok.ro")], "nextCursor": None})
    out = await karakeep.fetch(s)
    assert [i["title"] for i in out[0]["items"]] == ["ok"]
