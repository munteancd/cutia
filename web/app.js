// Shell-ul: meniul, rutarea pe #/<id> și playerul comun (radioul nu se oprește
// când schimbi categoria).

const ORDER = ["acasa", "bookmarks", "unelte", "print3d", "sport", "radio", "tv"];
const sections = new Map();
const view = document.getElementById("view");
const navList = document.getElementById("nav-list");

export function registerSection(id, title, icon, render) {
  sections.set(id, { title, icon, render });
  drawNav();
  route();
}

function drawNav() {
  navList.innerHTML = "";
  for (const id of ORDER) {
    const s = sections.get(id);
    if (!s) continue;
    const li = document.createElement("li");
    li.innerHTML = `<a href="#/${id}" data-id="${id}"><span class="ico">${s.icon}</span><span>${s.title}</span></a>`;
    navList.append(li);
  }
  markActive();
}

function current() {
  const id = location.hash.replace(/^#\//, "").split("?")[0] || "acasa";
  return sections.has(id) ? id : "acasa";
}

function markActive() {
  const id = current();
  navList.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.id === id));
}

let shown = null;
async function route() {
  const id = current();
  markActive();
  if (id === shown || !sections.has(id)) return;
  shown = id;
  view.innerHTML = "";
  document.title = `${sections.get(id).title} · Cutia`;
  await sections.get(id).render(view);
}
window.addEventListener("hashchange", () => { shown = null; route(); });

export function isShown(id) { return shown === id; }

export async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- player comun (radio) ----
const bar = document.getElementById("player");
const audio = document.getElementById("player-audio");
const nameEl = document.getElementById("player-name");
let onStop = null;

export function play({ name, url, kind = "audio", hls = null }) {
  stop();
  bar.hidden = false;
  nameEl.textContent = `▶ ${name}`;
  if (hls) { onStop = hls(audio); }
  else { audio.src = url; }
  audio.play().catch(() => { nameEl.textContent = `${name} — indisponibil`; });
}

export function stop() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  if (onStop) { onStop(); onStop = null; }
  bar.hidden = true;
}
audio.addEventListener("error", () => {
  if (!bar.hidden && audio.getAttribute("src")) nameEl.textContent = nameEl.textContent.replace("▶ ", "") + " — indisponibil";
});
document.getElementById("player-stop").addEventListener("click", stop);
