import { api, esc, registerSection } from "../app.js";

function group(g, open) {
  const items = g.items.map(i => `
    <a class="bm" href="${esc(i.url)}" target="_blank" rel="noopener" data-q="${esc((i.title + " " + i.url).toLowerCase())}">
      <img src="${esc(i.favicon || `https://icons.duckduckgo.com/ip3/${new URL(i.url).hostname}.ico`)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <span>${esc(i.title)}</span></a>`).join("");
  return `<details class="bm-group" ${open ? "open" : ""}>
    <summary>${esc(g.icon)} ${esc(g.list)} <span class="count">${g.items.length}</span></summary>
    <div class="bm-list">${items}</div></details>`;
}

registerSection("bookmarks", "Bookmarks", "🔖", async el => {
  el.innerHTML = `<h1>Bookmarks</h1>
    <input id="bm-q" class="search" type="search" placeholder="Caută în bookmarks…" autocomplete="off">
    <div id="bm"></div>`;
  const box = el.querySelector("#bm");
  box.innerHTML = `<p class="sub">Se încarcă din Karakeep…</p>`;
  const env = await api("/api/bookmarks").catch(() => null);
  if (!env || !env.ok) { box.innerHTML = `<p class="sub">Karakeep nu răspunde.</p>`; return; }
  const groups = env.value.filter(g => g.items.length);
  box.innerHTML = groups.map((g, i) => group(g, i < 3)).join("");
  el.querySelector("#bm-q").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    box.querySelectorAll(".bm-group").forEach(d => {
      let n = 0;
      d.querySelectorAll(".bm").forEach(a => { const hit = !q || a.dataset.q.includes(q); a.hidden = !hit; n += hit; });
      d.hidden = n === 0;
      if (q) d.open = true;
    });
  });
});
