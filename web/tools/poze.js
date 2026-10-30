// Poze: micșorează, schimbă formatul și taie, pe mai multe poze deodată.
// Ordinea pe fiecare poză: tăiere → mărime → format. Mai multe poze ies într-un .zip.
import { esc } from "../app.js";
import { loadImage, canvasBlob, download, renamed, size, zip, openableImage, IMAGE_ACCEPT } from "./lib.js";

const SIZES = { "Originală": 0, "2000 px": 2000, "1280 px": 1280, "800 px": 800 };
const FORMATS = { "La fel": null, JPG: "image/jpeg", PNG: "image/png", WebP: "image/webp" };
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const RATIOS = { "Liber": 0, "1:1": 1, "4:3": 4 / 3, "3:4": 3 / 4, "16:9": 16 / 9, "9:16": 9 / 16 };

const tabs = (name, keys, on) =>
  `<div class="tabs">${keys.map(k => `<button type="button" data-${name}="${k}" class="${k === on ? "on" : ""}">${k}</button>`).join("")}</div>`;

export default {
  id: "poze",
  name: "Poze",
  icon: "🏞️",
  description: "Micșorează, schimbă formatul (și HEIC), taie",
  mount(el) {
    el.innerHTML = `<div class="tool-form">
      <label class="player-btn">Adaugă poze<input id="z-in" type="file" accept="${IMAGE_ACCEPT}" multiple hidden></label>
      <div><div class="sub">Latura mare</div>${tabs("size", Object.keys(SIZES), "Originală")}</div>
      <div><div class="sub">Format</div>${tabs("fmt", Object.keys(FORMATS), "La fel")}</div>
      <div id="z-q-row"><div class="sub">Calitate: <span id="z-qv">82</span></div><input id="z-q" type="range" min="40" max="95" value="82"></div>
      <div id="z-note" class="sub">Adaugă una sau mai multe poze. Cu ✂ tai una anume.</div>
      <button id="z-dl" type="button" class="player-btn" hidden>Descarcă</button>
      <div id="z-res" class="sub"></div>
    </div>
    <div id="z-crop" class="crop-ed" hidden>${tabs("ratio", Object.keys(RATIOS), "Liber")}
      <div class="crop-stage"><img id="z-cimg" alt="" draggable="false"><div class="crop-box"><i class="rs"></i></div></div>
      <div class="tabs"><button type="button" id="z-cok" class="on">Aplică</button><button type="button" id="z-cno">Fără tăiere</button></div>
    </div>
    <div id="z-list" class="thumbs"></div>`;
    const $ = s => el.querySelector(s);
    const opt = { size: "Originală", fmt: "La fel", ratio: "Liber" };
    let list = [], editing = -1; // { name, type, url, bytes, crop: {x,y,w,h} în fracții | null }

    const draw = () => {
      $("#z-list").innerHTML = list.map((p, i) => `<div class="thumb${i === editing ? " on" : ""}">
        <img src="${p.url}" alt="">
        <div class="thumb-bar"><span title="${esc(p.name)}">${p.crop ? "✂ " : ""}${size(p.bytes)}</span>
          <button type="button" data-a="crop" data-i="${i}" title="Taie">✂</button>
          <button type="button" data-a="del" data-i="${i}" title="Scoate">×</button></div></div>`).join("");
      $("#z-dl").hidden = !list.length;
      $("#z-dl").textContent = list.length > 1 ? `Descarcă toate (${list.length}, .zip)` : "Descarcă";
    };
    const showQ = () => { $("#z-q-row").hidden = opt.fmt === "PNG"; };
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-size],[data-fmt],[data-ratio]");
      if (!b) return;
      const k = ["size", "fmt", "ratio"].find(k => b.dataset[k] !== undefined);
      opt[k] = b.dataset[k];
      el.querySelectorAll(`[data-${k}]`).forEach(x => x.classList.toggle("on", x === b));
      showQ();
      if (k === "ratio") fitBox();
    });
    $("#z-q").addEventListener("input", e => { $("#z-qv").textContent = e.target.value; });

    $("#z-in").addEventListener("change", async e => {
      const files = [...e.target.files];
      e.target.value = "";
      $("#z-note").textContent = "Se încarcă pozele…";
      for (const f of files) {
        try {
          const g = await openableImage(f);
          list.push({ name: g.name, type: g.type, url: URL.createObjectURL(g), bytes: f.size, crop: null });
        } catch { $("#z-note").textContent = `${f.name} nu se poate deschide.`; }
      }
      $("#z-note").textContent = `${list.length} ${list.length === 1 ? "poză" : "poze"}. Cu ✂ tai una anume.`;
      draw();
    });
    $("#z-list").addEventListener("click", e => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      const i = +b.dataset.i;
      if (b.dataset.a === "del") { list.splice(i, 1); if (editing === i) closeCrop(); else if (editing > i) editing--; }
      else openCrop(i);
      draw();
    });

    // tăiere: dreptunghi peste poză, îl muți sau îl mărești din colț
    const box = $(".crop-box"), stage = $(".crop-stage"), cimg = $("#z-cimg");
    let r = { x: 0, y: 0, w: 1, h: 1 }; // în fracții din poză
    const place = () => Object.assign(box.style, {
      left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
    // la proporție fixă: cel mai mare dreptunghi care încape, centrat
    function fitBox() {
      const ratio = RATIOS[opt.ratio];
      if (ratio && cimg.naturalWidth) {
        const imgRatio = cimg.naturalWidth / cimg.naturalHeight;
        const w = Math.min(1, ratio / imgRatio), h = Math.min(1, imgRatio / ratio);
        r = { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
      }
      place();
    }
    function openCrop(i) {
      editing = i;
      r = list[i].crop ? { ...list[i].crop } : { x: 0, y: 0, w: 1, h: 1 };
      cimg.onload = () => (list[i].crop ? place() : fitBox());
      cimg.src = list[i].url;
      $("#z-crop").hidden = false;
      $("#z-crop").scrollIntoView({ behavior: "smooth" });
    }
    function closeCrop() { editing = -1; $("#z-crop").hidden = true; draw(); }
    $("#z-cok").addEventListener("click", () => {
      list[editing].crop = r.w > 0.999 && r.h > 0.999 ? null : { ...r }; closeCrop();
    });
    $("#z-cno").addEventListener("click", () => { list[editing].crop = null; closeCrop(); });
    box.addEventListener("pointerdown", e => {
      e.preventDefault();
      const resize = e.target.classList.contains("rs"), W = stage.clientWidth, H = stage.clientHeight;
      const sx = e.clientX, sy = e.clientY, s = { ...r }, ratio = RATIOS[opt.ratio] * H / W; // proporția în fracții
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const move = ev => {
        const dx = (ev.clientX - sx) / W, dy = (ev.clientY - sy) / H;
        if (!resize) { r.x = clamp(s.x + dx, 0, 1 - s.w); r.y = clamp(s.y + dy, 0, 1 - s.h); }
        else if (!ratio) { r.w = clamp(s.w + dx, 0.05, 1 - s.x); r.h = clamp(s.h + dy, 0.05, 1 - s.y); }
        else { r.w = clamp(s.w + dx, 0.05, Math.min(1 - s.x, (1 - s.y) * ratio)); r.h = r.w / ratio; }
        place();
      };
      const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
      addEventListener("pointermove", move); addEventListener("pointerup", up);
    });

    $("#z-dl").addEventListener("click", async () => {
      const max = SIZES[opt.size], q = $("#z-q").value / 100, out = [], lines = [];
      for (const [n, p] of list.entries()) {
        $("#z-note").textContent = `Poza ${n + 1} din ${list.length}…`;
        const img = await loadImage(p.url), c = p.crop || { x: 0, y: 0, w: 1, h: 1 };
        const sw = img.naturalWidth * c.w, sh = img.naturalHeight * c.h;
        const k = max ? Math.min(1, max / Math.max(sw, sh)) : 1;
        const type = FORMATS[opt.fmt] || (EXT[p.type] ? p.type : "image/jpeg");
        const cv = Object.assign(document.createElement("canvas"), { width: Math.round(sw * k), height: Math.round(sh * k) });
        const x = cv.getContext("2d");
        if (type === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, cv.width, cv.height); } // JPG n-are transparență
        x.drawImage(img, img.naturalWidth * c.x, img.naturalHeight * c.y, sw, sh, 0, 0, cv.width, cv.height);
        const blob = await canvasBlob(cv, type, q);
        out.push({ name: renamed(p.name, "", EXT[type]), blob });
        lines.push(`${p.name}: ${size(p.bytes)} → ${size(blob.size)} (${cv.width}×${cv.height})`);
      }
      if (out.length === 1) download(out[0].blob, out[0].name);
      else download(await zip(out), "poze.zip");
      $("#z-note").textContent = "Gata, s-a descărcat.";
      $("#z-res").innerHTML = lines.map(l => `<div>${esc(l)}</div>`).join("");
    });
  },
};
