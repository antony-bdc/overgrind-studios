/* Overgrind 3D gear: our logo as a real model.
   1) Intro: four studded segments fly together, lock, and the camera flies through the hole into the page.
   2) Scroll companion: the gear docks into slots on the page (.g-slot / data-g), rolls along the roadmap rail
      and stands big in the studio and join sections. Position and size always come from the DOM slot. */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/addons/environments/RoomEnvironment.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PAL = [0xE2202E, 0xE8A400, 0x2450FF, 0x7B45F5];
const cv = document.createElement("canvas"); cv.className = "gear3d"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv);
let R;
try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" }); }
catch (e) { cv.remove(); window.dispatchEvent(new Event("og:intro-done")); throw e; }
R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7;
const cam = new THREE.PerspectiveCamera(30, 1, .05, 100); cam.position.set(0, 0, 10);
const key = new THREE.DirectionalLight(0xfff4e6, 2.4); key.position.set(3, 5, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe6ff, 1.6); rim.position.set(-5, 2, -3); scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, .5));

/* ---------- the model ---------- */
const OUT = 1, ROOT = .78, HOLE = .34, TEETH = 12, DEPTH = .3, GAP = .035;
const tooth = (a) => { const p = (((a * TEETH) / (Math.PI * 2)) % 1 + 1) % 1; const s = (x, e0, e1) => Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  const k = s(p, .02, .1) * (1 - s(p, .5, .58)); const kk = k * k * (3 - 2 * k); return ROOT + (OUT - ROOT) * kk; };
const OFF = .79 * Math.PI * 2 / TEETH; const gear = new THREE.Group(), body = new THREE.Group(); gear.add(body); scene.add(gear);
const segs = [], studs = [];
const studGeo = new THREE.CylinderGeometry(.075, .075, .07, 28); studGeo.rotateX(Math.PI / 2);
const studTop = new THREE.CylinderGeometry(.06, .075, .012, 28); studTop.rotateX(Math.PI / 2);
for (let q = 0; q < 4; q++) {
  const a0 = q * Math.PI / 2 + GAP + OFF, a1 = (q + 1) * Math.PI / 2 - GAP + OFF, sh = new THREE.Shape(), N = 140;
  for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N, r = tooth(a); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  for (let i = 0; i <= 40; i++) { const a = a1 - (a1 - a0) * i / 40; sh.lineTo(Math.cos(a) * HOLE, Math.sin(a) * HOLE); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: true, bevelThickness: .045, bevelSize: .03, bevelSegments: 5, curveSegments: 8 }); geo.translate(0, 0, -DEPTH / 2);
  const mat = new THREE.MeshPhysicalMaterial({ color: PAL[q], roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .12 });
  const seg = new THREE.Group(), mesh = new THREE.Mesh(geo, mat); seg.add(mesh);
  const mid = (a0 + a1) / 2; seg.userData = { mid, dir: new THREE.Vector3(Math.cos(mid), Math.sin(mid), 0) };
  for (const [ra, rr] of [[-.26, .6], [0, .6], [.26, .6], [-.13, .9], [.13, .9]]) {
    const a = mid + ra * (rr > .8 ? .8 : 1), r = rr > .8 ? tooth(a) * .88 : rr; if (rr > .8 && tooth(a) < .95) continue;
    const st = new THREE.Group(); st.position.set(Math.cos(a) * r, Math.sin(a) * r, DEPTH / 2 + .045 + .035);
    const m1 = new THREE.Mesh(studGeo, mat), m2 = new THREE.Mesh(studTop, mat); m2.position.z = .04; st.add(m1, m2); seg.add(st); studs.push(st);
  }
  body.add(seg); segs.push(seg);
}
/* dark hub with four little studs, like the logo */
{ const hs = new THREE.Shape(); hs.absarc(0, 0, HOLE - .03, 0, Math.PI * 2, false); const hh = new THREE.Path(); hh.absarc(0, 0, .13, 0, Math.PI * 2, true); hs.holes.push(hh);
  const g = new THREE.ExtrudeGeometry(hs, { depth: DEPTH * .8, bevelEnabled: true, bevelThickness: .03, bevelSize: .02, bevelSegments: 4, curveSegments: 48 }); g.translate(0, 0, -DEPTH * .4);
  const m = new THREE.MeshPhysicalMaterial({ color: 0x2b2b31, roughness: .35, clearcoat: .8, clearcoatRoughness: .2 }); const hub = new THREE.Mesh(g, m); body.add(hub);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, st = new THREE.Mesh(studGeo, m); st.scale.setScalar(.6); st.position.set(Math.cos(a) * .22, Math.sin(a) * .22, DEPTH * .4 + .05); hub.add(st); } }

/* ---------- layout ---------- */
let W = 1, H = 1; const halfH = () => Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
function resize(){ W = innerWidth; H = innerHeight; R.setSize(W, H, false); cv.style.width = W + "px"; cv.style.height = H + "px"; cam.aspect = W / H; cam.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
const px2world = (x, y) => { const h = halfH(); return new THREE.Vector3((x / W * 2 - 1) * h * cam.aspect, -(y / H * 2 - 1) * h, 0); };
const pxSize = (p) => p / H * 2 * halfH();

/* state: screen centre (px), radius (px), opacity, tilt */
const S = { x: W * .5, y: H * .5, r: 0, o: 0, rx: 0, ry: 0, spin: 0 };
const mouse = { x: 0, y: 0 }; addEventListener("pointermove", (e) => { mouse.x = e.clientX / W - .5; mouse.y = e.clientY / H - .5; }, { passive: true });
let lastY = scrollY, vel = 0, mode = "intro", introTL = null, introStart = performance.now();

function slotTarget(){
  const slots = document.querySelectorAll("[data-g]"); let best = null, bestV = 0;
  slots.forEach((el) => { const r = el.getBoundingClientRect(); if (!r.height) return; const vis = Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)) / Math.min(r.height, H); if (vis > bestV){ bestV = vis; best = { el, r, kind: el.dataset.g }; } });
  if (!best || bestV < .05) return null;
  const { r, kind } = best;
  if (kind === "roll"){ // the rail on top of the roadmap: the gear rolls along it
    const rad = Math.min(46, W * .05), p = Math.min(1, Math.max(0, (H * .85 - r.top) / (H * .7)));
    const x = r.left + rad + (r.width - rad * 2) * p; return { x, y: r.top + 12 - rad + 2, r: rad, roll: true, o: 1 };
  }
  const rad = Math.min(r.width, r.height) / 2; return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: rad, o: 1, tilt: kind === "big" ? .35 : .55 };
}

/* ---------- intro ---------- */
const intro = document.querySelector(".intro");
function runIntro(){
  mode = "intro"; cv.classList.add("on-intro");
  const g = window.gsap; if (!g){ endIntro(); return; }
  const rad = Math.min(W, H) * .17; S.x = W / 2; S.y = H / 2; S.r = rad; S.o = 1;
  segs.forEach((s, i) => { s.position.copy(s.userData.dir).multiplyScalar(2.6).add(new THREE.Vector3(0, 0, 3 - i)); s.rotation.set(1.2 * (i % 2 ? 1 : -1), 2 - i, 1.4 * i); });
  studs.forEach((s) => s.scale.setScalar(.001));
  body.rotation.set(-.5, -1.3, 0);
  const tl = g.timeline({ paused: true, onComplete: endIntro }); window.__gearTL = introTL = tl;
  segs.forEach((s, i) => { tl.to(s.position, { x: 0, y: 0, z: 0, duration: .85, ease: "expo.out" }, .08 * i).to(s.rotation, { x: 0, y: 0, z: 0, duration: .85, ease: "expo.out" }, .08 * i); });
  tl.to(body.rotation, { x: 0, y: 0, duration: 1.0, ease: "expo.out" }, .1)
    .to(studs.map((s) => s.scale), { x: 1, y: 1, z: 1, duration: .35, ease: "back.out(3)", stagger: .012 }, .75)
    .to(S, { spin: "+=" + Math.PI / 2, duration: .45, ease: "back.inOut(2.2)" }, 1.15)
    .to(S, { r: Math.max(W, H) * 5.5, duration: .75, ease: "power3.in" }, 1.6)
    .to(body.rotation, { z: "+=1.2", duration: .75, ease: "power2.in" }, 1.6)
    .to(intro, { autoAlpha: 0, duration: .35, ease: "power1.out" }, 1.95);
}
function endIntro(){ if (intro) intro.classList.add("done"); cv.classList.remove("on-intro"); segs.forEach((s) => { s.position.set(0, 0, 0); s.rotation.set(0, 0, 0); }); studs.forEach((s) => s.scale.setScalar(1)); body.rotation.set(0, 0, 0); S.o = 0; S.r = 40; mode = "scroll"; window.dispatchEvent(new Event("og:intro-done")); }
if (window.__ogIntro3d && !reduce){ runIntro(); try { R.compile(scene, cam); } catch (e) {} } else endIntro();

/* ---------- loop ---------- */
const clock = new THREE.Clock(); let rollA = 0, prevX = null;
function frame(){
  const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  if (mode === "intro" && introTL && !window.__gearHold){ introTL.time(Math.min(introTL.duration(), introTL.time() + Math.min(dt, 1 / 10)), false); if (performance.now() - introStart > 6200) introTL.progress(1); }
  vel += ((scrollY - lastY) - vel) * .2; lastY = scrollY;
  if (mode === "scroll"){
    const T = slotTarget(), k = 1 - Math.pow(.0009, dt);
    if (T){ S.x += (T.x - S.x) * k; S.y += (T.y - S.y) * k; S.r += (T.r - S.r) * k; S.o += (1 - S.o) * k;
      if (T.roll){ if (prevX !== null) rollA -= (S.x - prevX) / Math.max(S.r, 1); prevX = S.x; } else prevX = null;
      S.rx += ((T.roll ? 0 : -mouse.y * .5 + .12) - S.rx) * k; S.ry += ((T.roll ? 0 : mouse.x * .7 + (T.tilt || 0) * Math.sin(t * .4)) - S.ry) * k; }
    else { S.o += (0 - S.o) * k * 1.4; S.r *= 1 - .4 * k; prevX = null; }
    S.spin += dt * .35 + vel * .004;
  }
  const vis = S.o > .01 && S.r > 1; cv.style.opacity = mode === "intro" ? 1 : S.o.toFixed(3);
  if (vis || mode === "intro"){
    gear.position.copy(px2world(S.x, S.y)); gear.scale.setScalar(pxSize(S.r));
    gear.rotation.set(S.rx, S.ry, S.spin + rollA);
    R.render(scene, cam);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
