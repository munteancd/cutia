// Salariu brut ↔ net, regulile din 2026 (de la 1 iulie: minim 4.325 lei, 200 lei netaxabili la minim).
// La schimbări de lege se modifică doar RULES.
const RULES = {
  from: "1 iulie 2026",
  minWage: 4325,
  untaxed: 200, untaxedMaxGross: 4600, // suma netaxabilă, dacă salariul de bază e cel minim
  cas: 0.25, cass: 0.10, tax: 0.10, cam: 0.0225,
  deduction: [0.20, 0.25, 0.30, 0.35, 0.45], // din salariul minim, după nr. de persoane în întreținere (4+)
};
const R = Math.round;

// deducerea personală scade cu 0,5% din minim la fiecare 50 lei peste minim, până la minim + 2.000
function deduction(gross, dependents) {
  if (gross > RULES.minWage + 2000) return 0;
  const steps = Math.max(0, Math.ceil((gross - RULES.minWage) / 50));
  return R(RULES.minWage * Math.max(0, RULES.deduction[Math.min(dependents, 4)] - steps * 0.005));
}

export function net(gross, dependents = 0, atMinimum = false) {
  const free = atMinimum && gross <= RULES.untaxedMaxGross ? RULES.untaxed : 0;
  const cas = R((gross - free) * RULES.cas), cass = R((gross - free) * RULES.cass);
  const ded = deduction(gross, dependents);
  const tax = R(Math.max(0, gross - free - cas - cass - ded) * RULES.tax);
  return { gross, free, cas, cass, ded, tax, net: gross - cas - cass - tax, cost: gross + R(gross * RULES.cam) };
}

// net → brut: cel mai mic brut întreg care dă cel puțin netul cerut
function grossFor(target, dependents, atMinimum) {
  let lo = Math.floor(target), hi = Math.ceil(target * 2) + 10;
  while (lo < hi) { const m = (lo + hi) >> 1; net(m, dependents, atMinimum).net >= target ? hi = m : lo = m + 1; }
  return lo;
}

const lei = x => `${x.toLocaleString("ro-RO")} lei`;

export default {
  id: "salariu",
  name: "Salariu brut ↔ net",
  icon: "💵",
  description: "Cât iei în mână din brut, și invers",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <div class="tabs"><button type="button" data-d="net" class="on">Am brutul</button><button type="button" data-d="gross">Am netul</button></div>
      <input id="w-val" type="number" value="${RULES.minWage}" step="1" min="0">
      <select id="w-dep">${["Fără persoane în întreținere", "1 persoană în întreținere", "2 persoane", "3 persoane", "4 sau mai multe"]
        .map((t, i) => `<option value="${i}">${t}</option>`).join("")}</select>
      <label id="w-min-row" class="sub"><input id="w-min" type="checkbox" checked> salariul de bază e cel minim (${lei(RULES.minWage)})</label>
      <div id="w-out" class="big"></div>
      <table id="w-tbl" class="tbl"></table>
      <div class="sub">Reguli de la ${RULES.from}: CAS 25%, CASS 10%, impozit 10%. Pentru acte oficiale verifică și pe fluturaș.</div>
    </div>`;
    const $ = s => el.querySelector(s);
    let dir = "net";
    const run = () => {
      const v = +$("#w-val").value || 0, dep = +$("#w-dep").value, min = $("#w-min").checked;
      const r = net(dir === "net" ? v : grossFor(v, dep, min), dep, min);
      // bifa contează doar între minim și plafonul de 4.600 lei
      $("#w-min-row").hidden = r.gross < RULES.minWage || r.gross > RULES.untaxedMaxGross;
      $("#w-out").textContent = dir === "net" ? `${lei(r.net)} în mână` : `${lei(r.gross)} brut`;
      $("#w-tbl").innerHTML = [
        ["Brut", r.gross], ["CAS (pensie) 25%", -r.cas], ["CASS (sănătate) 10%", -r.cass],
        ["Impozit 10%", -r.tax], ["Net", r.net],
        ["deducere personală (scutită de impozit)", r.ded], ...(r.free ? [["sumă netaxabilă", r.free]] : []),
        ["Cost total pentru firmă (+2,25%)", r.cost],
      ].map(([k, x]) => `<tr><td class="l">${k}</td><td>${lei(x)}</td></tr>`).join("");
    };
    el.querySelectorAll("[data-d]").forEach(b => b.addEventListener("click", () => {
      dir = b.dataset.d;
      el.querySelectorAll("[data-d]").forEach(x => x.classList.toggle("on", x === b));
      run();
    }));
    el.querySelectorAll("input, select").forEach(x => x.addEventListener("input", run));
    // brut scris de mână: e „la minim" doar dacă e fix minimul
    $("#w-val").addEventListener("input", () => { if (dir === "net") { $("#w-min").checked = +$("#w-val").value === RULES.minWage; run(); } });
    run();
  },
};
