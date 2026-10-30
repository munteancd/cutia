import { api, esc, registerSection, stop } from "../app.js";

const HLS_JS = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js";
let hlsLoaded = null;
function loadHls() {
  hlsLoaded ??= new Promise((ok, bad) => {
    const s = document.createElement("script");
    s.src = HLS_JS; s.onload = ok; s.onerror = bad;
    document.head.append(s);
  });
  return hlsLoaded;
}

const COUNTRY_RO = { Romania: "România" };
// Platforme cu cont (canalele lor nu se pot reda aici) — doar scurtături.
const LINKS = [{ name: "Digi Online", url: "https://www.digionline.ro/" }];
let hls = null;

registerSection("tv", "TV", "📺", async el => {
  el.innerHTML = `<h1>TV</h1>
    <div class="tv-links">${LINKS.map(l => `<a class="shortcut" href="${esc(l.url)}" target="_blank" rel="noopener">
      <img src="https://icons.duckduckgo.com/ip3/${esc(new URL(l.url).hostname)}.ico" alt="">${esc(l.name)}</a>`).join("")}</div>
    <div class="tv-wrap">
      <div class="tv-screen"><video id="tv-video" controls playsinline></video>
        <div id="tv-msg" class="tv-msg">Alege un canal.</div></div>
      <div class="tv-side">
        <input id="tv-q" class="search" type="search" placeholder="Caută canal…" autocomplete="off">
        <div id="tv-list" class="tv-list"><p class="sub">Se încarcă lista…</p></div>
      </div>
    </div>`;
  const video = el.querySelector("#tv-video"), msg = el.querySelector("#tv-msg"), list = el.querySelector("#tv-list");
  const env = await api("/api/tv").catch(() => null);
  if (!env || !env.ok) { list.innerHTML = `<p class="sub">Lista de canale nu se poate încărca.</p>`; return; }
  const all = env.value;
  list.innerHTML = all.map((g, gi) => `<details class="bm-group" ${gi === 0 ? "open" : ""}>
    <summary>${esc(COUNTRY_RO[g.country] ?? g.country)} <span class="count">${g.channels.length}</span></summary>
    <div class="ch-list">${g.channels.map((c, ci) =>
      `<button type="button" class="ch" data-g="${gi}" data-c="${ci}" data-q="${esc(c.name.toLowerCase())}">${esc(c.name)}</button>`).join("")}</div>
  </details>`).join("");

  async function tune(c) {
    stop(); // oprește radioul
    msg.textContent = `Se pornește ${c.name}…`; msg.hidden = false;
    if (hls) { hls.destroy(); hls = null; }
    const fail = () => { msg.textContent = `${c.name} — canal indisponibil. Încearcă altul.`; msg.hidden = false; };
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = c.url;
    } else {
      await loadHls().catch(fail);
      if (!window.Hls) return;
      hls = new window.Hls();
      hls.on(window.Hls.Events.ERROR, (_e, d) => { if (d.fatal) fail(); });
      hls.loadSource(c.url);
      hls.attachMedia(video);
    }
    video.onerror = fail;
    video.play().then(() => { msg.hidden = true; }).catch(() => {});
    video.onplaying = () => { msg.hidden = true; };
  }

  list.addEventListener("click", e => {
    const b = e.target.closest(".ch");
    if (!b) return;
    list.querySelectorAll(".ch.on").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    tune(all[+b.dataset.g].channels[+b.dataset.c]);
  });
  el.querySelector("#tv-q").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    list.querySelectorAll(".bm-group").forEach(d => {
      let n = 0;
      d.querySelectorAll(".ch").forEach(b => { const hit = !q || b.dataset.q.includes(q); b.hidden = !hit; n += hit; });
      d.hidden = n === 0;
      if (q && n && n < 60) d.open = true;
    });
  });
  // la plecarea din pagina TV, oprim video-ul
  window.addEventListener("hashchange", function off() {
    if (hls) { hls.destroy(); hls = null; }
    window.removeEventListener("hashchange", off);
  });
});
