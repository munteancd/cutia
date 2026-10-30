// Cronometru și timer. Starea stă în modul, nu în pagină: merg mai departe și dacă
// treci pe altă categorie (ex. Radio); la final timerul sună și scrie în titlul tab-ului.
const PRESETS = [1, 3, 5, 10, 15, 30];
const watch = { start: 0, acc: 0, laps: [] };    // cronometru: acc = ms adunate până la ultima pauză
const timer = { end: 0, left: 5 * 60e3, total: 5 * 60e3, ringing: false };
let tick = null, audio = null, view = null;

const running = () => !!watch.start || !!timer.end;
const elapsed = () => watch.acc + (watch.start ? Date.now() - watch.start : 0);
const remaining = () => timer.end ? Math.max(0, timer.end - Date.now()) : timer.left;

function fmt(ms, tenths) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  const t = `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
  return tenths ? `${t},${Math.floor(ms / 100) % 10}` : t;
}

function beep() { // trei bipuri, de trei ori
  if (!audio) return;
  for (let i = 0; i < 9; i++) {
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.3 + Math.floor(i / 3) * 0.6;
    o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.start(t); o.stop(t + 0.22);
  }
}

function loop() {
  if (timer.end && Date.now() >= timer.end) {
    timer.end = 0; timer.left = 0; timer.ringing = true; beep();
  }
  if (timer.ringing) document.title = document.title.startsWith("⏰") ? "Gata!" : "⏰ Timer gata!";
  else if (timer.end) document.title = `⏳ ${fmt(remaining())}`;
  if (view?.isConnected) draw();
  if (!running() && !timer.ringing) { clearInterval(tick); tick = null; }
}
const ensureLoop = () => { tick ??= setInterval(loop, 100); };
const stopRinging = () => { if (timer.ringing) { timer.ringing = false; document.title = "Unelte · Cutia"; } };

function draw() {
  const $ = s => view.querySelector(s);
  $("#c-w").textContent = fmt(elapsed(), true);
  $("#c-w-go").textContent = watch.start ? "Pauză" : elapsed() ? "Continuă" : "Pornește";
  $("#c-laps").innerHTML = watch.laps.map((l, i) => `<div>Tur ${i + 1}: <b>${fmt(l, true)}</b></div>`).reverse().join("");
  $("#c-t").textContent = fmt(remaining() + (timer.end ? 999 : 0)); // rotunjit în sus: arată 0:00 abia la final
  $("#c-t").classList.toggle("ring", timer.ringing);
  $("#c-t-go").textContent = timer.ringing ? "Oprește alarma" : timer.end ? "Pauză" : timer.left < timer.total ? "Continuă" : "Pornește";
}

export default {
  id: "timer",
  name: "Cronometru și timer",
  icon: "⏱️",
  description: "Cronometru cu ture, timer cu sunet",
  mount(el) {
    view = el;
    el.innerHTML = `<div class="tool-form">
      <h2>Timer</h2>
      <div class="tabs">${PRESETS.map(m => `<button type="button" data-min="${m}">${m} min</button>`).join("")}
        <input id="c-min" type="number" min="0" placeholder="min" class="mini"><input id="c-sec" type="number" min="0" max="59" placeholder="sec" class="mini">
        <button type="button" id="c-set">Setează</button></div>
      <div id="c-t" class="clock"></div>
      <div class="tabs"><button type="button" id="c-t-go" class="on"></button><button type="button" id="c-t-reset">Resetează</button></div>
      <h2>Cronometru</h2>
      <div id="c-w" class="clock"></div>
      <div class="tabs"><button type="button" id="c-w-go" class="on"></button><button type="button" id="c-w-lap">Tur</button><button type="button" id="c-w-reset">Resetează</button></div>
      <div id="c-laps" class="sub"></div>
      <div class="sub">Merg și dacă treci pe altă categorie sau alt tab; la final timerul sună.</div>
    </div>`;
    const $ = s => el.querySelector(s);
    const unlock = () => { audio ??= new AudioContext(); audio.resume(); }; // sunetul cere un click întâi
    const setTimer = ms => { stopRinging(); timer.end = 0; timer.left = timer.total = ms; draw(); };

    el.querySelectorAll("[data-min]").forEach(b => b.addEventListener("click", () => setTimer(b.dataset.min * 60e3)));
    $("#c-set").addEventListener("click", () => {
      const ms = ((+$("#c-min").value || 0) * 60 + (+$("#c-sec").value || 0)) * 1000;
      if (ms > 0) setTimer(ms);
    });
    $("#c-t-go").addEventListener("click", () => {
      unlock();
      if (timer.ringing) { stopRinging(); timer.left = timer.total; }
      else if (timer.end) { timer.left = remaining(); timer.end = 0; document.title = "Unelte · Cutia"; }
      else if (timer.left > 0) { timer.end = Date.now() + timer.left; ensureLoop(); }
      draw();
    });
    $("#c-t-reset").addEventListener("click", () => { setTimer(timer.total); document.title = "Unelte · Cutia"; });
    $("#c-w-go").addEventListener("click", () => {
      if (watch.start) { watch.acc = elapsed(); watch.start = 0; } else { watch.start = Date.now(); ensureLoop(); }
      draw();
    });
    $("#c-w-lap").addEventListener("click", () => { if (watch.start) { watch.laps.push(elapsed()); draw(); } });
    $("#c-w-reset").addEventListener("click", () => { watch.start = 0; watch.acc = 0; watch.laps = []; draw(); });
    draw();
    if (running() || timer.ringing) ensureLoop();
  },
};
