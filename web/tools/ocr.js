// Text din poză (OCR) cu Tesseract, în browser. Merge și pe PDF-uri scanate (pagină cu pagină)
// și pe o captură lipită cu Ctrl+V. Prima dată descarcă ~2–5 MB de date pentru limbă.
import { loadScript, pdfjs, readBytes, openableImage, IMAGE_ACCEPT } from "./lib.js";

// doar „ron" citește mai bine ș/ț decât „ron+eng" (care le confundă cu s/t)
const LANGS = { "Română": "ron", "Română + engleză": "ron+eng", "Engleză": "eng" };
let worker = null, workerLangs = "";

async function getWorker(langs, progress) {
  if (worker && workerLangs === langs) return worker;
  await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
  if (worker) await worker.terminate();
  worker = await window.Tesseract.createWorker(langs, 1, { logger: m => progress(m) });
  workerLangs = langs;
  return worker;
}

export default {
  id: "ocr",
  name: "Text din poză",
  icon: "🔤",
  description: "Scoate textul dintr-o poză sau un PDF scanat",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <div id="o-drop" class="drop">Trage aici o poză sau un PDF, lipește o captură cu <b>Ctrl+V</b>, sau
        <label class="link">alege fișierul<input id="o-in" type="file" accept="${IMAGE_ACCEPT},application/pdf" hidden></label></div>
      <div class="tabs">${Object.keys(LANGS).map((l, i) => `<button type="button" data-l="${l}" class="${i ? "" : "on"}">${l}</button>`).join("")}</div>
      <div id="o-note" class="sub"></div>
      <textarea id="o-out" class="ocr-out" placeholder="Textul apare aici." hidden></textarea>
      <button id="o-copy" type="button" class="player-btn" hidden>Copiază textul</button>
    </div>`;
    const $ = s => el.querySelector(s);
    let lang = "Română", last = null, busy = false;

    const note = t => { $("#o-note").textContent = t; };
    const progress = m => {
      if (m.status === "recognizing text") return;
      if (/load|initializ/.test(m.status)) note(`Se pregătește limba (prima dată durează puțin)… ${Math.round((m.progress || 0) * 100)}%`);
    };

    async function run(file) {
      if (busy || !file) return;
      busy = true; last = file;
      $("#o-out").hidden = $("#o-copy").hidden = true;
      try {
        const w = await getWorker(LANGS[lang], progress);
        const texts = [];
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const doc = await (await pdfjs()).getDocument({ data: await readBytes(file) }).promise;
          for (let n = 1; n <= doc.numPages; n++) {
            note(`Citesc pagina ${n} din ${doc.numPages}…`);
            const page = await doc.getPage(n), vp = page.getViewport({ scale: 200 / 72 });
            const c = Object.assign(document.createElement("canvas"), { width: vp.width, height: vp.height });
            await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
            const { data } = await w.recognize(c);
            texts.push(doc.numPages > 1 ? `— pagina ${n} —\n${data.text.trim()}` : data.text.trim());
          }
        } else {
          note("Citesc textul…");
          const { data } = await w.recognize(await openableImage(file));
          texts.push(data.text.trim());
        }
        // Tesseract scoate ş/ţ cu sedilă; în română corect e cu virgulă (ș/ț)
        const text = texts.join("\n\n").replace(/[şţŞŢ]/g, c => ({ "ş": "ș", "ţ": "ț", "Ş": "Ș", "Ţ": "Ț" })[c]);
        $("#o-out").value = text;
        $("#o-out").hidden = $("#o-copy").hidden = false;
        note(text ? "Gata. Verifică textul, OCR-ul mai greșește la scris de mână sau poze strâmbe." : "N-am găsit text în poză.");
      } catch {
        note("Fișierul nu se poate citi.");
      }
      busy = false;
    }

    $("#o-in").addEventListener("change", e => { run(e.target.files[0]); e.target.value = ""; });
    const drop = $("#o-drop");
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); run(e.dataTransfer.files[0]); });
    // Ctrl+V oriunde pe pagină, cât timp unealta e deschisă
    const paste = e => {
      if (!el.isConnected) { document.removeEventListener("paste", paste); return; }
      const f = [...e.clipboardData.files].find(f => f.type.startsWith("image/"));
      if (f) { e.preventDefault(); run(f); }
    };
    document.addEventListener("paste", paste);
    el.querySelectorAll("[data-l]").forEach(b => b.addEventListener("click", () => {
      lang = b.dataset.l;
      el.querySelectorAll("[data-l]").forEach(x => x.classList.toggle("on", x === b));
      if (last) run(last);
    }));
    $("#o-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#o-out").value); note("Copiat."); }
      catch { $("#o-out").select(); note("Selectat — apasă Ctrl+C."); }
    });
  },
};
