/* Overgrind game pages: a crew avatar plays a little scene from the game in the hero.
   Wyrmquake: flying with dragon wings · Recess: hopscotch · Pirates: spyglass on a rocking deck · SEEN ONLINE: glued to
   the phone until something behind him moves · Element Clash: fight stance and punches · Lanternfall: sneaking with the
   lantern · The Line: floating under a halo. Watches the cursor, points at what you hover, emotes when clicked. */
import * as THREE from "../../vendor/three.module.min.js";
import { loadCrew, makeAvatar, setArm, setOutfit, updateOutfit, say, blip, soundBase, clamp, hash } from "../../crew3d.js";
import { Actor, LOOPS, EMOTES, EMOTE_SETS } from "../../anim.js";

const canvas = document.querySelector(".gp-crew");
const KEY = document.body.dataset.key;
const WHO = { wyrm: "fs", pirates: "fs", clash: "fs", line: "fs", recess: "an", seen: "an", lantern: "an" }[KEY] || "fs";
if (canvas) init().catch((e) => console.warn("gamecrew", e));

/* scene-only loops and emotes */
LOOPS.spyglass = (t, p) => { p.rf = 96; p.rs = -18; p.lf = 30; p.ls = 6; p.hy = Math.sin(t * .5) * .35; p.hx = -.06; p.sy = 1 + Math.sin(t * 2.1) * .008; };
LOOPS.phoneL = (t, p) => { p.rf = 74; p.rs = -12; p.lf = 40; p.ls = -8; p.hx = .38; p.hy = -.06 + Math.sin(t * .7) * .05; p.sy = 1 + Math.sin(t * 2.1) * .008; if (hash(Math.floor(t * 3)) > .8) p.rf += 4; };
EMOTES.lookback = { d: 1.9, f(t, p) { const u = Math.min(clamp(t / .15, 0, 1), 1 - clamp((t - 1.5) / .4, 0, 1)); p.hy = 1.25 * u; p.ry = .55 * u; p.x = Math.sin(t * 60) * .015 * u; p.rf = 4 + 60 * (1 - u) + 20 * u; p.lf = p.rf; p.rs = p.ls = 4 - 10 * u; p.sy = 1 - .03 * u; } };
EMOTES.roll = { d: 1.2, f(t, p) { const x = clamp(t / 1, 0, 1); p.rz = (x * x * (3 - 2 * x)) * Math.PI * 2; } };
EMOTES.shanty = { d: 2.6, f(t, p) { const b = Math.sin(t * 7); p.y = Math.abs(b) * .08; p.ll = b * .3; p.lr = -b * .3; p.ls = 40 + 30 * b; p.lf = 20; p.ry = b * .25; p.hz = b * .1; } };

async function init() {
  soundBase("../../");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, .05, 40);
  const accent = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff4d1a");
  scene.add(new THREE.HemisphereLight(0xdfe4ff, 0x160b06, .7));
  const key = new THREE.DirectionalLight(0xfff1e4, 2.2); key.position.set(-2.5, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(accent, 3.2); rim.position.set(3, 2.5, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x6aa8ff, 1.2); rim2.position.set(-3, 2, -3); scene.add(rim2);
  const data = await loadCrew("../../", [WHO]);
  const J = makeAvatar(WHO, data); scene.add(J.root); setOutfit(J, KEY);
  const A = new Actor(J, { idle: false });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.7, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .45, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .002; scene.add(shadow);
  if (KEY === "wyrm") { camera.position.set(0, 1.6, 8.6); camera.lookAt(0, 1.45, 0); } else { camera.position.set(0, 1.25, 6.4); camera.lookAt(0, 1.0, 0); }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(canvas); resize();

  /* scene props */
  if (KEY === "pirates") { // brass spyglass in the right hand
    const g = new THREE.Group(), brass = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: .8, roughness: .25 });
    const a = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .34, 16), brass); a.rotation.x = Math.PI / 2; a.position.z = .1; g.add(a);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .1, 16), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: .6 })); b.rotation.x = Math.PI / 2; b.position.z = .32; g.add(b);
    g.position.set(0, -.6, .06); J.armR.add(g);
  }
  const S = { wyrm: "fly", recess: "idle", pirates: "spyglass", seen: "phoneL", clash: "fight", lantern: "sneak", line: "float" };
  A.setLoop(S[KEY] || "idle"); A.loopW = 1;

  /* pointer */
  const mouse = new THREE.Vector2(-2, 0); let pIn = false, speed = 0, lx = 0, ly = 0;
  addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); pIn = true; speed = Math.max(speed, Math.hypot(e.clientX - lx, e.clientY - ly)); lx = e.clientX; ly = e.clientY; }, { passive: true });
  document.querySelectorAll(".gp-hero h1, .gp-hero .btn, .gal figure, .feat-grid > *").forEach((el) => el.addEventListener("pointerenter", () => { if (!A.busy()) A.play("point", { voice: false, sound: false }); }));
  const ray = new THREE.Raycaster(); const over = () => { ray.setFromCamera(mouse, camera); return ray.intersectObjects(J.meshes, false).length > 0; };
  const SET = EMOTE_SETS[WHO]; let cyc = -1;
  addEventListener("click", (e) => { if (e.target.closest("a,button,input,select,textarea") || !over()) return; cyc = (cyc + 1) % SET.length; A.play(SET[cyc]); });

  /* per-game director: where he is and what he does next */
  let t = 0, next = 2.5, last = performance.now() / 1000, vis = true, hovering = false, hopN = 0, dirX = 1;
  new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe(canvas);
  const root = { x: 0, y: 0, ry: -.25, rz: 0 };
  function direct(dt) {
    const free = !A.busy();
    if (KEY === "wyrm") { root.y = 1.15 + Math.sin(t * .9) * .22; root.x = Math.sin(t * .45) * .35; root.rz = -Math.cos(t * .45) * .22; root.ry = -1.15 + Math.cos(t * .45) * .18;
      if (free && t > next) { A.play(Math.random() < .5 ? "roll" : "cheer", { voice: false, sound: false }); next = t + 5 + Math.random() * 3; } }
    if (KEY === "recess") { // hopscotch: three hops across, a little victory, turn, repeat
      if (free && t > next) { if (hopN < 3) { A.play("hop", { voice: false, sound: false }); hopN++; next = t + .5; } else { A.play(Math.random() < .5 ? "victory" : "cheer", { voice: false, sound: false }); hopN = 0; dirX *= -1; next = t + 2.6; } }
      if (A.em === "hop") root.x = clamp(root.x + dirX * dt * .95, -.7, .7); root.ry = A.em === "hop" ? dirX * .9 : root.ry + (-.25 - root.ry) * Math.min(1, dt * 4); root.y = 0; }
    if (KEY === "pirates") { root.rz = Math.sin(t * .8) * .06; root.x = Math.sin(t * .8) * .06; root.ry = -.35;
      if (free && t > next) { A.play(Math.random() < .55 ? "point" : "shanty", { voice: false, sound: false }); next = t + 4.5 + Math.random() * 3; } }
    if (KEY === "seen" || KEY === "lantern") { // horror: jumpy
      if (KEY === "lantern") { root.x = Math.sin(t * .35) * .5; root.ry = Math.cos(t * .35) > 0 ? .9 : -.9; if (J.outfit && hash(Math.floor(t * 9)) > .93) J.root.traverse((o) => { if (o.isPointLight) o.intensity = .3; }); }
      if ((free && t > next) || (speed > 160 && free)) { A.play(KEY === "seen" ? (Math.random() < .6 ? "lookback" : "scared") : "scared", { voice: false, sound: false }); blip("glitch"); speed = 0; next = t + 6 + Math.random() * 5; } }
    if (KEY === "clash") { root.ry = -.4;
      if (free && t > next) { A.play(Math.random() < .7 ? "punch" : "spin", { voice: false, sound: false }); next = t + 2.4 + Math.random() * 2; } }
    if (KEY === "line") { root.y = .15; root.ry = -.2 + Math.sin(t * .3) * .25;
      if (free && t > next) { A.play(Math.random() < .5 ? "pointUp" : "spin", { voice: false, sound: false }); next = t + 5 + Math.random() * 3; } }
  }
  const cur = { x: 0, y: 0, ry: -.25, rz: 0 };
  function frame() {
    requestAnimationFrame(frame); if (!vis) { last = performance.now() / 1000; return; }
    const now = performance.now() / 1000, dt = Math.min(.05, now - last); last = now; t += dt; speed *= Math.pow(.02, dt);
    if (!reduce) direct(dt);
    for (const k in cur) cur[k] += (root[k] - cur[k]) * Math.min(1, dt * (k === "y" ? 3 : 5));
    if (pIn) A.lookAt(clamp(Math.atan2(mouse.x * 2.2, 3), -.9, .9) - cur.ry * .5, clamp(-mouse.y * .45, -.35, .3)); else A.lookAt(-.3, 0);
    const h = pIn && over(); if (h !== hovering) { hovering = h; document.body.style.cursor = h ? "pointer" : ""; if (h) { if (!A.busy()) A.play("hop", { voice: false, sound: false }); } }
    A.update(dt);
    J.root.position.set(cur.x, cur.y, 0); J.root.rotation.set(0, cur.ry, cur.rz);
    updateOutfit(J, t); shadow.position.x = cur.x; shadow.scale.setScalar(1 - Math.min(.6, cur.y + J.body.position.y)); shadow.material.opacity = .45 * (1 - Math.min(.7, cur.y));
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame); canvas.classList.add("on");
}

/* keep long titles (ELEMENT CLASH, DUBAI 2099) on the left of the avatar: shrink until every line fits */
function fitTitle() {
  const h = document.querySelector(".gp-hero h1"); if (!h) return; h.style.fontSize = "";
  const lines = [...h.querySelectorAll(".ln")]; if (!lines.length) return;
  let fs = parseFloat(getComputedStyle(h).fontSize), n = 0;
  while (lines.some((l) => l.scrollWidth > l.clientWidth + 1) && fs > 34 && n++ < 60) { fs -= 3; h.style.fontSize = fs + "px"; }
}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(fitTitle);
let fitT; addEventListener("resize", () => { clearTimeout(fitT); fitT = setTimeout(fitTitle, 120); });
