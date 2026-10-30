import { api, esc, registerSection } from "../app.js";

// card cu poză (rezultatul real) sau, fără poză, card mic cu iconiță
const card = i => i.image ? `
    <a class="card card-img" href="${esc(i.url)}" target="_blank" rel="noopener">
      <img src="img/print3d/${esc(i.image)}" alt="" loading="lazy">
      <div><b>${esc(i.name)}</b><div class="sub">${esc(i.description)}</div></div>
    </a>` : `
    <a class="card" href="${esc(i.url)}" target="_blank" rel="noopener">
      <div class="card-ico">${esc(i.icon || "🧊")}</div>
      <div><b>${esc(i.name)}</b><div class="sub">${esc(i.description)}</div></div>
    </a>`;

registerSection("print3d", "3D Print", "🧊", async el => {
  const items = await api("/api/print3d").catch(() => []);
  const groups = [...new Set(items.map(i => i.group || ""))];
  el.innerHTML = `<h1>3D Print</h1>${groups.map(g => {
    const list = items.filter(i => (i.group || "") === g);
    return `${g ? `<h2>${esc(g)}</h2>` : ""}<div class="cards${list.some(i => i.image) ? " cards-img" : ""}">${list.map(card).join("")}</div>`;
  }).join("")}`;
});
