import httpx
import pytest
import respx

from cutia.settings import Settings
from cutia.sources import diacritics

URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"


@pytest.fixture
def s(tmp_path):
    env = tmp_path / "hermes.env"
    env.write_text("GEMINI_API_KEY=g\n", encoding="utf-8")
    return Settings(env={"HERMES_ENV": str(env)})


def answer(text):
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


def test_cedilla_becomes_comma():
    assert diacritics.fix_cedilla("Şi ţara îşi") == "Și țara își"


@respx.mock
async def test_adds_missing_diacritics(s):
    route = respx.post(URL).respond(json=answer("Știința și țara"))
    assert await diacritics.restore(s, "Stiinta si tara") == "Știința și țara"
    assert route.calls[0].request.url.params["key"] == "g"


@respx.mock
async def test_rejects_answer_that_changes_words(s):
    respx.post(URL).respond(json=answer("Știința și patria"))
    with pytest.raises(ValueError):
        await diacritics.restore(s, "Stiinta si tara")


@respx.mock
async def test_keeps_text_layout(s):
    respx.post(URL).respond(json=answer("Ana are mere.\n\nȘi pere."))
    assert await diacritics.restore(s, "Ana are mere.\n\nSi pere.") == "Ana are mere.\n\nȘi pere."


@respx.mock
async def test_gemini_error_raises(s):
    respx.post(URL).respond(500)
    with pytest.raises(httpx.HTTPStatusError):
        await diacritics.restore(s, "Si")
