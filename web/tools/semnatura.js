// Semnătură pe PDF: semnătura (PNG) ținută minte în browser, pusă cu click pe pagină,
// mutată/mărită cu mouse-ul; textul (ex. data) se pune ca imagine, ca să aibă diacritice.
import { pdfjs, pdflib, readBytes, loadImage, download, renamed } from "./lib.js";

const KEY = "cutia-semnatura";
const getSig = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const setSig = v => { try { localStorage.setItem(KEY, v); } catch {} };
const today = () => new Date().toLocaleDateString("ro-RO");
const LINE = 1.25;

// orice poză → PNG de max. 1200px (ce se salvează e mereu PNG, cu transparența păstrată)
async function toPng(file) {
  const img = await loadImage(URL.createObjectURL(file));
  const k = Math.min(1, 1200 / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement("canvas"), { width: img.width * k, height: img.height * k });
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

// textul de pe pagină desenat de 4 ori mai mare, ca să fie clar la printat
function textPng(text, fontPx) {
  const f = fontPx * 4, c = document.createElement("canvas"), x = c.getContext("2d");
  const font = `${f}px system-ui, "Segoe UI", sans-serif`;
  x.font = font;
  c.width = Math.ceil(x.measureText(text).width) + 2; c.height = Math.ceil(f * LINE);
  x.font = font; x.textBaseline = "middle"; x.fillStyle = "#000";
  x.fillText(text, 1, c.height / 2);
  return c.toDataURL("image/png");
}

const dataBytes = url => fetch(url).then(r => r.arrayBuffer());

export default {
  id: "semnatura",
  name: "Semnătură pe PDF",
  icon: "✍️",
  description: "Pune semnătura și data pe un PDF",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <label class="player-btn">Alege PDF-ul<input id="s-pdf" type="file" accept="application/pdf" hidden></label>
      <div class="sig-box"><img id="s-img" alt="" hidden><span id="s-none" class="sub">Nicio semnătură încă.</span>
        <label class="link">Încarcă semnătura (PNG)<input id="s-sig" type="file" accept="image/*" hidden></label></div>
      <div class="tabs"><button type="button" data-m="sig" class="on">Click pune semnătura</button>
        <button type="button" data-m="text">Click pune textul:</button>
        <input id="s-text" class="search inline" value="${today()}"></div>
      <div id="s-note" class="sub">Alege un PDF, apoi dă click pe pagină unde vrei semnătura. O poți trage și mări din colț.</div>
      <button id="s-dl" type="button" class="player-btn" hidden>Descarcă PDF-ul semnat</button>
    </div><div id="s-pages" class="pdf-pages"></div>`;
    const $ = s => el.querySelector(s);
    let mode = "sig", bytes = null, name = "document.pdf", sig = getSig(), sigRatio = 1;

    const showSig = async () => {
      $("#s-img").hidden = !sig; $("#s-none").hidden = !!sig;
      if (!sig) return;
      $("#s-img").src = sig;
      const i = await loadImage(sig); sigRatio = i.height / i.width;
    };
    showSig();
    $("#s-sig").addEventListener("change", async e => {
      if (!e.target.files[0]) return;
      sig = await toPng(e.target.files[0]); setSig(sig); showSig();
    });
    el.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => {
      mode = b.dataset.m;
      el.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x === b));
    }));

    $("#s-pdf").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      name = f.name; bytes = await readBytes(f);
      $("#s-pages").innerHTML = ""; $("#s-dl").hidden = true;
      $("#s-note").textContent = "Se deschide…";
      try {
        const lib = await pdfjs();
        const doc = await lib.getDocument({ data: bytes.slice() }).promise; // pdf.js își ia buffer-ul
        const width = Math.min($("#s-pages").clientWidth || 800, 820), dpr = window.devicePixelRatio || 1;
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const vp = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width * dpr });
          const pg = Object.assign(document.createElement("div"), { className: "pdf-page" });
          pg.dataset.i = n - 1;
          const c = Object.assign(document.createElement("canvas"), { width: vp.width, height: vp.height });
          c.style.width = `${width}px`;
          pg.append(c); $("#s-pages").append(pg);
          await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        }
        $("#s-note").textContent = `${doc.numPages} ${doc.numPages === 1 ? "pagină" : "pagini"}. Click pe pagină ca să pui semnătura sau textul.`;
        $("#s-dl").hidden = false;
      } catch {
        $("#s-note").textContent = "PDF-ul nu se poate deschide (e stricat sau are parolă).";
      }
    });

    // click pe pagină = pune; tragi = muți; colțul = mărești; × = scoți
    $("#s-pages").addEventListener("click", e => {
      const pg = e.target.closest(".pdf-page");
      if (!pg || e.target.closest(".pdf-item")) return;
      if (mode === "sig" && !sig) { $("#s-note").textContent = "Încarcă întâi semnătura."; return; }
      const r = pg.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const it = Object.assign(document.createElement("div"), { className: "pdf-item" });
      if (mode === "sig") {
        const w = r.width * 0.25;
        it.dataset.kind = "sig";
        it.innerHTML = `<img src="${sig}" alt="" draggable="false">`;
        it.style.width = `${w}px`;
        Object.assign(it.style, { left: `${x - w / 2}px`, top: `${y - w * sigRatio / 2}px` });
      } else {
        const text = $("#s-text").value.trim();
        if (!text) return;
        it.dataset.kind = "text"; it.dataset.font = 14;
        it.innerHTML = `<span></span>`; it.firstChild.textContent = text;
        Object.assign(it.style, { fontSize: "14px", left: `${x}px`, top: `${y - 9}px` });
      }
      it.insertAdjacentHTML("beforeend", `<button type="button" class="del" title="Scoate">×</button><i class="rs"></i>`);
      pg.append(it);
    });
    $("#s-pages").addEventListener("pointerdown", e => {
      const it = e.target.closest(".pdf-item");
      if (!it) return;
      if (e.target.closest(".del")) { it.remove(); return; }
      e.preventDefault();
      const resize = e.target.classList.contains("rs");
      const sx = e.clientX, sy = e.clientY, l = it.offsetLeft, t = it.offsetTop, w = it.offsetWidth, font = +it.dataset.font;
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!resize) { it.style.left = `${l + dx}px`; it.style.top = `${t + dy}px`; return; }
        const k = Math.max(0.2, (w + dx) / w);
        if (it.dataset.kind === "sig") it.style.width = `${w * k}px`;
        else { it.dataset.font = font * k; it.style.fontSize = `${font * k}px`; }
      };
      const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
      addEventListener("pointermove", move); addEventListener("pointerup", up);
    });

    $("#s-dl").addEventListener("click", async () => {
      const items = [...el.querySelectorAll(".pdf-item")];
      if (!items.length) { $("#s-note").textContent = "N-ai pus nimic pe pagini încă."; return; }
      $("#s-note").textContent = "Se pregătește…";
      const { PDFDocument } = await pdflib();
      const out = await PDFDocument.load(bytes);
      const pages = out.getPages();
      const sigImg = sig && items.some(i => i.dataset.kind === "sig") ? await out.embedPng(await dataBytes(sig)) : null;
      for (const it of items) {
        const pg = it.closest(".pdf-page"), page = pages[+pg.dataset.i], box = page.getCropBox();
        const r = box.width / pg.offsetWidth; // puncte PDF pe pixel de pe ecran
        const img = it.dataset.kind === "sig" ? sigImg
          : await out.embedPng(await dataBytes(textPng(it.firstChild.textContent, +it.dataset.font)));
        const w = it.offsetWidth * r, h = it.offsetHeight * r;
        page.drawImage(img, { x: box.x + it.offsetLeft * r, y: box.y + box.height - it.offsetTop * r - h, width: w, height: h });
      }
      download(await out.save(), renamed(name, "-semnat", ".pdf"));
      $("#s-note").textContent = "Gata, PDF-ul semnat s-a descărcat.";
    });
  },
};
