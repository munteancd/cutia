// Zile între două date (și câte sunt de luni până vineri) + ce dată e peste N zile.
const DAY = 864e5;
const iso = d => d.toISOString().slice(0, 10);
const utc = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const nice = t => new Date(t).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function weekdays(a, b) { // zile luni–vineri în (a, b]
  let n = 0;
  for (let t = a + DAY; t <= b; t += DAY) { const w = new Date(t).getUTCDay(); if (w && w !== 6) n++; }
  return n;
}

export default {
  id: "zile",
  name: "Zile între date",
  icon: "📅",
  description: "Câte zile sunt între două date, ce dată e peste N zile",
  mount(el) {
    const today = iso(new Date(Date.now() - new Date().getTimezoneOffset() * 6e4));
    el.innerHTML = `<div class="tool-form">
      <h2>Între două date</h2>
      <div><input id="z-a" type="date" class="date" value="${today}"> → <input id="z-b" type="date" class="date" value="${today}"></div>
      <div id="z-diff" class="big"></div><div id="z-diff-sub" class="sub"></div>
      <h2>Peste câteva zile</h2>
      <div><input id="z-c" type="date" class="date" value="${today}"> + <input id="z-n" type="number" value="30" step="1"> zile</div>
      <div id="z-add" class="big"></div>
    </div>`;
    const $ = s => el.querySelector(s);
    const run = () => {
      if ($("#z-a").value && $("#z-b").value) {
        let a = utc($("#z-a").value), b = utc($("#z-b").value);
        const days = Math.round((b - a) / DAY);
        if (a > b) [a, b] = [b, a];
        const w = Math.floor(Math.abs(days) / 7);
        $("#z-diff").textContent = `${Math.abs(days)} ${Math.abs(days) === 1 ? "zi" : "zile"}${days < 0 ? " în urmă" : ""}`;
        $("#z-diff-sub").textContent = `${w} săptămâni și ${Math.abs(days) % 7} zile · ${weekdays(a, b)} zile de luni până vineri (fără sărbători)`;
      }
      if ($("#z-c").value) $("#z-add").textContent = nice(utc($("#z-c").value) + (parseInt($("#z-n").value) || 0) * DAY);
    };
    el.querySelectorAll("input").forEach(x => x.addEventListener("input", run));
    run();
  },
};
