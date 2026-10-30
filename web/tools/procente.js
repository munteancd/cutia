// Procente: trei întrebări obișnuite, fiecare cu rezultatul pe loc.
const fmt = x => Number.isFinite(x) ? (+x.toFixed(4)).toLocaleString("ro-RO") : "—";
const ROWS = [
  { a: "Cât e", b: "% din", calc: (x, y) => fmt(x / 100 * y) },
  { a: "", b: "e câte procente din", calc: (x, y) => `${fmt(x / y * 100)}%` },
  { a: "De la", b: "la", calc: (x, y) => { const p = (y - x) / x * 100; return `${p > 0 ? "+" : ""}${fmt(p)}%`; } },
];

export default {
  id: "procente",
  name: "Procente",
  icon: "％",
  description: "Cât e X% din Y, cu cât a crescut ceva",
  mount(el) {
    el.innerHTML = `<div class="tool-form pct">${ROWS.map((r, i) => `<div class="pct-row">
      ${r.a}<input type="number" step="any" data-i="${i}" data-k="x" value="${[20, 50, 100][i]}">
      ${r.b}<input type="number" step="any" data-i="${i}" data-k="y" value="${[150, 200, 120][i]}">
      = <b data-out="${i}"></b></div>`).join("")}</div>`;
    const run = () => ROWS.forEach((r, i) => {
      const v = k => parseFloat(el.querySelector(`[data-i="${i}"][data-k="${k}"]`).value);
      el.querySelector(`[data-out="${i}"]`).textContent = r.calc(v("x"), v("y"));
    });
    el.querySelectorAll("input").forEach(x => x.addEventListener("input", run));
    run();
  },
};
