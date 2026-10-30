# Cutia — pagina de start personală a lui Cristi

*Design, 2026-10-30. Numele „Cutia" (după MyBox) e alegerea mea, se poate schimba.*

## De ce

Cristi a văzut https://mybox.id (o suită de mini-aplicații în browser: pagină de start cu
widgeturi, bookmarks, unelte, radio, IPTV) și vrea ceva la fel, **făcut doar pentru el**.
Are deja Homarr pe server2, dar nu-l folosește — l-a deschis o dată la început. Deci
pagina nouă trebuie să fie ceva ce chiar deschide: ce vrea să afle dintr-o privire
(ora, vremea, mesaje, starea serverelor) + tot ce folosește des, într-un singur loc.

**Succes** = o deschide zilnic pe PC (și pe telefon acasă) în locul tab-urilor
risipite. **Eșec chiar dacă merge tehnic** = încă un Homarr: aglomerat, generic, uitat.

## Pentru cine, unde

- Un singur utilizator: Cristi. Nu se dă nimănui, nu are conturi.
- **Acasă, pe PC în principal; și pe telefon** (același Wi-Fi). Deci trebuie să arate bine
  și îngust (telefon) — pe telefon meniul din stânga se strânge (ex. hamburger / bară jos).
- **Găzduită pe server2** (192.168.0.106), pentru că starea lui Otto, Pi-hole,
  imprimantei, telefonului se poate citi doar din LAN. *(Decizia mea.)*
- **Fără parolă acasă** (decizia lui, 2026-10-30): adresa nu o dă nimănui. Musafirii sunt
  pe aceeași rețea, deci teoretic o pot găsi — i-am spus, a ales așa.
- **Iconița pe telefon:** o instalare reală de PWA cere HTTPS. Pe `http://192.168.0.106:port`
  Chrome face doar o scurtătură. Builderul pune HTTPS local prin Caddy-ul existent (ex. un
  subdomeniu duckdns cu certificat), FĂRĂ a expune pagina pe internet. Fără parolă.
- **Acces din afara casei: NU în v1.** Pagina arată mailuri/mesaje → expunerea cere
  parolă și grijă; amânat explicit.

## Forma (aleasă de el: varianta C din schițe)

Meniu în stânga, ca o aplicație; dreapta = conținutul categoriei alese. Temă închisă
(ca în captura aprobată). Schițele sunt în `schite/`: `layout-variante-ABC.html` (a ales C)
și `acasa-aprobat.png` (decupajul din C pe care l-a arătat el: „prima pagină doar așa").
Categorii, în ordinea asta:

### 1. Acasă
Doar căsuțe mici de stare + un rând de scurtături. Nimic altceva (fără sport, fără
bookmarks). Conținut:
- **Ora** + data.
- **Vremea** în Moșnița Veche (acum + eventual azi min/max). Sursă la alegerea builderului
  (ex. Open-Meteo, fără cheie).
- **Mailuri necitite** în Gmail-ul lui (munteancd@gmail.com) — prin IMAP cu *parolă de
  aplicație* Google pe care o generează el. Doar numărul (eventual expeditorul ultimelor).
- **WhatsApp necitite** pe numărul LUI (40771550321). ATENȚIE: bridge-ul existent
  (Baileys, port 3100) e al lui Otto, pe numărul lui Otto — nu vede mesajele lui Cristi.
  E nevoie de o legătură separată pe numărul lui (ca un WhatsApp Web legat).
  **SCOS din v1 (el, 2026-10-30): „lăsăm WhatsApp-ul pentru moment"** — riscul de
  blocare a numărului personal prin legătura neoficială. Nu se construiește.
- **Otto** — beculeț verde/roșu (ex. `hermes-gateway.service` activ + bridge răspunde;
  există deja `/cc` health pe :3110 — builderul alege semnalul).
- **Pi-hole** — beculeț + procent blocat azi. API v6 pe 192.168.0.192 (răspunde și pe .193),
  `POST /api/auth` → `sid`, apoi `/api/stats/summary`. Parola web e în memoria mea, nu în repo.
- **Imprimanta** Elegoo Centauri Carbon 2 (192.168.0.239) — beculeț + procent când
  printează. MQTT 1883, user `elegoo`, topic `elegoo/F01UJWHG88VJMN5/api_status`,
  `machine_status.progress`. Otto are deja integrare MQTT — se poate refolosi.
- **Bateria telefonului** (Galaxy A52s) — prin `adb` wireless. Limită: pe A52s „Depanare
  wireless" e oprită de el după folosire și portul se schimbă → *probabil nu merge
  stabil așa*. Builderul verifică; alternativă acceptabilă: o aplicație/automatizare pe
  telefon care trimite bateria la server (ex. Home Assistant companion app — HA rulează
  pe server2 :8123). Dacă niciuna nu e rezonabilă, căsuța se scoate.
- **Abonați YouTube** la canalele lui: Locul Unu (`UCWNOrqkkIOx9SiY8B_kQUnQ`) și
  Județ cu Județ (ID de aflat). Număr public, YouTube Data API v3 cu cheie din `.env`
  de pe server2 (atenție: proiectul GCP are restricții — verifică întâi).
- **Credit Modal** — îl vrea (confirmat 2026-10-30). Se face dacă Modal îl expune printr-o
  comandă/API; dacă e cu adevărat imposibil, se scoate și i se spune de ce.
  (La fel bateria telefonului: o vrea, se scoate doar dacă nu există cale rezonabilă.)
- **Rândul de scurtături** — site-urile folosite cel mai des (YouTube, Gmail, GitHub,
  Claude, … lista finală o dă el; ușor de editat).

Fiecare căsuță e independentă: dacă o sursă pică, căsuța arată „—"/gri, restul merge.

### 2. Bookmarks
Din **Karakeep** (server2:3010), pe categoriile de acolo (are 20 Smart Lists pe teme, în
română, generate pe tag-urile AI). Ce salvează în Karakeep apare singur aici. Click =
deschide site-ul. Cheie API există (în memoria mea). Căutare rapidă = bonus.

### 3. Unelte
**Uneltele merg CHIAR ÎN PAGINĂ, ca la MyBox** (el, 2026-10-30) — nu linkuri spre alte
site-uri. **Care unelte = nedecis**; se discută separat, după v1 („va trebui să discutăm").
Deci **v1 livrează doar „raftul"**: categoria Unelte și un mod simplu de a adăuga o unealtă
ca modul de sine stătător (fiecare unealtă = o bucată proprie, pornită din meniu), plus
1-2 unelte evidente ca dovadă că raftul merge (ex. generator QR, convertor de unități —
alegerea builderului). Lista reală vine dintr-un brainstorm separat, unealtă cu unealtă.
Preferabil uneltele lucrează în browser (ca IT-Tools), ca să nu încarce server2
(i3, ~7,7 GB RAM). IT-Tools (server2:3020) rămâne pe loc; nu se copiază.

### 4. 3D Print
Scurtături: https://skipthecad.com/, https://ilove3d.app/en + ce mai adaugă.
**Generatoarele de pe SkipTheCAD** (director cu ~666 generatoare: formular/poză/text →
STL/3MF) nu rulează în pagina lui — rămân linkuri, DAR fiecare apare ca **card cu poză
proprie**, pentru că pozele de pe SkipTheCAD nu arată corect ce face fiecare (el,
2026-10-30). Poza = captură făcută de noi cu rezultatul real al generatorului (ce
piesă iese), + o descriere scurtă în română. **Nu le punem pe toate 666** — el alege
care (pornim cu câteva, se adaugă pe parcurs); fiecare card = o intrare în config + o poză. (Eventual și link spre camera imprimantei — MJPEG
la `http://192.168.0.239:8080/` — ca bonus, nu cerință.)

### 5. Sport
Pentru **România Liga 1, România Liga 2, Anglia (Premier League), Italia (Serie A),
Spania (La Liga), Franța (Ligue 1), Germania (Bundesliga)**: clasamentul la zi +
rezultatele ultimei etape + meciurile etapei următoare, cu ora României. NU pe Acasă.
Surse **legale, gratuite**: cele 5 mari sunt ușor de găsit (ex. football-data.org free
tier); **Liga 1 și mai ales Liga 2 trebuie verificate** — dacă Liga 2 nu are sursă
gratuită rezonabilă, i se spune, nu se inventează.
**Fără stream-uri de meciuri** (a cerut streamed.pk — refuzat: retransmisii fără drepturi).

### 6. Radio
Stații care cântă direct în pagină: românești + SomaFM etc. **Fără stația lui
AzuraCast** (n-o mai pornește). Player persistent: muzica nu se oprește când schimbi
categoria (pagina e SPA sau player fix).

### 7. TV (IPTV)
Canale live în pagină. **Românești primele** (grupul de sus), **sub ele toate celelalte**
(grupate pe țări). Sursă: liste publice de stream-uri difuzate liber (ex. iptv-org).
Doar canale transmise gratuit/public — multe canale private RO (Pro, Antena) nu sunt
gratuite online și deci nu apar; asta i se spune, nu se ocolește.

## Non-goals (v1)
- Acces de pe internet / din afara casei.
- Conturi, mai mulți utilizatori, sincronizare între oameni.
- Notițe, sarcini, Pomodoro și restul aplicațiilor MyBox pe care nu le-a cerut.
- Înlocuirea lui Homarr (rămâne cum e; poate fi oprit separat, la cererea lui).

## Constrângeri
- Proiect nou în `D:\Proiecte personale\cutia`, git propriu, repo GitHub **public**
  (regula lui) — deci **nicio parolă/cheie în repo**: toate în `.env` pe server2.
- server2 e slab (i3-6006U, ~7,7 GB RAM, deja multe servicii): backend ușor, cache pe
  date (sport/YouTube/vreme nu se cer la fiecare deschidere).
- Pi-hole și imprimanta sunt pe IP-uri DHCP care s-au mai mutat.
- El are nivel tehnic de bază: adăugarea unei scurtături/unelte/stații trebuie să fie
  „editezi o linie" sau să-mi ceară mie.

## Decizii mele (le poate schimba)
- **Gmail „necitite"** = doar Inbox-ul principal (Primary), nu Promoții/Social — altfel
  căsuța arată sute și devine zgomot.
- **Liga 1 / Liga 2:** întâi surse API gratuite; dacă nu există, e acceptabil să citim
  tabelul de pe un site public (uz personal) — cu cache și cu „sursă indisponibilă" curat
  când se strică parserul.
- **Cum o deschide:** pagina de start a browserului pe PC + iconiță pe ecranul telefonului
  (instalabilă ca PWA). Deci trebuie să se încarce repede (date din cache, apoi se
  actualizează).

## Ce rămâne la builder
Stack-ul (frontend + un backend mic care adună datele), portul, cum se pornește pe
server2 (Docker/systemd), aspectul exact, sursele de date concrete unde doc-ul zice
„ex.", frecvența de reîmprospătare, ordinea de construire (recomandat: scheletul +
Acasă fără WhatsApp → Bookmarks → Sport → Radio/TV → Unelte/3D → WhatsApp ultimul).
