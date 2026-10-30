# Cutia

Pagina de start personală a lui Cristi (după modelul mybox.id): Acasă cu starea
dintr-o privire + Bookmarks, Unelte, 3D Print, Sport, Radio, TV.

**Adresa (doar acasă, sau prin VPN-ul WireGuard):** https://cutia.cristiradio.duckdns.org:3050

Design: `docs/superpowers/specs/`, plan: `docs/superpowers/plans/`.

## Cum adaugi ceva (o linie într-un fișier din `config/`)

| Ce | Fișier |
|---|---|
| scurtătură pe Acasă | `config/shortcuts.yaml` |
| stație de radio | `config/radio.yaml` (http:// trece singur prin server) |
| card la 3D Print | `config/print3d.yaml` + poza în `web/img/print3d/` |
| ligă la Sport | `config/leagues.yaml` (ID-ul ligii de pe fotmob.com) |
| canal cu plată de ascuns la TV | `config/tv_exclude.yaml` |
| unealtă nouă | `web/tools/<id>.js` + o linie în `web/tools/index.js` |

După modificare pe server: `cd ~/cutia && git pull && systemctl --user restart cutia`.

## De unde vin datele

| Căsuță | Sursă |
|---|---|
| Vremea | Open-Meteo (Moșnița Veche) |
| Gmail | IMAP, doar Inbox principal; cere `GMAIL_APP_PASSWORD` în `.env` |
| Otto | `hermes-gateway.service` + `/cc` health (:3110) |
| Pi-hole | API v6 pe .192, cu .193 de rezervă |
| Imprimanta | MQTT pe Centauri Carbon 2 |
| Telefon | Home Assistant (aplicația Companion); cere `HA_TOKEN` + `HA_PHONE_ENTITY` |
| YouTube | tokenurile OAuth ale lui Otto (`~/.hermes/.env`) |
| Modal | `modal billing report` luna asta; rămas = 30 $ − cheltuit |
| Bookmarks | Karakeep (:3010), pe listele de acolo |
| Sport | FotMob (toate 7 ligile; ESPN n-are Liga 2 și are Liga 1 pe sezonul trecut) |
| TV | lista publică iptv-org, fără canale cu plată și fără stream-uri http |

O sursă căzută nu strică pagina: căsuța ei devine gri, sau arată ultima valoare bună marcată „veche”.

## Server (server2)

- Cod: `~/cutia` (git, ramura `v1`), venv `~/cutia/.venv` (făcut cu `uv`, Python 3.11).
- Serviciu: `systemctl --user {status,restart} cutia` (fișierul în `deploy/cutia.service`).
- Secrete: `~/cutia/.env` (chmod 600), model în `.env.example`. Nimic secret în git.

## HTTPS

- Certificat Let's Encrypt pentru `cutia.cristiradio.duckdns.org`, obținut prin provocare DNS
  la DuckDNS (`~/.acme.sh`, tokenul din containerul `duckdns`). Reînnoire: cron zilnic 04:17,
  care repornește singur serviciul.
- Numele duce la 192.168.0.106 **doar în rețeaua de acasă**, printr-o înregistrare DNS locală
  în Pi-hole. Pe internet duce la IP-ul public, unde portul 3050 nu e deschis, deci pagina nu se vede din afară.
- Caddy-ul de pe server (al lui Yams) nu e atins.

## Pornire locală

    python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
    cp .env.example .env   # completează
    .venv/Scripts/python -m uvicorn cutia.app:app --app-dir backend --port 3050

Teste: `python -m pytest`
