import { api, esc, play, registerSection } from "../app.js";

registerSection("radio", "Radio", "📻", async el => {
  const stations = await api("/api/radio").catch(() => []);
  const groups = [...new Set(stations.map(s => s.group))];
  el.innerHTML = `<h1>Radio</h1>${groups.map(g => `<h2>${esc(g)}</h2><div class="stations">${
    stations.map((s, i) => s.group !== g ? "" :
      `<button type="button" class="station" data-i="${i}">▶ ${esc(s.name)}</button>`).join("")
  }</div>`).join("")}`;
  el.addEventListener("click", e => {
    const b = e.target.closest(".station");
    if (!b) return;
    const s = stations[+b.dataset.i];
    play({ name: s.name, url: s.play });
  });
});
