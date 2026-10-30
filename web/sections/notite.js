import { api, esc, isShown, registerSection } from "../app.js";

// Notițe pe server (le vezi la fel pe PC și pe telefon), salvate singure cât scrii.
// Un rând „[ ] ceva" e o căsuță de bifat: în modul citire o bifezi cu un click.
// Sus: clipboardul comun — ce lipești pe un aparat apare pe celălalt.
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const put = (url, body) => fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const titleOf = n => n.title.trim() || n.body.trim().split("\n")[0].replace(/^\[[ x]\] /, "").slice(0, 40) || "Notiță goală";

function rendered(body) {
  if (!body.trim()) return `<div class="sub">Notiță goală — click ca să scrii.</div>`;
  return body.split("\n").map((line, i) => {
    const m = line.match(/^\[( |x)\] ?(.*)$/i);
    return m ? `<label class="check${m[1] !== " " ? " done" : ""}"><input type="checkbox" data-line="${i}" ${m[1] !== " " ? "checked" : ""}> ${esc(m[2])}</label>`
             : `<div>${esc(line) || "&nbsp;"}</div>`;
  }).join("");
}

let timers = [];
registerSection("notite", "Notițe", "📝", async el => {
  timers.forEach(clearInterval);
  el.innerHTML = `<h1>Notițe</h1>
    <div class="clip"><div class="label">Clipboard comun PC ↔ telefon</div>
      <textarea id="c-text" rows="2" placeholder="Lipește aici un link sau un text și îl iei de pe celălalt aparat."></textarea>
      <div class="tabs"><button type="button" id="c-paste">Lipește</button><button type="button" id="c-copy">Copiază</button>
        <button type="button" id="c-clear">Golește</button><span id="c-note" class="sub"></span></div></div>
    <div class="notes">
      <div class="note-list"><button type="button" id="n-new" class="player-btn">+ Notiță nouă</button><div id="n-list"></div></div>
      <div class="note-ed" id="n-ed" hidden>
        <input id="n-title" class="search" placeholder="Titlu" maxlength="200">
        <div id="n-view" class="note-view"></div>
        <textarea id="n-body" class="ocr-out" hidden placeholder="Scrie aici. Un rând care începe cu [ ] devine căsuță de bifat."></textarea>
        <div class="tabs"><span id="n-saved" class="sub"></span><button type="button" id="n-del">Șterge notița</button></div>
      </div>
    </div>`;
  const $ = s => el.querySelector(s);
  let list = [], cur = null, saveTimer = null;

  // --- clipboard ---
  let clipAt = 0;
  const clipNote = t => { $("#c-note").textContent = t; };
  async function pullClip() {
    if (document.activeElement === $("#c-text")) return; // nu-ți schimbăm textul cât scrii
    const c = await api("/api/clip").catch(() => null);
    if (c && c.updated !== clipAt) { clipAt = c.updated; $("#c-text").value = c.text; }
  }
  const pushClip = async () => { const c = await (await put("/api/clip", { text: $("#c-text").value })).json(); clipAt = c.updated; clipNote("Salvat."); };
  $("#c-text").addEventListener("input", () => { clearTimeout(pushClip.t); pushClip.t = setTimeout(pushClip, 600); });
  $("#c-paste").addEventListener("click", async () => {
    try { $("#c-text").value = await navigator.clipboard.readText(); await pushClip(); }
    catch { clipNote("Browserul n-a dat voie: lipește cu Ctrl+V în căsuță."); }
  });
  $("#c-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#c-text").value); clipNote("Copiat."); }
    catch { $("#c-text").select(); clipNote("Selectat — apasă Ctrl+C."); }
  });
  $("#c-clear").addEventListener("click", () => { $("#c-text").value = ""; pushClip(); });

  // --- notițe ---
  const drawList = () => {
    $("#n-list").innerHTML = list.map(n => `<button type="button" class="note-item${cur && n.id === cur.id ? " on" : ""}" data-id="${n.id}">
      <b>${esc(titleOf(n))}</b><span class="sub">${new Date(n.updated * 1000).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}</span></button>`).join("")
      || `<div class="sub">Nicio notiță încă.</div>`;
  };
  const showView = () => { $("#n-view").innerHTML = rendered(cur.body); $("#n-view").hidden = false; $("#n-body").hidden = true; };
  const showEdit = () => { $("#n-view").hidden = true; $("#n-body").hidden = false; $("#n-body").focus(); };
  function open(n, edit) {
    cur = { ...n };
    $("#n-ed").hidden = false;
    $("#n-title").value = n.title; $("#n-body").value = n.body;
    edit ? showEdit() : showView();
    drawList();
  }
  async function save() {
    clearTimeout(saveTimer);
    if (!cur) return;
    const n = await (await put(`/api/notes/${cur.id}`, { title: cur.title, body: cur.body })).json();
    cur.updated = n.updated;
    list = [n, ...list.filter(x => x.id !== n.id)];
    $("#n-saved").textContent = "Salvat."; drawList();
  }
  const later = () => { $("#n-saved").textContent = "…"; clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); };
  async function pullNotes() {
    if (document.activeElement === $("#n-body") || document.activeElement === $("#n-title") || saveTimer && $("#n-saved").textContent === "…") return;
    list = await api("/api/notes").catch(() => list);
    const fresh = cur && list.find(n => n.id === cur.id);
    if (fresh && fresh.updated !== cur.updated) open(fresh, false); // schimbată pe celălalt aparat
    drawList();
  }

  $("#n-new").addEventListener("click", () => {
    const n = { id: newId(), title: "", body: "", updated: Date.now() / 1000 };
    list.unshift(n); open(n, true);
  });
  $("#n-list").addEventListener("click", e => {
    const b = e.target.closest("[data-id]");
    if (b) { save(); open(list.find(n => n.id === b.dataset.id), false); }
  });
  $("#n-title").addEventListener("input", e => { cur.title = e.target.value; later(); });
  $("#n-body").addEventListener("input", e => { cur.body = e.target.value; later(); });
  $("#n-body").addEventListener("blur", () => { save(); showView(); });
  $("#n-view").addEventListener("click", e => {
    const box = e.target.closest("input[data-line]");
    if (!box) { if (!e.target.closest("label")) showEdit(); return; }
    const lines = cur.body.split("\n"), i = +box.dataset.line;
    lines[i] = lines[i].replace(/^\[( |x)\]/i, box.checked ? "[x]" : "[ ]");
    cur.body = lines.join("\n"); $("#n-body").value = cur.body;
    showView(); save();
  });
  $("#n-del").addEventListener("click", async () => {
    if (!cur || !confirm(`Ștergi notița „${titleOf(cur)}”?`)) return;
    await fetch(`/api/notes/${cur.id}`, { method: "DELETE" });
    list = list.filter(n => n.id !== cur.id); cur = null;
    $("#n-ed").hidden = true; drawList();
  });

  list = await api("/api/notes").catch(() => []);
  drawList();
  if (list[0]) open(list[0], false);
  await pullClip();
  // ce schimbi pe telefon apare aici în câteva secunde (și invers)
  timers = [setInterval(() => { if (isShown("notite") && !document.hidden) { pullClip(); pullNotes(); } }, 5000)];
});
