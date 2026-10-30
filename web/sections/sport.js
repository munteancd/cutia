import { api, esc, registerSection } from "../app.js";

// echipele lui, evidențiate în tabele și meciuri
const FAV = ["Inter", "Barcelona", "CSM Reșița", "CSM Resita"];
const isFav = name => FAV.some(f => name.includes(f));

const ZILE = ["dum", "lun", "mar", "mie", "joi", "vin", "sâm"];
function when(iso) {
  const d = new Date(iso);
  const hh = d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
  return `${ZILE[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")} · ${hh}`;
}

function table(rows) {
  return `<table class="tbl"><thead><tr><th>#</th><th class="l">Echipa</th><th>M</th><th>GD</th><th>Pct</th></tr></thead><tbody>${
    rows.map(r => `<tr class="${isFav(r.team) ? "fav" : ""}"><td>${r.pos}</td><td class="l">${esc(r.team)}</td><td>${r.played}</td><td>${r.gd > 0 ? "+" : ""}${r.gd}</td><td><b>${r.pts}</b></td></tr>`).join("")
  }</tbody></table>`;
}

function matches(list, title) {
  if (!list.length) return "";
  return `<h2>${title}</h2><div class="matches">${list.map(m => `
    <div class="match ${isFav(m.home) || isFav(m.away) ? "fav" : ""}">
      <span class="when">${m.live ? `<b class="live">LIVE</b>` : when(m.date)}</span>
      <span class="t r">${esc(m.home)}</span>
      <span class="score">${m.score ?? "–"}</span>
      <span class="t">${esc(m.away)}</span>
    </div>`).join("")}</div>`;
}

let chosen = null;
registerSection("sport", "Sport", "⚽", async el => {
  const leagues = await api("/api/football").catch(() => []);
  chosen = chosen ?? leagues[0]?.id;
  el.innerHTML = `<h1>Sport</h1><div class="tabs" id="lg-tabs">${
    leagues.map(l => `<button type="button" data-id="${l.id}">${esc(l.name)}</button>`).join("")
  }</div><div id="lg"></div>`;
  const box = el.querySelector("#lg");
  async function show(id) {
    chosen = id;
    el.querySelectorAll("#lg-tabs button").forEach(b => b.classList.toggle("on", +b.dataset.id === id));
    box.innerHTML = `<p class="sub">Se încarcă…</p>`;
    const env = await api(`/api/football/${id}`).catch(() => null);
    if (chosen !== id) return;
    if (!env || !env.ok) { box.innerHTML = `<p class="sub">Sursa nu răspunde acum.</p>`; return; }
    const v = env.value;
    box.innerHTML = `<div class="sport-grid"><div>${table(v.standings)}</div>
      <div>${matches(v.next, "Etapa următoare")}${matches(v.last, "Etapa trecută")}</div></div>`;
  }
  el.querySelector("#lg-tabs").addEventListener("click", e => {
    const b = e.target.closest("button"); if (b) show(+b.dataset.id);
  });
  if (chosen) show(chosen);
});
