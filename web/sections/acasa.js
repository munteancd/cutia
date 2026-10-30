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
        pr = d.printer.value, ph = d.phone.value, yt = d.youtube.value, m = d.modal.value;
  const printer = !pr ? "" : pr.state === "printing"
    ? `<div>${dot("warn")}<span class="big warn-text">${pr.progress}%</span></div>`
    : `<div>${dot(pr.state === "off" ? "" : "ok")}${pr.state === "off" ? "oprită" : "liberă"}</div>`;
  return [
    tile("Ora", `<div class="big" id="clock"></div><div class="sub" id="date"></div>`),
    tile("Moșnița", w ? `<div class="big">${Math.round(w.temp)}°</div><div class="sub">${esc(w.desc)} · ${Math.round(w.min)}°/${Math.round(w.max)}°</div>` : "", d.weather),
    tile("Gmail", g ? `<div class="big">${g.unread}</div><div class="sub">necitite</div>` : "", d.gmail),
    tile("Otto", o ? `<div>${dot(o.up ? "ok" : "bad")}${o.up ? "merge" : esc(o.detail)}</div>` : "", d.otto),
    tile("Pi-hole", p ? `<div>${dot("ok")}${p.blocked_pct}% blocat</div>` : "", d.pihole),
    tile("Imprimanta", printer, d.printer),
    tile("Telefon", ph ? `<div class="big">${ph.battery}%</div><div class="sub">${ph.charging ? "se încarcă" : "baterie"}</div>` : "", d.phone),
    tile("YouTube", yt ? yt.channels.map(c => `<div><b>${fmt(c.subs)}</b> <span class="sub">${esc(c.name)}</span></div>`).join("") : "", d.youtube),
    tile("Modal", m ? `<div class="big">$${m.left.toFixed(2)}</div><div class="sub">rămași din $${m.credit}</div>` : "", d.modal),
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

let timers = [];
registerSection("acasa", "Acasă", "🏠", async el => {
  timers.forEach(clearInterval);
  el.innerHTML = `<div class="grid" id="tiles"></div><div class="shortcuts" id="shortcuts"></div>`;
  async function load() {
    if (!isShown("acasa")) return;
    try {
      const d = await api("/api/home");
      document.getElementById("tiles").innerHTML = render(d);
      document.getElementById("shortcuts").innerHTML = shortcuts(d.shortcuts || []);
      tick();
    } catch (e) {
      document.getElementById("tiles").innerHTML = `<div class="tile off"><div class="label">Server</div><div>nu răspunde</div></div>`;
    }
  }
  await load();
  timers = [setInterval(tick, 1000), setInterval(load, 30000)];
});
