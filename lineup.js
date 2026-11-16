/* Overgrind crew stage: FreshStatue (founder, centre stage) and the crew in 3D. They follow your cursor,
   react and talk when you click them, high-five when you stop moving, wear game outfits and open as trading cards. */
import * as THREE from "./vendor/three.module.min.js";
import { EffectComposer } from "./vendor/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "./vendor/addons/postprocessing/ShaderPass.js";
import { LITE, loadCrew, makeAvatar, boxRig, setArm, setOutfit, updateOutfit, say, blip, isMuted, setMuted, preloadVoices, clamp, sm, hash } from "./crew3d.js";

const section = document.querySelector(".lineup");
const canvas = document.getElementById("lineup-gl");
// lazy: only build the stage once the section is about to scroll in
if (section && canvas) { const io = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io.disconnect(); init().catch((e) => { console.warn("lineup", e); section.classList.add("lu-fallback"); }); }, { rootMargin: "900px 0px" }); io.observe(section); }

async function init() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 860px)").matches;
  const de = () => document.documentElement.lang === "de";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  const PR = Math.min(LITE ? 1 : small ? 1.25 : 1.5, devicePixelRatio || 1);
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060607);
  scene.fog = new THREE.Fog(0x060607, 10, 24);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

  const data = await loadCrew("");
  /* ---------- the crew ---------- */
  const SP = small ? 1.4 : 1.6;
  const shadowMat = new THREE.MeshStandardMaterial({ color: 0x2a2a31, roughness: .3, metalness: .15, emissive: 0x0d0604 });
  const holo = new THREE.MeshBasicMaterial({ color: 0xff4d1a, transparent: true, opacity: .14, depthWrite: false, blending: THREE.AdditiveBlending });
  const fs = makeAvatar("fs", data), an = makeAvatar("an", data), ex = boxRig(shadowMat), gi = boxRig(shadowMat), you = boxRig(holo);
  const CREW = [];
  const add = (J, x, z, opt) => { J.root.position.set(x, .19, z); scene.add(J.root); const c = { J, x, z, ...opt, yaw: 0, pitch: 0, emote: null, et: 0, hover: 0, focus: 0 }; J.meshes.forEach((m) => (m.userData.who = CREW.length)); CREW.push(c); return c; };
  add(fs, 0, .45, { key: "fs", founder: true });
  add(an, SP, 0, { key: "an" });
  add(ex, -2 * SP, 0, { key: "ex", locked: true });
  add(gi, -SP, 0, { key: "gi", locked: true });
  add(you, 2 * SP, 0, { key: "you", ghost: true });
  [ex, gi].forEach((J) => J.meshes.forEach((m) => m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xff4d1a, transparent: true, opacity: .35 })))));
  you.meshes.forEach((m) => m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xff7a4d, transparent: true, opacity: .85 }))));
  function qSprite() { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.font = "900 104px Unbounded, system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#FF4D1A"; g.fillText("?", 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(.42, .42, 1); return s; }
  [ex, gi].forEach((J) => { const q = qSprite(); J.head.add(q); J.q = q; });

  // mirror twins for the glossy floor (desktop only)
  const MIRROR = !small && !LITE;
  if (MIRROR) {
    [fs, an].forEach((J) => { const m = makeAvatar(J.key, data); m.mat.color.setScalar(.32); if (m.extraMat) m.extraMat.color.multiplyScalar(.32); const g = new THREE.Group(); g.scale.y = -1; g.add(m.root); scene.add(g); J.twin = m; });
  }

  /* ---------- stage ---------- */
  function radialTex(stops, s = 256) { const c = document.createElement("canvas"); c.width = c.height = s; const g = c.getContext("2d"); const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach((q) => gr.addColorStop(q[0], q[1])); g.fillStyle = gr; g.fillRect(0, 0, s, s); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: .22, metalness: .4, transparent: MIRROR, opacity: MIRROR ? .86 : 1 }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1; scene.add(floor);
  // neon wordmark on the back wall
  const NW = 2048, NH = 512, nc = document.createElement("canvas"); nc.width = NW; nc.height = NH; const ng = nc.getContext("2d");
  const ntex = new THREE.CanvasTexture(nc); ntex.colorSpace = THREE.SRGBColorSpace;
  function paintNeon() {
    ng.clearRect(0, 0, NW, NH); ng.textAlign = "center"; ng.textBaseline = "middle"; ng.lineJoin = "round";
    ng.font = "900 300px Unbounded, system-ui"; ng.letterSpacing = "-10px";
    ng.shadowColor = "#FF4D1A"; ng.shadowBlur = 40; ng.strokeStyle = "#FF6A3D"; ng.lineWidth = 14; ng.strokeText("OVERGRIND", NW / 2, NH * .44);
    ng.shadowBlur = 0; ng.strokeStyle = "#FFE3D6"; ng.lineWidth = 4; ng.strokeText("OVERGRIND", NW / 2, NH * .44);
    ng.font = "800 64px Unbounded, system-ui"; ng.letterSpacing = "40px"; ng.fillStyle = "#FFB89E"; ng.shadowColor = "#FF4D1A"; ng.shadowBlur = 20; ng.fillText("STUDIOS", NW / 2 + 20, NH * .86);
    ng.letterSpacing = "0px"; ntex.needsUpdate = true;
  }
  await document.fonts.load("900 100px Unbounded").catch(() => {}); paintNeon();
  const neonMat = new THREE.MeshBasicMaterial({ map: ntex, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0, 0, 0) });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), neonMat); neon.position.set(0, 3.9, -6.5); scene.add(neon);
  const wallGlow = new THREE.Mesh(new THREE.PlaneGeometry(18, 7), new THREE.MeshBasicMaterial({ map: radialTex([[0, "rgba(255,77,26,.22)"], [1, "rgba(0,0,0,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  wallGlow.position.set(0, 3.7, -6.6); scene.add(wallGlow);
  // pedestals with studs
  const pedTop = new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: .35, metalness: .1 });
  const studGeo = new THREE.CylinderGeometry(.06, .06, .05, 16);
  CREW.forEach((c) => {
    const R = c.founder ? 1.25 : 1; const g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.scale.set(R, 1, R); scene.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.62, .66, .14, 48), pedTop); base.position.y = .07; g.add(base);
    if (c.founder) { const step = new THREE.Mesh(new THREE.CylinderGeometry(.74, .78, .07, 48), pedTop); step.position.y = .035; g.add(step); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.645, .012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff4d1a, transparent: true, opacity: 0, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = .135; g.add(ring);
    const studs = new THREE.InstancedMesh(studGeo, pedTop, 40); let k = 0; const m4 = new THREE.Matrix4();
    for (let a = 0; a < 40; a++) { const r = a < 16 ? .5 : a < 28 ? .36 : .2, n = a < 16 ? 16 : 12, j = a < 16 ? a : a < 28 ? a - 16 : a - 28; const th = j / n * Math.PI * 2; m4.makeTranslation(Math.cos(th) * r, .165, Math.sin(th) * r); studs.setMatrixAt(k++, m4); }
    g.add(studs);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: radialTex([[0, "rgba(255,150,90,.55)"], [.4, "rgba(255,77,26,.16)"], [1, "rgba(0,0,0,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = .006; pool.renderOrder = 2; g.add(pool);
    c.ring = ring; c.pool = pool;
  });
  // light beams: one per pedestal + two sweeping searchlights
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uI: { value: 0 }, uCol: { value: new THREE.Color(0xffe6d2) } },
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY=uv.y; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }",
    fragmentShader: "uniform float uI; uniform vec3 uCol; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(abs(dot(vN,vV)),2.); float a=f*pow(vY,1.5)*uI*.11; gl_FragColor=vec4(uCol*a,a); }",
  });
  CREW.forEach((c) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.1, c.founder ? 1.15 : .9, 6, 40, 1, true), beamMat.clone()); b.position.set(c.x, 3.1, c.z); scene.add(b); c.beam = b; });
  const sweeps = [-1, 1].map((s) => { const piv = new THREE.Group(); piv.position.set(s * 6, 6.5, -2.5); const b = new THREE.Mesh(new THREE.CylinderGeometry(.05, 1.3, 9, 32, 1, true), beamMat.clone()); b.material.uniforms.uCol.value = new THREE.Color(s < 0 ? 0x6aa8ff : 0xff6a3d); b.position.y = -4.5; piv.add(b); scene.add(piv); return piv; });
  // drifting floor smoke
  const smokeTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); for (let i = 0; i < 40; i++) { const x = 128 + (hash(i) - .5) * 120, y = 128 + (hash(i * 2.3) - .5) * 60, r = 30 + hash(i * 5.1) * 60; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.08)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } return new THREE.CanvasTexture(c); })();
  const smoke = []; for (let i = 0; i < (small ? 6 : 12); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: .5, color: 0xb8b0a8 })); s.scale.set(5, 1.8, 1); s.position.set((hash(i * 9.7) - .5) * 14, .5, -1.5 + hash(i * 3.3) * 3); s.userData.v = .08 + hash(i) * .12; scene.add(s); smoke.push(s); }
  // dust
  const DN = small ? 160 : 360, dpos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) { dpos[i * 3] = (hash(i * 3.1) - .5) * 12; dpos[i * 3 + 1] = hash(i * 1.3) * 4; dpos[i * 3 + 2] = (hash(i * 7.7) - .5) * 4; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dpos.slice(), 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: .03, map: radialTex([[0, "rgba(255,255,255,1)"], [.3, "rgba(255,235,215,.5)"], [1, "rgba(0,0,0,0)"]], 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55, color: 0xffe2c8 }));
  scene.add(dust);
  // stud particles
  const PN = 260, pState = []; const parts = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, .04, .06), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, emissive: 0x331006 }), PN);
  parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parts.frustumCulled = false; scene.add(parts);
  const pCols = [0xff4d1a, 0xf2efe9, 0xffc34d, 0xd52b1e, 0x2bd4e0].map((c) => new THREE.Color(c));
  for (let i = 0; i < PN; i++) { pState.push({ life: 0 }); parts.setColorAt(i, pCols[0]); }
  let pHead = 0, hitFx = 0;
  function burst(x, y, z, n, speed, cols, fx = .5) {
    for (let k = 0; k < n; k++) { const p = pState[pHead]; const u = Math.random(), a = Math.random() * 6.283;
      Object.assign(p, { life: .9 + Math.random() * .7, age: 0, x, y, z, vx: Math.cos(a) * speed * (.4 + u), vz: Math.sin(a) * speed * (.4 + u) * .7, vy: speed * (1 + Math.random() * 1.2), r: Math.random() * 6 });
      parts.setColorAt(pHead, cols[k % cols.length]); pHead = (pHead + 1) % PN; }
    parts.instanceColor.needsUpdate = true; hitFx = Math.max(hitFx, fx);
  }

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xcfd6ff, 0x140a06, .35));
  const key = new THREE.DirectionalLight(0xfff1e4, 1.5); key.position.set(-3, 5, 6); scene.add(key);
  const rimO = new THREE.SpotLight(0xff4d1a, 45, 20, .7, .7, 1.2); rimO.position.set(4, 3.5, -3.5); rimO.target.position.set(0, 1, 0); scene.add(rimO, rimO.target);
  const rimB = new THREE.SpotLight(0x6aa8ff, 25, 20, .7, .7, 1.2); rimB.position.set(-4.5, 3, -3); rimB.target.position.set(-1, 1, 0); scene.add(rimB, rimB.target);
  const spot = new THREE.SpotLight(0xffffff, 0, 12, .38, .55, 1.1); spot.position.set(0, 5.6, 1.6); scene.add(spot, spot.target);

  /* ---------- post: bloom + punch ---------- */
  const composer = new EffectComposer(renderer); composer.setPixelRatio(PR);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .42, .5, .93); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fin = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uCA: { value: 0 }, uAsp: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: "uniform sampler2D tDiffuse; uniform float uT,uCA,uAsp; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); } void main(){ vec2 c=vUv-.5; float d=length(c*vec2(uAsp,1.)); vec2 o=c*uCA*.014; vec3 col=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b); col*=mix(1.,.6,smoothstep(.5,1.3,d)); col+=(h(vUv*900.+uT)-.5)*.03; gl_FragColor=vec4(col,1.); }",
  });
  composer.addPass(fin);

  /* ---------- scroll story ---------- */
  const steps = [...section.querySelectorAll(".lu-step")], tags = [...section.querySelectorAll(".lu-tag")], dots = [...section.querySelectorAll(".lu-dots i")];
  const OX = small ? 0 : -.85;
  const SHOTS = [ // camera position + look target, f = focused member (-1 all, 23 the two locked)
    { p: [small ? 0 : -1.2, 2.5, small ? 14 : 12.5], l: [small ? 0 : -1.2, small ? .6 : 1.0], f: -1 },
    { p: [OX, 1.7, small ? 8 : 6.0], l: [OX, small ? 1.05 : 1.2], f: 0 },
    { p: [SP + OX, 1.65, small ? 7.6 : 5.7], l: [SP + OX, small ? 1.0 : 1.2], f: 1 },
    { p: [-1.5 * SP + OX * .9, 1.75, small ? 9.4 : 6.4], l: [-1.5 * SP + OX * .9, small ? .95 : 1.1], f: 23 },
    { p: [2 * SP + OX, 1.65, small ? 7.8 : 5.8], l: [2 * SP + OX, small ? 1.0 : 1.15], f: 4 },
  ];
  let prog = 0, curStep = -1, inView = false, entered = 0, enterT = -1;
  function readScroll() {
    const r = section.getBoundingClientRect(), total = r.height - innerHeight;
    prog = clamp(-r.top / Math.max(1, total), 0, 1);
    inView = r.bottom > 0 && r.top < innerHeight;
    if (r.top < innerHeight * .6 && !entered) entered = 1;
    const s = Math.round(prog * (SHOTS.length - 1));
    if (s !== curStep) { curStep = s; steps.forEach((el, i) => el.classList.toggle("on", i === s)); dots.forEach((el, i) => el.classList.toggle("on", i === s)); }
  }
  addEventListener("scroll", readScroll, { passive: true }); readScroll();
  const goStep = (i) => { const r = section.getBoundingClientRect(); const y = scrollY + r.top + (r.height - innerHeight) * (i / (SHOTS.length - 1)) + 2; window.__lenis ? window.__lenis.scrollTo(y) : scrollTo({ top: y, behavior: "smooth" }); };
  dots.forEach((d, i) => d.addEventListener("click", () => goStep(i)));

  /* ---------- sound toggle ---------- */
  const muteBtn = section.querySelector(".lu-mute");
  const syncMute = () => { if (muteBtn) { muteBtn.classList.toggle("off", isMuted()); muteBtn.setAttribute("aria-pressed", String(!isMuted())); } };
  if (muteBtn) muteBtn.addEventListener("click", () => { setMuted(!isMuted()); syncMute(); if (!isMuted()) blip("pop"); });
  syncMute(); document.addEventListener("og-mute", syncMute);

  /* ---------- pointer ---------- */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(0, .1), look = new THREE.Vector3(0, 1.4, 6);
  let lastMove = performance.now(), hovered = -1, pointerIn = false;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3.2), hit = new THREE.Vector3();
  const setMouse = (e) => { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  canvas.addEventListener("pointermove", (e) => { setMouse(e); lastMove = performance.now(); pointerIn = true; });
  canvas.addEventListener("pointerleave", () => { pointerIn = false; hovered = -1; canvas.style.cursor = ""; });
  canvas.addEventListener("click", (e) => { setMouse(e); const who = pick(); if (who >= 0) poke(who); });
  function pick() { ray.setFromCamera(mouse, camera); const hits = ray.intersectObjects(CREW.flatMap((c) => c.J.meshes), false); return hits.length ? hits[0].object.userData.who : -1; }
  const EMOTES = { fs: ["freeze", "wave", "jump", "point"], an: ["spin", "wave", "jump", "point"], ex: ["glitch", "jump"], gi: ["glitch", "jump"], you: ["hello"] };
  const VOICE = { fs: { freeze: "touch", wave: "hi", jump: "grind", point: "founder", dance: "built", five: "five" }, an: { spin: "spin", wave: "hi", jump: "go", point: "crown", dance: "go", five: "five" } };
  const clickTimes = {};
  function poke(who) {
    const c = CREW[who], now = performance.now() / 1000; lastMove = performance.now();
    const ct = (clickTimes[who] = (clickTimes[who] || []).filter((t) => now - t < 1.1)); ct.push(now);
    const list = EMOTES[c.key]; c.cycle = ((c.cycle == null ? -1 : c.cycle) + 1) % list.length;
    play(c, ct.length >= 3 ? "dance" : list[c.cycle]);
    if (c.ghost) { const a = section.querySelector(".lu-cta"); if (a) { a.classList.remove("pulse"); void a.offsetWidth; a.classList.add("pulse"); } }
  }
  function play(c, name) {
    c.emote = name; c.et = 0; const x = c.x, z = c.z;
    if (VOICE[c.key] && VOICE[c.key][name]) say(c.key, VOICE[c.key][name]);
    blip(name === "glitch" ? "glitch" : name === "jump" || name === "dance" ? "thud" : "pop");
    if (name === "jump" || name === "dance") setTimeout(() => burst(x, .25, z + .2, 26, 1.6, [pCols[0], pCols[1], pCols[2]], .6), 420);
    if (name === "freeze") setTimeout(() => { burst(x, 1.4, z + .2, 34, 1.4, [pCols[1], pCols[1], pCols[2]], .9); blip("spark"); }, 1000);
    if (name === "spin") setTimeout(() => burst(x, 2.1, z + .1, 24, 1.2, [pCols[3], pCols[0], pCols[2]], .6), 300);
    if (name === "glitch") burst(x, 1.6, z + .2, 14, .9, [pCols[0], pCols[4]], .8);
  }
  const DUR = { wave: 1.8, jump: 1.0, point: 1.6, freeze: 1.6, spin: 1.1, dance: 2.6, glitch: .9, hello: 1.6, five: 1.7 };

  /* ---------- outfits ---------- */
  const fitBar = section.querySelector(".lu-fits");
  let fitLocked = "", fitShown = "";
  function dress(k) { if (k === fitShown) return; fitShown = k; [fs, an].forEach((J) => setOutfit(J, k)); if (k) { burst(0, 2.1, .6, 18, 1, [pCols[2], pCols[0]], .5); burst(SP, 2.1, .2, 14, 1, [pCols[2], pCols[0]], .3); blip("spark"); } }
  if (fitBar) {
    fitBar.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => { fitLocked = b.dataset.fit; dress(fitLocked); fitBar.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); });
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") dress(b.dataset.fit); });
      b.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") dress(fitLocked); });
    });
  }

  /* ---------- trading cards ---------- */
  const cardWrap = document.querySelector(".lu-cardwrap");
  const CARDS = {
    0: { img: "assets/crew3d/card_fs.png", name: "FreshStatue", rar: "LEGENDARY", role: ["Founder", "Founder"], rows: [["From", "Herkunft", "Switzerland", "Schweiz"], ["Avatar", "Avatar", "Living marble statue", "Lebende Marmorstatue"], ["Signature", "Signature", "The Freeze", "The Freeze"]], quote: "We over-grind.", line: ["fs", "founder"], tone: "fs" },
    1: { img: "assets/crew3d/card_an.png", name: "Andrin", rar: "EPIC", role: ["Creator", "Creator"], rows: [["Status", "Status", "First video loading", "Erstes Video lädt"], ["Avatar", "Avatar", "Crown, hoodie, red trims", "Krone, Hoodie, rote Streifen"], ["Signature", "Signature", "Crown Spin", "Crown Spin"]], quote: "Remember the crown.", line: ["an", "video"], tone: "an" },
    2: { name: "excess", rar: "???", role: ["Developer", "Developer"], rows: [["Avatar", "Avatar", "Loading…", "Lädt…"]], quote: "", tone: "lock" },
    3: { name: "Ginoletsplay", rar: "???", role: ["Developer", "Developer"], rows: [["Avatar", "Avatar", "Loading…", "Lädt…"]], quote: "", tone: "lock" },
    4: { name: "You?", nameDe: "Du?", rar: "OPEN", role: ["Open spot", "Freier Platz"], rows: [["Wanted", "Gesucht", "Builders, scripters, modelers, designers", "Builder, Scripter, Modeler, Designer"]], quote: "", tone: "you", cta: true },
  };
  function openCard(i) {
    if (!cardWrap) return; const C = CARDS[i], L = de() ? 1 : 0;
    const el = cardWrap.querySelector(".lu-card");
    el.className = "lu-card t-" + C.tone;
    el.querySelector(".c-rar").textContent = C.rar;
    el.querySelector(".c-name").textContent = L && C.nameDe ? C.nameDe : C.name;
    el.querySelector(".c-role").textContent = C.role[L];
    el.querySelector(".c-img").innerHTML = C.img ? `<img src="${C.img}" alt="${C.name} avatar">` : `<b>?</b>`;
    el.querySelector(".c-rows").innerHTML = C.rows.map((r) => `<div><span>${r[L]}</span><b>${r[2 + L]}</b></div>`).join("");
    el.querySelector(".c-quote").textContent = C.quote ? `“${C.quote}”` : "";
    el.querySelector(".c-cta").hidden = !C.cta;
    cardWrap.hidden = false; requestAnimationFrame(() => cardWrap.classList.add("open"));
    if (C.line) say(C.line[0], C.line[1]); blip("whoosh");
    el.focus({ preventScroll: true });
  }
  function closeCard() { if (!cardWrap || cardWrap.hidden) return; cardWrap.classList.remove("open"); setTimeout(() => (cardWrap.hidden = true), 350); }
  if (cardWrap) {
    cardWrap.addEventListener("click", (e) => { if (e.target === cardWrap || e.target.closest(".c-close") || e.target.closest(".c-cta")) closeCard(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") closeCard(); });
    const card = cardWrap.querySelector(".lu-card");
    card.addEventListener("pointermove", (e) => { const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; card.style.setProperty("--rx", ((.5 - y) * 18).toFixed(2) + "deg"); card.style.setProperty("--ry", ((x - .5) * 22).toFixed(2) + "deg"); card.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); card.style.setProperty("--my", (y * 100).toFixed(1) + "%"); });
    card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  }
  tags.forEach((t) => t.addEventListener("click", () => openCard(+t.dataset.who)));
  section.querySelectorAll("[data-card]").forEach((b) => b.addEventListener("click", () => openCard(+b.dataset.card)));
  window.__luCard = openCard;
  window.__luDance = () => { play(CREW[0], "dance"); setTimeout(() => play(CREW[1], "dance"), 180); };

  /* ---------- per-frame pose ---------- */
  const wv = (t, a, b) => Math.min(clamp((t - a) / .2, 0, 1), 1 - clamp((t - (b - .2)) / .2, 0, 1));
  const lerpA = (a, b, u) => a + (b - a) * u;
  let fiveT = -1, nextFive = 7;
  function pose(c, i, t, dt) {
    const J = c.J;
    let tx = look.x - c.x, ty = look.y - 1.5, tz = look.z - c.z;
    const idle = (performance.now() - lastMove) / 1000;
    if ((!pointerIn || idle > 4) && i < 2) { tx = (i === 0 ? CREW[1].x - c.x : CREW[0].x - c.x); ty = 0; tz = .5; }
    if (c.emote && c.emote !== "glitch") { tx = camera.position.x - c.x; ty = camera.position.y - 1.5; tz = camera.position.z - c.z; }
    const yawT = clamp(Math.atan2(tx, tz), -.9, .9), pitchT = clamp(-Math.atan2(ty, Math.hypot(tx, tz)), -.35, .3);
    c.yaw += (yawT - c.yaw) * Math.min(1, dt * 6); c.pitch += (pitchT - c.pitch) * Math.min(1, dt * 6);
    if (entered && enterT < 0) enterT = t;
    const dropT = enterT >= 0 ? clamp((t - enterT - .12 * [2, 1, 0, 3, 4][i]) / .55, 0, 1) : 0;
    if (dropT >= 1 && !c.landed) { c.landed = true; burst(c.x, .2, c.z + .2, c.founder ? 30 : 16, 1.1, [pCols[1], pCols[0]], c.founder ? .9 : .3); if (c.founder) blip("thud"); }
    let y = .19 + (enterT >= 0 ? (1 - dropT) * (1 - dropT) * 5 : 50), sq = 0, rotY = c.yaw * .35, rf = 4, rs = 4, lf = 4, ls = 4, headR = 0, body = 0, xo = 0;
    const br = Math.sin(t * 2.1 + i) * .008;
    c.hover += ((hovered === i ? 1 : 0) - c.hover) * Math.min(1, dt * 8);
    rs += c.hover * 10; ls += c.hover * 10; y += c.hover * .03;
    if (i < 2 && fiveT >= 0) { const f = t - fiveT, e = wv(f, 0, DUR.five), up = sm(clamp(f / .5, 0, 1)) * (1 - sm(clamp((f - 1.2) / .4, 0, 1)));
      xo = (i === 0 ? 1 : -1) * e * .12; if (i === 0) { ls = lerpA(ls, 166, up); lf = lerpA(lf, 10, up); } else { rs = lerpA(rs, 166, up); rf = lerpA(rf, 10, up); }
      rotY = (i === 0 ? .5 : -.5) * e;
      if (f > .52 && !c.fived) { c.fived = true; if (i === 0) { burst(SP / 2, 2.25, .2, 30, 1.0, [pCols[2], pCols[0], pCols[1]], .7); blip("spark"); say(Math.random() < .5 ? "fs" : "an", "five"); } }
      if (f > DUR.five) { c.fived = false; if (i === 1) fiveT = -1; } }
    if (c.emote) {
      c.et += dt; const f = c.et, E = c.emote;
      if (E === "wave") { const u = wv(f, 0, DUR.wave); rs = lerpA(rs, 150 + 22 * Math.sin(f * 12), u); rf = lerpA(rf, 12, u); headR = .1 * u * Math.sin(f * 6); }
      if (E === "jump") { const x = clamp((f - .15) / .6, 0, 1); y += Math.sin(x * Math.PI) * .6; sq = f < .15 ? Math.sin(f / .15 * Math.PI) * .08 : x >= 1 ? Math.sin(clamp((f - .75) / .25, 0, 1) * Math.PI) * .07 : 0; const u = Math.sin(x * Math.PI); rs += 140 * u; ls += 140 * u; }
      if (E === "point") { const u = wv(f, 0, DUR.point); rf = lerpA(rf, 88, u); rs = lerpA(rs, 4, u); body = .06 * u; }
      if (E === "freeze") { const s = 1 - .55 * clamp(f / .25, 0, 1) * (f < 1 ? 1 : 1 - clamp((f - 1) / .15, 0, 1)); J.mat.color.setScalar(s); if (J.extraMat) J.extraMat.color.setRGB(.81 * s, .8 * s, .78 * s);
        const u = wv(f, 0, DUR.freeze); ls = lerpA(ls, 70, u); rs = lerpA(rs, 70, u); lf = lerpA(lf, 30, u); rf = lerpA(rf, 30, u); if (f > 1) body += Math.exp(-(f - 1) * 9) * Math.sin((f - 1) * 60) * .05; }
      if (E === "spin") { const x = clamp(f / .9, 0, 1); rotY += sm(x) * Math.PI * 2; y += Math.sin(x * Math.PI) * .35; rs += 60 * Math.sin(x * Math.PI); ls += 60 * Math.sin(x * Math.PI); }
      if (E === "dance") { const b = Math.sin(f * 9); rs = 70 + 70 * b; ls = 70 - 70 * b; rf = 30; lf = 30; y += Math.abs(Math.sin(f * 9)) * .12; rotY += Math.sin(f * 4.5) * .5; headR = .15 * Math.sin(f * 9); }
      if (E === "glitch") { xo = (hash(Math.floor(t * 40)) - .5) * .12 * (f < DUR.glitch ? 1 : 0); if (J.q) J.q.material.rotation = Math.sin(f * 30) * .3; }
      if (E === "hello") { const u = wv(f, 0, DUR.hello); rs = lerpA(rs, 150 + 20 * Math.sin(f * 12), u); ls = lerpA(ls, 150 + 20 * Math.sin(f * 12 + 1), u); }
      if (f > (DUR[E] || 1.5)) { c.emote = null; if (c.key === "fs" || c.key === "an") J.mat.color.setScalar(1); if (J.extraMat) J.extraMat.color.set(0xcfccc6); }
    }
    J.root.position.set(c.x + xo, y, c.z);
    J.root.rotation.y = rotY;
    J.body.scale.set(1 + sq * .5, 1 - sq + br, 1 + sq * .5);
    J.body.rotation.x = body;
    J.head.rotation.set(c.pitch, c.yaw * .65, headR + Math.sin(t * .9 + i) * .02);
    const sw = Math.sin(t * 1.6 + i * 2) * 2;
    setArm(J.armR, rf + sw, rs, -1); setArm(J.armL, lf - sw, ls, 1);
    if (J.q) J.q.position.set(0, .52 + Math.sin(t * 2 + i) * .04, .21);
    updateOutfit(J, t);
    if (J.twin) { const T = J.twin; T.root.position.copy(J.root.position); T.root.rotation.copy(J.root.rotation); T.body.scale.copy(J.body.scale); T.body.rotation.copy(J.body.rotation); T.head.rotation.copy(J.head.rotation); T.armR.quaternion.copy(J.armR.quaternion); T.armL.quaternion.copy(J.armL.quaternion); }
  }

  /* ---------- tags follow the heads ---------- */
  const v3 = new THREE.Vector3();
  function placeTags() {
    const r = canvas.getBoundingClientRect();
    tags.forEach((t) => { const c = CREW[+t.dataset.who]; v3.set(c.J.root.position.x, c.J.root.position.y + (c.founder ? 2.2 : 2.12), c.z).project(camera);
      t.style.transform = `translate(${(v3.x * .5 + .5) * r.width}px, ${(-v3.y * .5 + .5) * r.height}px) translate(-50%,-100%)`;
      t.classList.toggle("show", !!entered && (hovered === +t.dataset.who || curStep === 0)); });
  }

  /* ---------- loop ---------- */
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); fin.uniforms.uAsp.value = w / h; }
  new ResizeObserver(resize).observe(canvas); resize();
  const camP = new THREE.Vector3(...SHOTS[0].p), camL = new THREE.Vector3(SHOTS[0].l[0], SHOTS[0].l[1], 0);
  let last = performance.now() / 1000, t = 0, neonOn = -1;
  section.classList.add("lu-ready"); preloadVoices("fs"); preloadVoices("an");
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    if (!inView) { last = performance.now() / 1000; return; }
    const now = performance.now() / 1000, dt = Math.min(window.__luDt || .05, now - last); last = now; t += dt;
    const stepF = prog * (SHOTS.length - 1), a = Math.floor(stepF), b = Math.min(SHOTS.length - 1, a + 1), x = sm(stepF - a);
    const A = SHOTS[a], B = SHOTS[b];
    const tp = new THREE.Vector3(...A.p.map((v, k) => v + (B.p[k] - v) * x)), tlk = new THREE.Vector3(A.l[0] + (B.l[0] - A.l[0]) * x, A.l[1] + (B.l[1] - A.l[1]) * x, 0);
    if (!small && pointerIn) { tp.x += mouse.x * .25; tp.y += mouse.y * .12; }
    const k = reduce ? 1 : Math.min(1, dt * 4); camP.lerp(tp, k); camL.lerp(tlk, k);
    camera.position.copy(camP); camera.lookAt(camL);
    ray.setFromCamera(mouse, camera); if (ray.ray.intersectPlane(plane, hit)) look.lerp(hit, Math.min(1, dt * 10));
    if (pointerIn && !small) { const h = pick(); if (h !== hovered) { hovered = h; canvas.style.cursor = h >= 0 ? "pointer" : ""; if (h >= 0) blip("pop"); } }
    if ((now - lastMove / 1000) > 4 && fiveT < 0 && t > nextFive && !CREW[0].emote && !CREW[1].emote) { fiveT = t; nextFive = t + 10; }
    if (enterT >= 0 && neonOn < 0 && t - enterT > .9) neonOn = t;
    let nf = 0; if (neonOn >= 0) { const f = t - neonOn; nf = f > .9 ? 1 - (hash(Math.floor(t * 8)) > .97 ? .5 : 0) : [0, 1, 0, 0, 1, .3, 1, 0, 1][Math.floor(f * 10)] ?? 1; }
    neonMat.color.setScalar(nf * 1.25); wallGlow.material.opacity = nf;
    const focus = SHOTS[Math.round(stepF)].f;
    CREW.forEach((c, i) => { const on = focus === -1 ? (c.founder ? .9 : .5) : focus === i || (focus === 23 && (i === 2 || i === 3)) ? 1 : .18; c.focus += (on - c.focus) * Math.min(1, dt * 3);
      c.beam.material.uniforms.uI.value = c.focus * c.focus * (c.locked ? .6 : 1) * (c.ghost ? .8 : 1); c.pool.material.opacity = c.focus * .9; c.ring.material.opacity = c.focus * .8 + c.hover * .2; pose(c, i, t, dt); });
    const fc = focus >= 0 && focus < 5 ? CREW[focus] : CREW[0]; spot.intensity += ((focus === 23 ? 0 : 30) - spot.intensity) * Math.min(1, dt * 3); spot.target.position.set(fc.x, 1, fc.z); spot.position.x = fc.x;
    sweeps.forEach((s, i) => { s.rotation.z = Math.sin(t * .45 + i * 2.2) * .5 + (i ? -.35 : .35); s.rotation.x = Math.sin(t * .31 + i) * .25; s.children[0].material.uniforms.uI.value = .55 * nf; });
    smoke.forEach((s, i) => { s.position.x += s.userData.v * dt * (i % 2 ? 1 : -1); if (s.position.x > 8) s.position.x = -8; if (s.position.x < -8) s.position.x = 8; s.material.opacity = .35 + .15 * Math.sin(t * .4 + i); });
    const dp = dGeo.attributes.position.array; for (let i = 0; i < DN; i++) { dp[i * 3 + 1] = (dpos[i * 3 + 1] + t * .05 * (.5 + hash(i))) % 4; dp[i * 3] = dpos[i * 3] + Math.sin(t * .3 + i) * .06; } dGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < PN; i++) { const p = pState[i]; if (p.life <= 0) { m4.makeScale(0, 0, 0); parts.setMatrixAt(i, m4); continue; }
      p.age += dt; if (p.age > p.life) { p.life = 0; continue; } p.vy -= 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < .02) { p.y = .02; p.vy *= -.35; p.vx *= .7; p.vz *= .7; }
      const s = 1 - Math.pow(p.age / p.life, 3); e4.set(p.r + p.age * 6, p.r * 2 + p.age * 4, 0); q4.setFromEuler(e4); s4.setScalar(s); p4.set(p.x, p.y, p.z); m4.compose(p4, q4, s4); parts.setMatrixAt(i, m4); }
    parts.instanceMatrix.needsUpdate = true;
    hitFx *= Math.pow(.02, dt); fin.uniforms.uCA.value = hitFx; fin.uniforms.uT.value = t;
    placeTags();
    composer.render(dt);
  }
  requestAnimationFrame(frame);
}
