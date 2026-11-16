/* Overgrind extras: stud cursor trail, UI sounds everywhere, the hidden golden studs hunt,
   live Roblox member count and the click-to-load TikTok wall. */
import { blip, isMuted, setMuted } from "./crew3d.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
const de = () => document.documentElement.lang === "de";

/* ---------- stud trail + falling bricks ---------- */
if (fine && !reduce) {
  const cv = document.createElement("canvas"); cv.className = "stud-trail"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv);
  const g = cv.getContext("2d"); let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize(); addEventListener("resize", resize);
  const P = []; let lx = 0, ly = 0, acc = 0;
  const COLS = ["#FF4D1A", "#F2EFE9", "#FFC34D", "#2BD4E0", "#A47BFF"];
  addEventListener("pointermove", (e) => {
    const d = Math.hypot(e.clientX - lx, e.clientY - ly); acc += d; lx = e.clientX; ly = e.clientY;
    while (acc > 26) { acc -= 26; P.push({ x: e.clientX + (Math.random() - .5) * 6, y: e.clientY + (Math.random() - .5) * 6, vx: (Math.random() - .5) * .6, vy: -.2 - Math.random() * .4, life: 1, s: 4 + Math.random() * 3, c: COLS[(Math.random() * COLS.length) | 0], brick: false }); }
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (e.target.closest("a,button,input,select,textarea,label,canvas#lineup-gl,.lu-cardwrap,.gs,.bld")) return;
    const inHero = e.target.closest(".hero");
    if (inHero && window.__fsHover) return;
    if (inHero && window.__dropBrick) { window.__dropBrick(e.clientX, e.clientY); blip("thud"); return; }
    for (let k = 0; k < 3; k++) P.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5) * 5, vy: -3 - Math.random() * 3, life: 1.4, s: 10 + Math.random() * 6, c: COLS[(Math.random() * COLS.length) | 0], brick: true, r: Math.random() * 6, vr: (Math.random() - .5) * .3 });
    blip("pop");
  });
  function stud(x, y, s, c, a) {
    if (!(s > .3) || !(a > 0)) return;
    g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.ellipse(x, y + s * .25, s, s * .55, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(x, y + s * .35, s, s * .5, 0, 0, Math.PI); g.fill();
    g.fillStyle = c; g.beginPath(); g.ellipse(x, y, s, s * .55, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x - s * .3, y - s * .15, s * .35, s * .16, -.3, 0, 7); g.fill();
  }
  function brick(p, a) {
    g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = a; const w = p.s * 2, h = p.s * 1.2;
    g.fillStyle = p.c; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(-w / 2, h / 4, w, h / 4);
    for (const sx of [-w / 4, w / 4]) { g.fillStyle = p.c; g.beginPath(); g.ellipse(sx, -h / 2, w / 7, w / 14, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(sx - 2, -h / 2 - 1, w / 16, w / 34, 0, 0, 7); g.fill(); }
    g.restore();
  }
  (function loop() {
    requestAnimationFrame(loop); g.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i];
      if (p.brick) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= .012; if (p.y > H - p.s) { p.y = H - p.s; p.vy *= -.35; p.vx *= .7; p.vr *= .5; } if (p.life > 0) brick(p, Math.min(1, p.life)); }
      else { p.x += p.vx; p.y += p.vy; p.life -= .025; stud(p.x, p.y, p.s * p.life, p.c, p.life * .85); }
      if (p.life <= 0) P.splice(i, 1); }
    if (P.length > 160) P.splice(0, P.length - 160);
  })();
}

/* ---------- UI sounds on every button and card ---------- */
document.addEventListener("pointerover", (e) => { if (!fine) return; const el = e.target.closest(".btn,.panel,.dive,.lu-fits button,.dl-item,.member,.lab-card,.links a"); if (el && !el.contains(e.relatedTarget)) blip("tick"); });
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
