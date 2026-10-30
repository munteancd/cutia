// Poze în PDF: pozele în ordinea aleasă, câte una pe o pagină A4 (culcată dacă poza e lată).
import { pdflib, loadImage, canvasBlob, download, openableImage, IMAGE_ACCEPT } from "./lib.js";

const A4 = [595.28, 841.89]; // puncte
const MARGIN = 28;           // ~1 cm
const MAX = 2480;            // A4 la 300 dpi, destul pentru acte

export default {
  id: "pozepdf",
  name: "Poze în PDF",
  icon: "🖼️",
  description: "Mai multe poze → un PDF, câte una pe pagină",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <label class="player-btn">Adaugă poze<input id="p-in" type="file" accept="${IMAGE_ACCEPT}" multiple hidden></label>
      <label class="sub"><input id="p-margin" type="checkbox" checked> cu margine albă</label>
      <div id="p-note" class="sub">Pozele apar mai jos; le poți muta, roti sau scoate înainte să faci PDF-ul.</div>
      <button id="p-dl" type="button" class="player-btn" hidden>Fă PDF-ul</button>
    </div><div id="p-list" class="thumbs"></div>`;
    const $ = s => el.querySelector(s);
    let list = []; // { url, rot }

    const draw = () => {
      $("#p-list").innerHTML = list.map((p, i) => `<div class="thumb">
        <img src="${p.url}" alt="" style="transform: rotate(${p.rot}deg)">
        <div class="thumb-bar"><span>${i + 1}</span>
          <button type="button" data-a="left" data-i="${i}" title="Mută în față">←</button>
          <button type="button" data-a="rot" data-i="${i}" title="Rotește">⟳</button>
          <button type="button" data-a="right" data-i="${i}" title="Mută în spate">→</button>
          <button type="button" data-a="del" data-i="${i}" title="Scoate">×</button></div></div>`).join("");
      $("#p-dl").hidden = !list.length;
      $("#p-note").textContent = list.length ? `${list.length} ${list.length === 1 ? "poză" : "poze"}.` : "Adaugă una sau mai multe poze.";
    };
    $("#p-in").addEventListener("change", async e => {
      const files = [...e.target.files];
      e.target.value = "";
      $("#p-note").textContent = "Se încarcă pozele…";
      for (const f of files) {
        try { list.push({ url: URL.createObjectURL(await openableImage(f)), rot: 0 }); }
        catch { $("#p-note").textContent = `${f.name} nu se poate deschide.`; }
      }
      draw();
    });
    $("#p-list").addEventListener("click", e => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      const i = +b.dataset.i, j = b.dataset.a === "left" ? i - 1 : i + 1;
      if (b.dataset.a === "del") list.splice(i, 1);
      else if (b.dataset.a === "rot") list[i].rot = (list[i].rot + 90) % 360;
      else if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      draw();
    });

    $("#p-dl").addEventListener("click", async () => {
      const { PDFDocument } = await pdflib();
      const out = await PDFDocument.create();
      const margin = $("#p-margin").checked ? MARGIN : 0;
      for (const [n, p] of list.entries()) {
        $("#p-note").textContent = `Pagina ${n + 1} din ${list.length}…`;
        const img = await loadImage(p.url);
        const turned = p.rot % 180 !== 0, k = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = img.width * k, h = img.height * k;
        const c = Object.assign(document.createElement("canvas"), { width: turned ? h : w, height: turned ? w : h });
        const x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); // PNG transparent → alb
        x.translate(c.width / 2, c.height / 2); x.rotate(p.rot * Math.PI / 180);
        x.drawImage(img, -w / 2, -h / 2, w, h);
        const jpg = await out.embedJpg(await (await canvasBlob(c)).arrayBuffer());
        const [pw, ph] = c.width > c.height ? [A4[1], A4[0]] : A4;
        const s = Math.min((pw - 2 * margin) / c.width, (ph - 2 * margin) / c.height);
        out.addPage([pw, ph]).drawImage(jpg, {
          x: (pw - c.width * s) / 2, y: (ph - c.height * s) / 2, width: c.width * s, height: c.height * s });
      }
      download(await out.save(), "poze.pdf");
      $("#p-note").textContent = `Gata, PDF-ul cu ${list.length} ${list.length === 1 ? "pagină" : "pagini"} s-a descărcat.`;
    });
  },
};
