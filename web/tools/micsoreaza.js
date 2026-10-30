// Micșorează un PDF: fiecare pagină redesenată ca poză JPG, la calitatea aleasă.
// Ajută la scanări și PDF-uri cu poze; textul nu mai poate fi selectat după.
import { pdfjs, pdflib, readBytes, canvasBlob, download, renamed, size } from "./lib.js";

const LEVELS = { // dpi, calitate JPG
  "Puternic": [100, 0.5],
  "Mediu": [150, 0.65],
  "Ușor": [200, 0.8],
};

export default {
  id: "micsoreaza",
  name: "Micșorează un PDF",
  icon: "🗜️",
  description: "PDF scanat prea mare → unul mai mic",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <label class="player-btn">Alege PDF-ul<input id="m-in" type="file" accept="application/pdf" hidden></label>
      <div class="tabs">${Object.keys(LEVELS).map((l, i) => `<button type="button" data-l="${l}" class="${i === 1 ? "on" : ""}">${l}</button>`).join("")}</div>
      <div id="m-note" class="sub">Merge bine la acte scanate și PDF-uri cu poze. După micșorare, textul nu se mai poate selecta.</div>
      <div id="m-out" class="big"></div>
      <button id="m-dl" type="button" class="player-btn" hidden>Descarcă</button>
    </div>`;
    const $ = s => el.querySelector(s);
    let level = "Mediu", file = null, result = null, run = 0;

    const go = async () => {
      if (!file) return;
      const me = ++run; // dacă schimbi nivelul la jumătate, rularea veche se oprește
      $("#m-dl").hidden = true; $("#m-out").textContent = "";
      const [dpi, q] = LEVELS[level];
      try {
        const lib = await pdfjs(), { PDFDocument } = await pdflib();
        const doc = await lib.getDocument({ data: await readBytes(file) }).promise;
        const out = await PDFDocument.create();
        for (let n = 1; n <= doc.numPages; n++) {
          if (me !== run) return;
          $("#m-note").textContent = `Pagina ${n} din ${doc.numPages}…`;
          const page = await doc.getPage(n), pt = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: dpi / 72 });
          const c = Object.assign(document.createElement("canvas"), { width: vp.width, height: vp.height });
          const x = c.getContext("2d");
          x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: x, viewport: vp }).promise;
          const jpg = await out.embedJpg(await (await canvasBlob(c, "image/jpeg", q)).arrayBuffer());
          out.addPage([pt.width, pt.height]).drawImage(jpg, { x: 0, y: 0, width: pt.width, height: pt.height });
        }
        if (me !== run) return;
        result = await out.save();
        const saved = 1 - result.length / file.size;
        $("#m-out").textContent = `${size(file.size)} → ${size(result.length)}`;
        $("#m-note").textContent = saved > 0.05 ? `Cu ${Math.round(saved * 100)}% mai mic.`
          : "N-a ieșit mai mic: PDF-ul e deja mic sau are mai mult text. Păstrează-l pe cel original.";
        $("#m-dl").hidden = saved <= 0.05;
      } catch {
        $("#m-note").textContent = "PDF-ul nu se poate deschide (e stricat sau are parolă).";
      }
    };
    $("#m-in").addEventListener("change", e => { file = e.target.files[0] || null; go(); });
    el.querySelectorAll("[data-l]").forEach(b => b.addEventListener("click", () => {
      level = b.dataset.l;
      el.querySelectorAll("[data-l]").forEach(x => x.classList.toggle("on", x === b));
      go();
    }));
    $("#m-dl").addEventListener("click", () => download(result, renamed(file.name, "-mic", ".pdf")));
  },
};
