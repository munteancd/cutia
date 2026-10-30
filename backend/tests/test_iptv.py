from cutia.sources import iptv

M3U = """#EXTM3U
#EXTINF:-1 tvg-logo="https://l/a.png" group-title="Albania",ABC News Albania (720p)
https://a.example/abc.m3u8
#EXTINF:-1 tvg-logo="" group-title="Romania",TVR 1 (1080p)
https://r.example/tvr1.m3u8
#EXTINF:-1 group-title="Romania",Pro TV (1080p)
https://r.example/protv.m3u8
#EXTINF:-1 group-title="Romania",Digi 24 (720p) [Geo-blocked]
https://r.example/digi24.m3u8
#EXTINF:-1 group-title="Romania",Canal fără link
#EXTINF:-1 group-title="Romania",Banat TV
http://r.example/banat.m3u8
#EXTINF:-1 group-title="Austria",ORF 1
https://at.example/orf1.m3u8
"""

EXCLUDE = ["pro tv", "axn"]


def test_m3u_groups_by_country():
    out = iptv.parse(M3U, EXCLUDE)
    assert [g["country"] for g in out] == ["Romania", "Albania", "Austria"]
    assert out[1]["channels"] == [{"name": "ABC News Albania", "url": "https://a.example/abc.m3u8", "logo": "https://l/a.png"}]


def test_romania_first():
    assert iptv.parse(M3U, EXCLUDE)[0]["country"] == "Romania"


def test_m3u_skips_broken_entries():
    names = [c["name"] for c in iptv.parse(M3U, EXCLUDE)[0]["channels"]]
    assert "Canal fără link" not in names


def test_excludes_pay_channels():
    names = [c["name"] for c in iptv.parse(M3U, EXCLUDE)[0]["channels"]]
    assert "Pro TV" not in names
    assert "TVR 1" in names


def test_drops_http_streams_and_cleans_names():
    names = [c["name"] for c in iptv.parse(M3U, EXCLUDE)[0]["channels"]]
    assert names == ["Digi 24", "TVR 1"]  # Banat TV e http (blocat pe pagina https); sortate alfabetic
