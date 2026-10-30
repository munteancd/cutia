import { api, esc, registerSection } from "../app.js";

// Jocurile mele: cele gata se deschid în tab nou, cele fără link sunt „în curând”
registerSection("jocuri", "Jocuri", "🎮", async el => {
  const games = await api("/api/jocuri").catch(() => []);
  el.innerHTML = `<h1>Jocuri</h1><div class="cards">${games.map(g => g.url ? `
    <a class="card" href="${esc(g.url)}" target="_blank" rel="noopener">
      <div class="card-ico">${esc(g.icon)}</div>
      <div><b>${esc(g.name)}</b><div class="sub">${esc(g.description)}</div></div>
    </a>` : `
    <div class="card soon">
      <div class="card-ico">${esc(g.icon)}</div>
      <div><b>${esc(g.name)}</b> <span class="badge">în curând</span><div class="sub">${esc(g.description)}</div></div>
    </div>`).join("")}</div>`;
});
