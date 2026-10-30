// TVA: din aceeași sumă arată și „plus TVA", și „TVA-ul din ea".
const RATES = [21, 11];
const lei = x => `${(Math.round(x * 100) / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;

export default {
  id: "tva",
  name: "TVA",
  icon: "🧾",
  description: "Adaugă sau scoate TVA (21%, 11%)",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <input id="t-val" type="number" value="100" step="any" min="0">
      <div class="tabs">${RATES.map((r, i) => `<button type="button" data-r="${r}" class="${i ? "" : "on"}">${r}%</button>`).join("")}</div>
      <table id="t-tbl" class="tbl"></table>
      <div class="sub">21% e cota standard, 11% cea redusă (mâncare, medicamente, cărți, cazare).</div>
    </div>`;
    const $ = s => el.querySelector(s);
    let rate = RATES[0];
    const run = () => {
      const v = parseFloat($("#t-val").value) || 0, k = rate / 100;
      $("#t-tbl").innerHTML = `
        <tr><th class="l" colspan="2">Suma e fără TVA</th></tr>
        <tr><td class="l">TVA ${rate}%</td><td>${lei(v * k)}</td></tr>
        <tr><td class="l"><b>Total cu TVA</b></td><td><b>${lei(v * (1 + k))}</b></td></tr>
        <tr><th class="l" colspan="2">Suma e cu TVA inclus</th></tr>
        <tr><td class="l">TVA din ea</td><td>${lei(v - v / (1 + k))}</td></tr>
        <tr><td class="l"><b>Fără TVA</b></td><td><b>${lei(v / (1 + k))}</b></td></tr>`;
    };
    el.querySelectorAll("[data-r]").forEach(b => b.addEventListener("click", () => {
      rate = +b.dataset.r;
      el.querySelectorAll("[data-r]").forEach(x => x.classList.toggle("on", x === b));
      run();
    }));
    $("#t-val").addEventListener("input", run);
    run();
  },
};
