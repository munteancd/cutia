// Generator de cod QR (text/link sau WiFi), descărcabil ca PNG.
const LIB = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
let loaded = null;
const load = () => loaded ??= new Promise((ok, bad) => {
  const s = document.createElement("script"); s.src = LIB; s.onload = ok; s.onerror = bad; document.head.append(s);
});

const wifiEsc = s => s.replace(/([\\;,:"])/g, "\\$1");

export default {
  id: "qr",
  name: "Cod QR",
  icon: "🔳",
  description: "Text, link sau WiFi → cod QR",
  async mount(el) {
    el.innerHTML = `<div class="tool-form">
      <div class="tabs"><button type="button" data-m="text" class="on">Text / link</button><button type="button" data-m="wifi">WiFi</button></div>
      <div id="q-text"><input id="q-in" class="search" placeholder="https://… sau orice text"></div>
      <div id="q-wifi" hidden>
        <input id="q-ssid" class="search" placeholder="Numele rețelei (SSID)">
        <input id="q-pass" class="search" placeholder="Parola">
      </div>
      <div id="q-out" class="qr-out"></div>
      <a id="q-dl" class="player-btn" download="cod-qr.png" hidden>Descarcă PNG</a></div>`;
    const $ = s => el.querySelector(s);
    let mode = "text";
    await load();
    const draw = () => {
      const text = mode === "text" ? $("#q-in").value.trim()
        : ($("#q-ssid").value ? `WIFI:T:WPA;S:${wifiEsc($("#q-ssid").value)};P:${wifiEsc($("#q-pass").value)};;` : "");
      $("#q-out").innerHTML = "";
      $("#q-dl").hidden = !text;
      if (!text) return;
      new window.QRCode($("#q-out"), { text, width: 240, height: 240, correctLevel: window.QRCode.CorrectLevel.M });
      const c = $("#q-out canvas");
      if (c) $("#q-dl").href = c.toDataURL("image/png");
    };
    el.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => {
      mode = b.dataset.m;
      el.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x === b));
      $("#q-text").hidden = mode !== "text"; $("#q-wifi").hidden = mode !== "wifi";
      draw();
    }));
    el.querySelectorAll("input").forEach(i => i.addEventListener("input", draw));
  },
};
