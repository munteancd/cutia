# Cutia

Pagina de start personală a lui Cristi (după modelul mybox.id): Acasă cu starea
dintr-o privire + Bookmarks, Unelte, 3D Print, Sport, Radio, TV.

Rulează pe server2, port 3050. Design: `docs/superpowers/specs/`, plan: `docs/superpowers/plans/`.

## Pornire locală

    python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
    cp .env.example .env   # completează
    .venv/Scripts/python -m uvicorn cutia.app:app --app-dir backend --port 3050

Teste: `python -m pytest`
