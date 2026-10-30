// Ce folosesc mai multe unelte: bibliotecile de pe CDN (încărcate o singură dată),
// citirea fișierelor și descărcarea rezultatului.
const loaded = new Map();
export const loadScript = src => {
  if (!loaded.has(src)) loaded.set(src, new Promise((ok, bad) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.append(s);
  }));
  return loaded.get(src);
};

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
// pdf.js desenează paginile, pdf-lib scrie PDF-ul nou
export async function pdfjs() {
  await loadScript(PDFJS + "pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
  return window.pdfjsLib;
}
export async function pdflib() {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
  return window.PDFLib;
}

export const readBytes = file => file.arrayBuffer().then(b => new Uint8Array(b));

export function loadImage(src) {
  return new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
}

export const canvasBlob = (c, type = "image/jpeg", q = 0.85) => new Promise(ok => c.toBlob(ok, type, q));

export function download(data, name, type = "application/pdf") {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const size = b => b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

// „file.pdf" → „file-semnat.pdf"
export const renamed = (name, suffix, ext) => name.replace(/\.[^.]+$/, "") + suffix + (ext ?? (name.match(/\.[^.]+$/)?.[0] || ""));

// pozele de pe iPhone (HEIC) nu le deschide browserul: le facem JPG întâi
const isHeic = f => /image\/hei[cf]/.test(f.type) || /\.hei[cf]$/i.test(f.name);
export async function openableImage(file) {
  if (!isHeic(file)) return file;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js");
  const out = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return new File([Array.isArray(out) ? out[0] : out], renamed(file.name, "", ".jpg"), { type: "image/jpeg" });
}
export const IMAGE_ACCEPT = "image/*,.heic,.heif";

export async function zip(files) { // [{ name, blob }] → Blob .zip
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
  const z = new window.JSZip(), used = new Set();
  for (const f of files) {
    let n = f.name, k = 1;
    while (used.has(n)) n = renamed(f.name, `-${++k}`);
    used.add(n); z.file(n, f.blob);
  }
  return z.generateAsync({ type: "blob" });
}
