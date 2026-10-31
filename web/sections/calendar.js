import { api, esc, registerSection } from "../app.js";

// Calendar pe zile: click pe o zi = eveniment nou, click pe un eveniment = îl schimbi.
// Otto îți scrie pe WhatsApp seara la 20:00 ce ai mâine și dimineața la 8:30 ce ai azi.
const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const ZILE = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nice = s => { const d = new Date(s + "T12:00"); return d.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" }); };

registerSection("calendar", "Calendar", "📅", async el => {
  const today = iso(new Date());
  let events = [], month = new Date(new Date().getFullYear(), new Date().getMonth(), 1), edit = null;
  el.innerHTML = `<h1>Calendar</h1>
    <div class="cal">
      <div><div class="tabs cal-nav"><button type="button" id="k-prev">‹</button><b id="k-month"></b>
        <button type="button" id="k-next">›</button><button type="button" id="k-today">Azi</button></div>
        <div class="cal-grid" id="k-grid"></div></div>
      <div class="cal-side">
        <form id="k-form" class="cal-form" hidden>
          <div class="label" id="k-day"></div>
          <input name="title" class="search" placeholder="Ce e? (ex. Interviu la …)" maxlength="300" required autocomplete="off">
          <div class="tabs"><input name="time" type="time" class="mini" title="Ora (opțional)">
            <input name="place" class="search" placeholder="Unde? (opțional)" maxlength="300" autocomplete="off"></div>
          <div class="tabs"><button type="submit" class="on">Salvează</button><button type="button" id="k-cancel">Renunță</button>
            <button type="button" id="k-del" hidden>Șterge</button></div>
        </form>
        <div class="label">Urmează</div><div id="k-next-list"></div>
        <div class="sub">Otto îți scrie pe WhatsApp seara la 20:00 ce ai mâine și dimineața la 8:30 ce ai azi.</div>
      </div>
    </div>`;
  const $ = s => el.querySelector(s), form = $("#k-form");

  function drawMonth() {
    $("#k-month").textContent = `${LUNI[month.getMonth()]} ${month.getFullYear()}`;
    const first = (month.getDay() + 6) % 7; // luni = 0
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - first);
    const cells = ZILE.map(z => `<div class="cal-head">${z}</div>`);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), day = iso(d);
      if (i === 35 && d.getMonth() !== month.getMonth()) break; // a șasea săptămână doar dacă trebuie
      const evs = events.filter(e => e.date === day);
      cells.push(`<div class="cal-day${d.getMonth() !== month.getMonth() ? " out" : ""}${day === today ? " today" : ""}${edit?.date === day ? " sel" : ""}" data-day="${day}">
        <span class="n">${d.getDate()}</span>${evs.map(e => `<button type="button" class="cal-ev" data-id="${e.id}">${e.time ? `<b>${e.time}</b> ` : ""}${esc(e.title)}</button>`).join("")}</div>`);
    }
    $("#k-grid").innerHTML = cells.join("");
  }
  function drawNext() {
    const next = events.filter(e => e.date >= today).slice(0, 12);
    $("#k-next-list").innerHTML = next.map(e => `<button type="button" class="note-item" data-id="${e.id}">
      <b>${esc(e.title)}</b><span class="sub">${e.date === today ? "azi" : nice(e.date)}${e.time ? `, ${e.time}` : ""}</span></button>`).join("")
      || `<div class="sub">Nimic pus încă. Dă click pe o zi.</div>`;
  }
  const draw = () => { drawMonth(); drawNext(); };

  function open(ev) {
    edit = ev;
    form.hidden = false;
    $("#k-day").textContent = nice(ev.date);
    form.title.value = ev.title || ""; form.time.value = ev.time || ""; form.place.value = ev.place || "";
    $("#k-del").hidden = !ev.id;
    draw(); form.title.focus();
  }
  const close = () => { edit = null; form.hidden = true; draw(); };
  const load = async () => { events = await api("/api/calendar").catch(() => events); draw(); };

  $("#k-prev").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); drawMonth(); });
  $("#k-next").addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); drawMonth(); });
  $("#k-today").addEventListener("click", () => { month = new Date(new Date().getFullYear(), new Date().getMonth(), 1); drawMonth(); });
  $("#k-grid").addEventListener("click", e => {
    const ev = e.target.closest("[data-id]"), day = e.target.closest("[data-day]");
    if (ev) open(events.find(x => x.id === ev.dataset.id));
    else if (day) open({ date: day.dataset.day });
  });
  $("#k-next-list").addEventListener("click", e => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    const ev = events.find(x => x.id === b.dataset.id);
    month = new Date(+ev.date.slice(0, 4), +ev.date.slice(5, 7) - 1, 1);
    open(ev);
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const id = edit.id || newId();
    const r = await fetch(`/api/calendar/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: edit.date, title: form.title.value, time: form.time.value, place: form.place.value }) });
    if (!r.ok) { $("#k-day").textContent = "N-am putut salva — încearcă din nou."; return; }
    await load(); close();
  });
  $("#k-cancel").addEventListener("click", close);
  $("#k-del").addEventListener("click", async () => {
    if (!confirm(`Ștergi „${edit.title}”?`)) return;
    await fetch(`/api/calendar/${edit.id}`, { method: "DELETE" });
    await load(); close();
  });
  await load();
});
