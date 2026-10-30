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
