// Convertor de unități: lungime, masă, volum (factori față de unitatea de bază),
// temperatură (formule) și valută (cursul BCE de azi, de la frankfurter.dev).
const LINEAR = {
  Lungime: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, ft: 0.3048, yd: 0.9144, milă: 1609.344 },
  Masă: { g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 },
  Volum: { ml: 0.001, l: 1, "m³": 1000, "fl oz": 0.0295735, galon: 3.785411784 },
};
const TEMP = {
  "°C": { to: c => c, from: c => c },
  "°F": { to: f => (f - 32) * 5 / 9, from: c => c * 9 / 5 + 32 },
  K: { to: k => k - 273.15, from: c => c + 273.15 },
};
const FX_URL = "https://api.frankfurter.dev/v1/latest?base=EUR";
const FX_FIRST = ["RON", "EUR", "USD", "GBP", "CHF", "HUF"];
let fx = null; // { date, rates: { EUR: 1, RON: 0.19…, … } } — câți EUR face o unitate

async function loadFx() {
  if (fx) return fx;
  const d = await (await fetch(FX_URL)).json();
  const codes = ["EUR", ...Object.keys(d.rates)];
  codes.sort((a, b) => (FX_FIRST.indexOf(a) + 1 || 99) - (FX_FIRST.indexOf(b) + 1 || 99) || a.localeCompare(b));
  fx = { date: d.date, rates: Object.fromEntries(codes.map(c => [c, c === "EUR" ? 1 : 1 / d.rates[c]])) };
  return fx;
}

export function convert(kind, value, from, to) {
  if (kind === "Temperatură") return TEMP[to].from(TEMP[from].to(value));
  const t = kind === "Valută" ? fx.rates : LINEAR[kind];
  return value * t[from] / t[to];
}

const units = kind => Object.keys(kind === "Temperatură" ? TEMP : kind === "Valută" ? fx.rates : LINEAR[kind]);
const nice = x => Number.isFinite(x) ? (+x.toPrecision(8)).toLocaleString("ro-RO", { maximumFractionDigits: 6 }) : "—";

export default {
  id: "unitati",
  name: "Convertor de unități",
  icon: "📏",
  description: "Lungime, masă, volum, temperatură, valută",
  mount(el) {
    const kinds = ["Valută", ...Object.keys(LINEAR), "Temperatură"];
    el.innerHTML = `<div class="tool-form">
      <select id="u-kind">${kinds.map(k => `<option>${k}</option>`).join("")}</select>
      <input id="u-val" type="number" value="1" step="any">
      <select id="u-from"></select><span>→</span><select id="u-to"></select>
      <div id="u-out" class="big"></div><div id="u-note" class="sub"></div></div>`;
    const $ = id => el.querySelector(id);
    const fill = async () => {
      const kind = $("#u-kind").value;
      $("#u-note").textContent = "";
      if (kind === "Valută") {
        $("#u-out").textContent = "Se încarcă cursul…";
        try { await loadFx(); } catch { $("#u-out").textContent = "Cursul nu se poate încărca."; return; }
        $("#u-note").textContent = `Curs BCE din ${fx.date.split("-").reverse().join(".")}`;
      }
      const u = units(kind);
      $("#u-from").innerHTML = $("#u-to").innerHTML = u.map(x => `<option>${x}</option>`).join("");
      $("#u-to").selectedIndex = Math.min(1, u.length - 1);
      run();
    };
    const run = () => {
      const v = parseFloat($("#u-val").value.replace(",", "."));
      $("#u-out").textContent = `${nice(convert($("#u-kind").value, v, $("#u-from").value, $("#u-to").value))} ${$("#u-to").value}`;
    };
    $("#u-kind").addEventListener("change", fill);
    el.querySelectorAll("#u-val, #u-from, #u-to").forEach(x => x.addEventListener("input", run));
    fill();
  },
};
