import { api, esc, play, registerSection } from "../app.js";

registerSection("radio", "Radio", "📻", async el => {
  const stations = await api("/api/radio").catch(() => []);
  const groups = [...new Set(stations.map(s => s.group))];
  // butoanele de sus sar la gen (nu folosim #ancore, hash-ul e pentru rute)
  el.innerHTML = `<h1>Radio</h1>
    <div class="genres">${groups.map((g, gi) => `<button type="button" data-go="${gi}">${esc(g)}</button>`).join("")}</div>
    ${groups.map((g, gi) => `<h2 id="rg-${gi}">${esc(g)}</h2><div class="stations">${
    stations.map((s, i) => s.group !== g ? "" :
      `<button type="button" class="station" data-i="${i}">▶ ${esc(s.name)}</button>`).join("")
  }</div>`).join("")}`;
  el.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if (go) { el.querySelector(`#rg-${go.dataset.go}`).scrollIntoView({ behavior: "smooth" }); return; }
    const b = e.target.closest(".station");
    if (!b) return;
    const s = stations[+b.dataset.i];
    play({ name: s.name, url: s.play });
  });
});
