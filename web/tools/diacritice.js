// Diacritice: ş/ţ cu sedilă → ș/ț (pe loc, în browser) sau toate diacriticele lipsă (prin Gemini, pe server).
const CEDILLA = { "ş": "ș", "ţ": "ț", "Ş": "Ș", "Ţ": "Ț" };
const fixCedilla = t => t.replace(/[şţŞŢ]/g, c => CEDILLA[c]);

export default {
  id: "diacritice",
  name: "Diacritice",
  icon: "🇷🇴",
  description: "Pune diacriticele lipsă, repară ş/ţ în ș/ț",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <textarea id="d-in" class="ocr-out" placeholder="Lipește textul aici."></textarea>
      <div class="tabs"><button type="button" id="d-ai" class="on">Pune diacriticele</button>
        <button type="button" id="d-ced">Doar ş/ţ → ș/ț</button></div>
      <div id="d-note" class="sub">„Pune diacriticele” trimite textul la Gemini (Google). „Doar ş/ţ” se face aici, fără internet.</div>
      <textarea id="d-out" class="ocr-out" hidden></textarea>
      <button id="d-copy" type="button" class="player-btn" hidden>Copiază textul</button>
    </div>`;
    const $ = s => el.querySelector(s);
    const show = (text, note) => {
      $("#d-out").value = text; $("#d-out").hidden = $("#d-copy").hidden = false; $("#d-note").textContent = note;
    };
    $("#d-ced").addEventListener("click", () => {
      const t = $("#d-in").value, out = fixCedilla(t);
      const n = [...t].filter(c => CEDILLA[c]).length;
      show(out, n ? `Am înlocuit ${n} ${n === 1 ? "literă" : "litere"}.` : "N-am găsit ş/ţ cu sedilă.");
    });
    $("#d-ai").addEventListener("click", async () => {
      const text = $("#d-in").value;
      if (!text.trim()) return;
      $("#d-note").textContent = "Se pun diacriticele…";
      try {
        const r = await fetch("/api/diacritice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
        if (!r.ok) throw new Error();
        show((await r.json()).text, "Gata. Citește-l o dată: unde un cuvânt poate fi și cu, și fără (ex. „fata/fată”), Gemini a ghicit din context.");
      } catch {
        $("#d-note").textContent = "N-a mers acum (Gemini sau serverul). Încearcă din nou peste puțin.";
      }
    });
    $("#d-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#d-out").value); $("#d-note").textContent = "Copiat."; }
      catch { $("#d-out").select(); }
    });
  },
};
