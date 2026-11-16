/* Overgrind game pages: a crew avatar in this game's outfit stands in the hero, watches the cursor,
   points at things you hover and reacts when clicked. Horror games make him jumpy. */
import * as THREE from "../../vendor/three.module.min.js";
import { loadCrew, makeAvatar, setArm, setOutfit, updateOutfit, say, blip, soundBase, clamp, hash } from "../../crew3d.js";

const canvas = document.querySelector(".gp-crew");
const KEY = document.body.dataset.key;
const WHO = { wyrm: "fs", pirates: "fs", clash: "fs", line: "fs", recess: "an", seen: "an", lantern: "an" }[KEY] || "fs";
const HORROR = KEY === "seen" || KEY === "lantern";
if (canvas) init().catch((e) => console.warn("gamecrew", e));

async function init() {
  soundBase("../../");
  const small = matchMedia("(max-width: 860px)").matches, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.7, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .45, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .002; scene.add(shadow);
  camera.position.set(0, 1.25, 6.4); camera.lookAt(0, 1.0, 0);
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(canvas); resize();

  // pointer + targets to point at
  const mouse = new THREE.Vector2(-2, 0); let pIn = false, lastMove = performance.now(), speed = 0, lx = 0, ly = 0;
  addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); pIn = true; speed = Math.max(speed, Math.hypot(e.clientX - lx, e.clientY - ly)); lx = e.clientX; ly = e.clientY; lastMove = performance.now(); }, { passive: true });
  let pointAt = 0;
  document.querySelectorAll(".gp-hero h1, .gp-hero .btn, .gal figure, .feat-grid > *").forEach((el) => { el.addEventListener("pointerenter", () => (pointAt = 1)); el.addEventListener("pointerleave", () => (pointAt = 0)); });
  const ray = new THREE.Raycaster();
  const over = () => { ray.setFromCamera(mouse, camera); return ray.intersectObjects(J.meshes, false).length > 0; };
  const LIST = WHO === "fs" ? [["wave", "hi"], ["jump", "grind"], ["freeze", "touch"], ["point", "built"]] : [["wave", "hi"], ["spin", "spin"], ["jump", "go"], ["point", "crown"]];
  let emote = null, et = 0, cyc = -1, scare = -1, nextScare = 6 + Math.random() * 5;
  addEventListener("click", (e) => { if (e.target.closest("a,button,input,select,textarea") || !over()) return; cyc = (cyc + 1) % LIST.length; emote = LIST[cyc][0]; et = 0; say(WHO, LIST[cyc][1]); blip(emote === "jump" ? "thud" : "pop"); });
  let yaw = 0, pitch = 0, t = 0, last = performance.now() / 1000, vis = true, hovering = false;
  new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe(canvas);
  const W = (f, a, b) => Math.min(clamp((f - a) / .2, 0, 1), 1 - clamp((f - (b - .2)) / .2, 0, 1));
  function frame() {
    requestAnimationFrame(frame); if (!vis) { last = performance.now() / 1000; return; }
    const now = performance.now() / 1000, dt = Math.min(.05, now - last); last = now; t += dt; speed *= Math.pow(.02, dt);
    const tx = pIn ? mouse.x * 2.2 : -.6, ty = pIn ? mouse.y * 1.4 : 0;
    yaw += (clamp(Math.atan2(tx, 3), -.9, .9) - yaw) * Math.min(1, dt * 6); pitch += (clamp(-ty * .35, -.35, .3) - pitch) * Math.min(1, dt * 6);
    let rf = 4, rs = 4, lf = 4, ls = 4, y = 0, rotY = yaw * .3 - .25, body = 0, sq = 0, xo = 0;
    if (pointAt) { rf = 82; rs = 10; rotY = -.6; }
    // horror games: he gets spooked by fast mouse moves and random noises
    if (HORROR && !reduce && scare < 0 && (speed > 140 || t > nextScare)) { scare = t; nextScare = t + 7 + Math.random() * 6; speed = 0; blip("glitch"); }
    if (scare >= 0) { const f = t - scare, u = W(f, 0, 1.2); ls = 4 + u * 150; rs = 4 + u * 150; lf = rf = 4 + u * 30; xo = Math.sin(f * 60) * .03 * u; y += Math.sin(clamp(f / .35, 0, 1) * Math.PI) * .25; rotY += u * .3; if (f > 1.2) scare = -1; }
    if (emote) { et += dt; const f = et, u = W(f, 0, 1.6);
      if (emote === "wave") { rs = 4 + u * (146 + 22 * Math.sin(f * 12)); rf = 12 * u; }
      if (emote === "point") { rf = 4 + u * 84; rotY = 0; }
      if (emote === "jump") { const x = clamp((f - .1) / .6, 0, 1); y += Math.sin(x * Math.PI) * .55; rs += 140 * Math.sin(x * Math.PI); ls += 140 * Math.sin(x * Math.PI); }
      if (emote === "spin") { const x = clamp(f / .9, 0, 1); rotY += x * x * (3 - 2 * x) * Math.PI * 2; y += Math.sin(x * Math.PI) * .35; }
      if (emote === "freeze") { const s = 1 - .55 * clamp(f / .25, 0, 1) * (f < 1 ? 1 : 1 - clamp((f - 1) / .15, 0, 1)); J.mat.color.setScalar(s); ls = rs = 4 + u * 66; lf = rf = 4 + u * 26; if (f > 1) body = Math.exp(-(f - 1) * 9) * Math.sin((f - 1) * 60) * .05; }
      if (f > 1.7) { emote = null; J.mat.color.setScalar(1); } }
    const h = pIn && over(); if (h !== hovering) { hovering = h; document.body.style.cursor = h ? "pointer" : ""; if (h) blip("pop"); }
    if (hovering) { rs += 8; ls += 8; y += .02; }
    J.root.position.set(xo, y, 0); J.root.rotation.y = rotY; J.body.rotation.x = body; J.body.scale.y = 1 + Math.sin(t * 2.1) * .008 - sq;
    J.head.rotation.set(pitch, yaw * .7, Math.sin(t * .9) * .02);
    const sw = Math.sin(t * 1.6) * 2; setArm(J.armR, rf + sw, rs, -1); setArm(J.armL, lf - sw, ls, 1);
    updateOutfit(J, t); shadow.scale.setScalar(1 - Math.min(.5, y));
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
