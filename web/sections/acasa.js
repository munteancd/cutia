import { api, esc, isShown, registerSection } from "../app.js";

const ZILE = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
const LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
const fmt = n => Number(n).toLocaleString("ro-RO");

function tile(label, body, env, extra = "") {
  const off = env && !env.ok;
  const old = env && env.stale ? `<span class="old">veche</span>` : "";
  return `<div class="tile ${off ? "off" : ""} ${extra}"><div class="label">${label} ${old}</div>${off ? `<div class="big">—</div>` : body}</div>`;
}

function dot(state) { return `<span class="dot ${state}"></span>`; }

function render(d) {
  const w = d.weather.value, g = d.gmail.value, o = d.otto.value, p = d.pihole.value,
        pr = d.printer.value, ph = d.phone.value, yt = d.youtube.value, m = d.modal.value, sv = d.server?.value, cal = d.calendar?.value;
  const left = m => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
  const busy = pr && (pr.state === "printing" || pr.state === "paused");
  // cât printează, căsuța e lată și are poza din cameră (reîncărcată la fiecare load)
  const printer = !pr ? "" : busy
    ? `<div class="printer-row"><img class="cam" src="/api/printer/snapshot?t=${Date.now()}" alt="" onerror="this.remove()">
       <div><div>${dot("warn")}<span class="big warn-text">${pr.progress}%</span></div>
       <div class="sub">${pr.state === "paused" ? "pe pauză" : pr.remaining_min != null ? `mai are ${left(pr.remaining_min)}` : "printează"}</div></div></div>`
    : `<div>${dot(pr.state === "off" ? "" : "ok")}${pr.state === "off" ? "oprită" : "liberă"}</div>`;
  const backupsOk = sv && sv.backups.every(b => b.ok);
  const server = !sv ? "" : `
    <div>${dot(sv.disk.used_pct > 90 ? "bad" : "ok")}disc ${sv.disk.used_pct}% <span class="sub">· ${sv.disk.free_gb} GB liberi</span></div>
    <div title="${esc(sv.backups.map(b => `${b.name}: ${b.when}`).join(" · "))}">${dot(backupsOk ? "ok" : "bad")}backup ${backupsOk ? "ok" : sv.backups.filter(b => !b.ok).map(b => esc(b.name)).join(", ") + " a dat greș"}</div>
    ${sv.net ? `<div>${dot(!sv.net.up ? "bad" : sv.net.drops_today ? "warn" : "ok")}net: ${!sv.net.up ? "căzut" : sv.net.drops_today ? `${sv.net.drops_today} ${sv.net.drops_today === 1 ? "cădere" : "căderi"} azi` : "fără căderi azi"}</div>` : ""}`;
  const day = (when, evs) => evs.length ? `<div class="sub">${when}</div>` + evs.map(e => `<div>${e.time ? `<b>${e.time}</b> ` : ""}${esc(e.title)}</div>`).join("") : "";
  const agenda = !cal ? "" : (day("azi", cal.today) + day("mâine", cal.tomorrow)) || `<div class="sub">nimic azi și mâine</div>`;
  return [
    tile("Ora", `<div class="big" id="clock"></div><div class="sub" id="date"></div>`),
    tile(`<a href="#/calendar">Calendar</a>`, agenda, d.calendar),
    tile("Moșnița", w ? `<div class="big">${Math.round(w.temp)}°</div><div class="sub">${esc(w.desc)} · ${Math.round(w.min)}°/${Math.round(w.max)}°</div>` : "", d.weather),
    tile("Gmail", g ? `<div class="big">${g.unread}</div><div class="sub">necitite</div>` : "", d.gmail),
    tile("Otto", o ? `<div>${dot(o.up ? "ok" : "bad")}${o.up ? "merge" : esc(o.detail)}</div>` : "", d.otto),
    tile("Pi-hole", p ? `<div>${dot("ok")}${p.blocked_pct}% blocat</div>` : "", d.pihole),
    tile("Imprimanta", printer, d.printer, busy ? "wide" : ""),
    tile("Telefon", ph ? `<div class="big">${ph.battery}%</div><div class="sub">${ph.charging ? "se încarcă" : "baterie"}</div>` : "", d.phone),
    tile("YouTube", yt ? yt.channels.map(c => `<div><b>${fmt(c.subs)}</b> <span class="sub">${esc(c.name)}</span></div>`).join("") : "", d.youtube),
    tile("Modal", m ? `<div class="big">$${m.left.toFixed(2)}</div><div class="sub">rămași din $${m.credit}</div>` : "", d.modal),
    tile("Server2", server, d.server),
  ].join("");
}

function shortcuts(list) {
  return list.map(s => {
    // claude://, steam://… deschid aplicația de pe PC; iconița vine din `icon`
    const app = !/^https?:/.test(s.url);
    const host = s.icon || new URL(s.url).hostname;
    return `<a class="shortcut" href="${esc(s.url)}" ${app ? "" : `target="_blank" rel="noopener"`}>
      <img src="https://icons.duckduckgo.com/ip3/${esc(host)}.ico" alt="" loading="lazy">${esc(s.name)}</a>`;
  }).join("");
}

function tick() {
  const c = document.getElementById("clock");
  if (!c) return;
  const n = new Date();
  c.textContent = n.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("date").textContent = `${ZILE[n.getDay()]}, ${n.getDate()} ${LUNI[n.getMonth()]}`;
}

// „y ceva" = YouTube, „k ceva" = Karakeep, altfel Google
const SEARCH = {
  y: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  k: q => `http://192.168.0.106:3010/dashboard/search?q=${encodeURIComponent(q)}`,
  "": q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
};
function search(e) {
  e.preventDefault();
  const v = e.target.q.value.trim(), m = v.match(/^([yk]) (.+)/);
  if (!v) return;
  window.open(m ? SEARCH[m[1]](m[2]) : SEARCH[""](v), "_blank", "noopener");
  e.target.q.value = "";
}

async function speak(e) {
  e.preventDefault();
  const f = e.target, text = f.text.value.trim(), note = f.querySelector(".sub");
  if (!text) return;
  note.textContent = "Se pregătește vocea…"; f.querySelector("button").disabled = true;
  try {
    const r = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    note.textContent = r.ok ? (await r.json()).message : "Boxa nu răspunde acum.";
    if (r.ok) f.text.value = "";
  } catch { note.textContent = "Serverul nu răspunde."; }
  f.querySelector("button").disabled = false;
}

let timers = [];
registerSection("acasa", "Acasă", "🏠", async el => {
  timers.forEach(clearInterval);
  el.innerHTML = `<form class="searchbar" id="search"><input name="q" class="search" placeholder="Caută pe Google… (y = YouTube, k = Karakeep)" autocomplete="off"></form>
    <div class="grid" id="tiles"></div><div class="shortcuts" id="shortcuts"></div>
    <form class="speak" id="speak"><input name="text" class="search" placeholder="Spune ceva pe boxa din casă…" maxlength="500" autocomplete="off">
      <button type="submit" class="player-btn">🔊 Spune</button><div class="sub"></div></form>`;
  el.querySelector("#search").addEventListener("submit", search);
  el.querySelector("#speak").addEventListener("submit", speak);
  if (matchMedia("(pointer: fine)").matches) el.querySelector("#search input").focus();
  async function load() {
    if (!isShown("acasa")) return;
    try {
      const d = await api("/api/home");
      if (!isShown("acasa")) return; // ai plecat pe altă categorie cât se încărca
      document.getElementById("tiles").innerHTML = render(d);
      document.getElementById("shortcuts").innerHTML = shortcuts(d.shortcuts || []);
      tick();
    } catch (e) {
      if (isShown("acasa")) document.getElementById("tiles").innerHTML = `<div class="tile off"><div class="label">Server</div><div>nu răspunde</div></div>`;
    }
  }
  await load();
  timers = [setInterval(tick, 1000), setInterval(load, 30000)];
});
