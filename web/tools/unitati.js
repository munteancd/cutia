// Convertor de unități: lungime, masă, volum (factori față de unitatea de bază)
// și temperatură (formule).
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

export function convert(kind, value, from, to) {
  if (kind === "Temperatură") return TEMP[to].from(TEMP[from].to(value));
  const t = LINEAR[kind];
  return value * t[from] / t[to];
}

const units = kind => Object.keys(kind === "Temperatură" ? TEMP : LINEAR[kind]);
const nice = x => Number.isFinite(x) ? (+x.toPrecision(8)).toLocaleString("ro-RO", { maximumFractionDigits: 6 }) : "—";

export default {
  id: "unitati",
  name: "Convertor de unități",
  icon: "📏",
  description: "Lungime, masă, volum, temperatură",
  mount(el) {
    const kinds = [...Object.keys(LINEAR), "Temperatură"];
    el.innerHTML = `<div class="tool-form">
      <select id="u-kind">${kinds.map(k => `<option>${k}</option>`).join("")}</select>
      <input id="u-val" type="number" value="1" step="any">
      <select id="u-from"></select><span>→</span><select id="u-to"></select>
      <div id="u-out" class="big"></div></div>`;
    const $ = id => el.querySelector(id);
    const fill = () => {
      const u = units($("#u-kind").value);
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
