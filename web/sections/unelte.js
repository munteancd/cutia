import { esc, registerSection } from "../app.js";
import { TOOLS } from "../tools/index.js";

registerSection("unelte", "Unelte", "🛠️", el => {
  const id = new URLSearchParams(location.hash.split("?")[1] || "").get("u");
  const tool = TOOLS.find(t => t.id === id);
  if (tool) {
    el.innerHTML = `<a class="back" href="#/unelte">← Unelte</a><h1>${tool.icon} ${esc(tool.name)}</h1><div id="tool"></div>`;
    tool.mount(el.querySelector("#tool"));
    return;
  }
  el.innerHTML = `<h1>Unelte</h1><div class="cards">${TOOLS.map(t => `
    <a class="card" href="#/unelte?u=${t.id}">
      <div class="card-ico">${t.icon}</div>
      <div><b>${esc(t.name)}</b><div class="sub">${esc(t.description)}</div></div>
    </a>`).join("")}</div>`;
});
