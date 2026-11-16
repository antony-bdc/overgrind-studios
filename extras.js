/* Overgrind extras: UI sounds everywhere, the hidden golden studs hunt,
   live Roblox member count and the click-to-load TikTok wall. */
import { blip, isMuted, setMuted } from "./crew3d.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches; // hover ticks only with a mouse
const de = () => document.documentElement.lang === "de";

/* ---------- UI sounds on every button and card ---------- */
document.addEventListener("pointerover", (e) => { if (!fine) return; const el = e.target.closest(".btn,.panel,.lu-fits button,.dl-item,.links a,.bld-sw button,.bld-faces button,.bld-fits button"); if (el && !el.contains(e.relatedTarget)) blip("tick"); });
document.addEventListener("click", (e) => { if (e.target.closest(".btn,.panel,.lang button,.links a,.dl-play")) blip("pop"); }, true);
const navMute = document.querySelector(".nav-mute");
const syncMute = () => { if (navMute) { navMute.classList.toggle("off", isMuted()); navMute.setAttribute("aria-pressed", String(!isMuted())); } };
if (navMute) navMute.addEventListener("click", () => { setMuted(!isMuted()); syncMute(); });
document.addEventListener("og-mute", syncMute); syncMute();

/* ---------- golden stud hunt ---------- */
const studs = [...document.querySelectorAll(".gs")];
const badge = document.querySelector(".gs-badge");
let found = []; try { found = JSON.parse(localStorage.getItem("og-studs") || "[]"); } catch (e) {}
const total = 10;
function syncStuds() {
  studs.forEach((s) => s.classList.toggle("got", found.includes(s.dataset.gs)));
  if (badge) { badge.hidden = found.length === 0; badge.querySelector("b").textContent = `${found.length}/${total}`; badge.classList.toggle("done", found.length >= total); }
}
studs.forEach((s) => s.addEventListener("click", (e) => {
  e.preventDefault(); e.stopPropagation(); if (found.includes(s.dataset.gs)) return;
  found.push(s.dataset.gs); try { localStorage.setItem("og-studs", JSON.stringify(found)); } catch (er) {}
  s.classList.add("pop"); blip("spark"); syncStuds();
  if (badge) { badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump"); }
  if (found.length >= total) setTimeout(secret, 500);
}));
function secret() {
  const w = document.querySelector(".gs-secret"); if (!w) return;
  w.hidden = false; requestAnimationFrame(() => w.classList.add("open")); blip("spark");
  if (window.__luDance) window.__luDance();
  confetti();
}
const sw = document.querySelector(".gs-secret");
if (sw) sw.addEventListener("click", (e) => { if (e.target === sw || e.target.closest(".c-close")) { sw.classList.remove("open"); setTimeout(() => (sw.hidden = true), 350); } });
if (badge) badge.addEventListener("click", () => { if (found.length >= total && sw) secret(); else { blip("pop"); badge.title = de() ? "Goldene Noppen gefunden – such weiter auf der Startseite" : "Golden studs found, keep looking on the home page"; } });
syncStuds();
function confetti() {
  if (reduce) return; const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv); const g = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight; const C = ["#FF4D1A", "#FFC34D", "#F2EFE9", "#2BD4E0", "#A47BFF"]; const P = [];
  for (let i = 0; i < 180; i++) P.push({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 18, vy: -Math.random() * 16 - 4, r: Math.random() * 6, c: C[i % 5], s: 6 + Math.random() * 6 });
  let f = 0; (function l() { f++; g.clearRect(0, 0, cv.width, cv.height); P.forEach((p) => { p.vy += .45; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += .1; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); g.restore(); }); if (f < 200) requestAnimationFrame(l); else cv.remove(); })();
}

/* ---------- live member count (public Roblox proxy, cached, hidden on failure) ---------- */
const GROUP = 1068137339;
const live = [...document.querySelectorAll("[data-members]")];
if (live.length) {
  const show = (n) => live.forEach((el) => { const host = el.closest(".live"); if (host) host.hidden = false; countUp(el, n); });
  let cached = null; try { cached = JSON.parse(localStorage.getItem("og-members") || "null"); } catch (e) {}
  if (cached && Date.now() - cached.t < 6 * 3600e3) show(cached.n);
  else fetch(`https://groups.roproxy.com/v1/groups/${GROUP}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((d) => {
    if (typeof d.memberCount !== "number") return; try { localStorage.setItem("og-members", JSON.stringify({ n: d.memberCount, t: Date.now() })); } catch (e) {} show(d.memberCount);
  }).catch(() => {});
}
function countUp(el, n) {
  const io = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io.disconnect(); const t0 = performance.now();
    (function f(now) { const x = Math.min(1, (now - t0) / 1400), v = Math.round(n * (1 - Math.pow(1 - x, 3))); el.textContent = v.toLocaleString(de() ? "de-CH" : "en-US"); if (x < 1) requestAnimationFrame(f); })(t0); });
  io.observe(el);
}

/* ---------- TikTok wall: loads only after a click (no TikTok cookies before) ---------- */
const tt = document.querySelector(".tt-wall");
if (tt) tt.querySelector(".tt-load").addEventListener("click", () => {
  tt.classList.add("loaded");
  tt.querySelector(".tt-slot").innerHTML = '<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@overgrindstudios" data-unique-id="overgrindstudios" data-embed-type="creator" style="max-width:780px;min-width:288px;"><section><a target="_blank" rel="noopener" href="https://www.tiktok.com/@overgrindstudios">@overgrindstudios</a></section></blockquote>';
  const s = document.createElement("script"); s.async = true; s.src = "https://www.tiktok.com/embed.js"; document.body.appendChild(s);
});

/* ---------- chapter rail: where am I on the page ---------- */
const rail = document.querySelector(".chapters");
if (rail) {
  const links = [...rail.querySelectorAll("a")], secs = links.map((a) => document.querySelector(a.getAttribute("href")));
  const hero = document.querySelector(".hero");
  let ticking = false;
  const upd = () => { ticking = false; const H = innerHeight, mid = H * .45;
    rail.classList.toggle("show", hero ? hero.getBoundingClientRect().bottom < H * .4 : true);
    let act = -1; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= mid) act = i; });
    links.forEach((a, i) => { a.classList.toggle("on", i === act); a.classList.toggle("past", i < act);
      const s = secs[i]; if (!s) return; const r = s.getBoundingClientRect(), end = secs[i + 1] ? secs[i + 1].getBoundingClientRect().top : r.bottom;
      const p = Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, end - r.top))); a.querySelector("b").style.transform = `scaleY(${i < act ? 1 : i === act ? p : 0})`; }); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true }); addEventListener("resize", upd); upd();
}

/* ---------- ambient music: a soft synth pad, generated live (no audio file, nothing licensed) ---------- */
const musicBtn = document.querySelector(".nav-music");
if (musicBtn) {
  let AC = null, master = null, playing = false, timer = null, step = 0;
  const CH = [[48, 55, 59, 64, 71], [45, 52, 57, 60, 67], [41, 48, 53, 57, 64], [43, 50, 55, 59, 62]]; // Cmaj7 · Am9 · Fmaj7 · G6
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function setup() {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0;
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = .4;
    const lfo = AC.createOscillator(), lfoG = AC.createGain(); lfo.frequency.value = .05; lfoG.gain.value = 380; lfo.connect(lfoG).connect(lp.frequency); lfo.start();
    // simple reverb from a decaying noise burst
    const len = AC.sampleRate * 3.2, ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const rev = AC.createConvolver(); rev.buffer = ir; const wet = AC.createGain(); wet.gain.value = .55;
    lp.connect(master); lp.connect(rev); rev.connect(wet).connect(master); master.connect(AC.destination);
    setup.bus = lp;
  }
  function chord() {
    const t = AC.currentTime, notes = CH[step % CH.length]; step++;
    notes.forEach((m, i) => { for (const det of [-6, 6]) { const o = AC.createOscillator(), g = AC.createGain(); o.type = i === 0 ? "sine" : "triangle"; o.frequency.value = hz(m); o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(i === 0 ? .1 : .045, t + 2.2); g.gain.setValueAtTime(i === 0 ? .1 : .045, t + 6.2); g.gain.linearRampToValueAtTime(0, t + 9);
      o.connect(g).connect(setup.bus); o.start(t); o.stop(t + 9.1); } });
    for (let k = 0; k < 4; k++) { const m = notes[1 + ((k * 3 + step) % 4)] + 12, at = t + 1 + k * 1.6 + Math.random() * .2, o = AC.createOscillator(), g = AC.createGain(); // soft plucks on top
      o.type = "sine"; o.frequency.value = hz(m); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.035, at + .02); g.gain.exponentialRampToValueAtTime(.0001, at + 1.6); o.connect(g).connect(setup.bus); o.start(at); o.stop(at + 1.7); }
  }
  function start() { if (!AC) setup(); AC.resume(); playing = true; chord(); timer = setInterval(chord, 8000); master.gain.cancelScheduledValues(AC.currentTime); master.gain.linearRampToValueAtTime(isMuted() ? 0 : .5, AC.currentTime + 2); sync(); }
  function stop() { playing = false; clearInterval(timer); if (AC) { master.gain.cancelScheduledValues(AC.currentTime); master.gain.linearRampToValueAtTime(0, AC.currentTime + .8); } sync(); }
  function sync() { musicBtn.classList.toggle("on", playing); musicBtn.setAttribute("aria-pressed", String(playing)); }
  musicBtn.addEventListener("click", () => { playing ? stop() : start(); try { localStorage.setItem("og-music", playing ? "1" : "0"); } catch (e) {} });
  document.addEventListener("og-mute", () => { if (AC && playing) master.gain.linearRampToValueAtTime(isMuted() ? 0 : .5, AC.currentTime + .4); });
  // it was on last time: resume after the first interaction (browsers block sound before that)
  let want = false; try { want = localStorage.getItem("og-music") === "1"; } catch (e) {}
  if (want) addEventListener("pointerdown", (e) => { if (!playing && !e.target.closest(".nav-music")) start(); }, { once: true });
  addEventListener("visibilitychange", () => { if (AC && playing) document.hidden ? AC.suspend() : AC.resume(); });
}
