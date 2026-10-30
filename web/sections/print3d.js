import { api, esc, registerSection } from "../app.js";

// card cu poză (rezultatul real) sau, fără poză, card mic cu iconiță;
// într-un grup cu poze, iconița ține locul pozei ca să nu strice rândul
const card = (i, big) => i.image || big ? `
    <a class="card card-img" href="${esc(i.url)}" target="_blank" rel="noopener">
      ${i.image ? `<img src="img/print3d/${esc(i.image)}" alt="" loading="lazy">`
                : `<div class="card-ph">${esc(i.icon || "🧊")}</div>`}
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
    const big = list.some(i => i.image);
    return `${g ? `<h2>${esc(g)}</h2>` : ""}<div class="cards${big ? " cards-img" : ""}">${list.map(i => card(i, big)).join("")}</div>`;
  }).join("")}`;
});
