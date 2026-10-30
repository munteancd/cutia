import { api, esc, registerSection } from "../app.js";

registerSection("print3d", "3D Print", "🧊", async el => {
  const items = await api("/api/print3d").catch(() => []);
  el.innerHTML = `<h1>3D Print</h1><div class="cards cards-img">${items.map(i => `
    <a class="card card-img" href="${esc(i.url)}" target="_blank" rel="noopener">
      <img src="img/print3d/${esc(i.image)}" alt="" loading="lazy">
      <div><b>${esc(i.name)}</b><div class="sub">${esc(i.description)}</div></div>
    </a>`).join("")}</div>`;
});
