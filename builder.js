/* Overgrind avatar builder: an R6 grinder you colour, dress in a game outfit and export as a crew card. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./vendor/addons/environments/RoomEnvironment.js";
import { LITE, setArm, setOutfit, updateOutfit, blip, clamp, sm } from "./crew3d.js";

const sec = document.querySelector(".builder"), canvas = document.getElementById("builder-gl");
if (sec && canvas) { const io = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io.disconnect(); init().catch((e) => { console.warn("builder", e); sec.classList.add("bld-fallback"); }); }, { rootMargin: "600px 0px" }); io.observe(sec); }

const de = () => document.documentElement.lang === "de";
const SW = {
  skin: ["#F2EFE9", "#F5CDA7", "#E2A878", "#C68642", "#8D5524", "#5C3A21", "#FFD23F"],
  shirt: ["#FF4D1A", "#1A1A1F", "#F2EFE9", "#D52B1E", "#2BD4E0", "#1E5BD5", "#A47BFF", "#8BE04E"],
  pants: ["#1A1A1F", "#2B3A67", "#5A5A66", "#F2EFE9", "#7A4B2A", "#2E7D32", "#FF4D1A"],
};
const FACES = ["smile", "grin", "cool", "wink", "angry", "chill", "shock"];
const FACE_NAMES = { smile: ["Smile", "Lächeln"], grin: ["Grin", "Grinsen"], cool: ["Shades", "Sonnenbrille"], wink: ["Wink", "Zwinkern"], angry: ["Tryhard", "Tryhard"], chill: ["Chill", "Chill"], shock: ["Shocked", "Schock"] };

function drawFace(g, cx, cy, s, face) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = g.strokeStyle = "#111"; g.lineCap = "round"; g.lineJoin = "round";
  const eye = (x, y, w = 9, h = 15) => { g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); };
  const mouth = (w, d, lw = 7) => { g.lineWidth = lw; g.beginPath(); g.moveTo(-w, 16); g.quadraticCurveTo(0, 16 + d, w, 16); g.stroke(); };
  if (face === "smile") { eye(-22, -12); eye(22, -12); mouth(30, 26); }
  if (face === "grin") { eye(-22, -14); eye(22, -14); g.beginPath(); g.moveTo(-34, 10); g.quadraticCurveTo(0, 56, 34, 10); g.closePath(); g.fill(); g.fillStyle = "#fff"; g.fillRect(-26, 12, 52, 9); }
  if (face === "cool") { g.beginPath(); g.roundRect(-46, -26, 40, 26, 8); g.roundRect(6, -26, 40, 26, 8); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(-8, -18); g.lineTo(8, -18); g.stroke(); g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(-40, -22, 10, 5); g.fillRect(12, -22, 10, 5); g.fillStyle = "#111"; mouth(20, 12); }
  if (face === "wink") { eye(22, -12); g.lineWidth = 7; g.beginPath(); g.moveTo(-32, -10); g.quadraticCurveTo(-22, -20, -12, -10); g.stroke(); mouth(28, 22); }
  if (face === "angry") { eye(-22, -8, 9, 12); eye(22, -8, 9, 12); g.lineWidth = 7; g.beginPath(); g.moveTo(-36, -30); g.lineTo(-10, -20); g.moveTo(36, -30); g.lineTo(10, -20); g.stroke(); g.beginPath(); g.moveTo(-22, 26); g.quadraticCurveTo(0, 12, 22, 26); g.stroke(); }
  if (face === "chill") { g.lineWidth = 7; g.beginPath(); g.moveTo(-32, -10); g.quadraticCurveTo(-22, -2, -12, -10); g.moveTo(12, -10); g.quadraticCurveTo(22, -2, 32, -10); g.stroke(); mouth(18, 14); }
  if (face === "shock") { eye(-22, -14, 10, 17); eye(22, -14, 10, 17); g.beginPath(); g.ellipse(0, 24, 11, 14, 0, 0, 7); g.fill(); }
  g.restore();
}

async function init() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(LITE ? 1.25 : 2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .45;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221410, .55));
  const key = new THREE.DirectionalLight(0xfff1e4, 2.2); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff6a33, 2.4); rim.position.set(4, 2.5, -3); scene.add(rim);
  const rimB = new THREE.DirectionalLight(0x6aa8ff, 1.2); rimB.position.set(-4, 2, -3); scene.add(rimB);

  /* pedestal */
  const ped = new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: .35, metalness: .1 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.8, .85, .16, 56), ped); base.position.y = -.08; scene.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.83, .014, 8, 72), new THREE.MeshBasicMaterial({ color: 0xff4d1a, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = -.01; scene.add(ring);
  const studs = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .07, .05, 16), ped, 22), m4 = new THREE.Matrix4();
  for (let i = 0; i < 22; i++) { const r = i < 14 ? .64 : .46, n = i < 14 ? 14 : 8, a = (i < 14 ? i : i - 14) / n * Math.PI * 2; m4.makeTranslation(Math.cos(a) * r, .02, Math.sin(a) * r); studs.setMatrixAt(i, m4); } scene.add(studs);

  /* rig */
  const phys = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .42, clearcoat: .45, clearcoatRoughness: .35 });
  const M = { skin: phys("#F5CDA7"), shirt: phys("#FF4D1A"), pants: phys("#1A1A1F"), shoe: phys("#121214") };
  const fc = document.createElement("canvas"); fc.width = 1024; fc.height = 256; const fg = fc.getContext("2d"); const faceTex = new THREE.CanvasTexture(fc); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: .42, clearcoat: .45, clearcoatRoughness: .35 });
  const tc = document.createElement("canvas"); tc.width = tc.height = 256; const tg = tc.getContext("2d"); const torsoTex = new THREE.CanvasTexture(tc); torsoTex.colorSpace = THREE.SRGBColorSpace;
  const torsoFront = new THREE.MeshPhysicalMaterial({ map: torsoTex, roughness: .42, clearcoat: .45, clearcoatRoughness: .35 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); scene.add(root);
  const J = { key: "box", root, body, meshes: [], mat: M.skin };
  const grp = (nm, piv) => { const g = new THREE.Group(); g.position.set(...piv); body.add(g); J[nm] = g; return g; };
  const mesh = (g, geo, mat, off) => { const m = new THREE.Mesh(geo, mat); m.position.set(...off); g.add(m); J.meshes.push(m); return m; };
  const RB = (w, h, d, r = .045) => new RoundedBoxGeometry(w, h, d, 3, r);
  mesh(grp("torso", [0, 0, 0]), RB(.78, .78, .4), [M.shirt, M.shirt, M.shirt, M.shirt, torsoFront, M.shirt], [0, 1.16, 0]);
  const headG = new THREE.CylinderGeometry(.245, .245, .42, 40, 1, false, -Math.PI, Math.PI * 2);
  mesh(grp("head", [0, 1.55, 0]), headG, [faceMat, M.skin, M.skin], [0, .21, 0]);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.11, .12, .06, 20), M.skin); neck.position.set(0, 1.57, 0); body.add(neck);
  for (const [nm, x] of [["armL", .58], ["armR", -.58]]) { const g = grp(nm, [x, 1.41, 0]); mesh(g, RB(.36, .5, .38), M.shirt, [0, -.13, 0]); mesh(g, RB(.34, .27, .36), M.skin, [0, -.5, 0]); }
  for (const [nm, x] of [["legL", .195], ["legR", -.195]]) { const g = grp(nm, [x, .78, 0]); mesh(g, RB(.38, .66, .39), M.pants, [0, -.33, 0]); mesh(g, RB(.4, .14, .43, .04), M.shoe, [0, -.71, .015]); }
  root.position.y = .0;

  /* contact shadow */
  const sc = document.createElement("canvas"); sc.width = sc.height = 128; const sg = sc.getContext("2d"); const gr = sg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .006; scene.add(shadow);

  /* state */
  const fitNames = {}; document.querySelectorAll(".panel").forEach((p) => { const k = (p.getAttribute("href") || "").split("/")[1]; fitNames[k] = { t: p.querySelector("h3") ? p.querySelector("h3").textContent : k, a: p.dataset.accent }; });
  let S = { skin: "#F5CDA7", shirt: "#FF4D1A", pants: "#1A1A1F", face: "smile", fit: "", name: "Grinder", role: "Builder" };
  try { S = { ...S, ...JSON.parse(localStorage.getItem("og-avatar") || "{}") }; } catch (e) {}
  const save = () => { try { localStorage.setItem("og-avatar", JSON.stringify(S)); } catch (e) {} };

  function paintFace() { fg.fillStyle = S.skin; fg.fillRect(0, 0, 1024, 256); fg.save(); fg.translate(512, 120); fg.scale(1.1, 1); drawFace(fg, 0, 0, 2.05, S.face); fg.restore(); faceTex.needsUpdate = true; }
  function paintTorso() {
    tg.fillStyle = S.shirt; tg.fillRect(0, 0, 256, 256);
    const dark = new THREE.Color(S.shirt).getHSL({}).l > .6; // logo colour that reads on the shirt
    tg.save(); tg.translate(128, 120); tg.fillStyle = dark ? "#0b0b0d" : "#F2EFE9"; tg.beginPath(); tg.roundRect(-44, -44, 88, 88, 18); tg.fill();
    tg.fillStyle = dark ? "#F2EFE9" : "#0b0b0d"; tg.font = "900 40px Unbounded, system-ui"; tg.textAlign = "center"; tg.textBaseline = "middle"; tg.fillText("OG", 0, 3);
    tg.fillStyle = "#FF4D1A"; tg.rotate(-.24); tg.fillRect(-60, 8, 120, 7); tg.restore(); torsoTex.needsUpdate = true;
  }
  function apply(fx) {
    M.skin.color.set(S.skin); M.shirt.color.set(S.shirt); M.pants.color.set(S.pants);
    paintFace(); paintTorso();
    if ((J.outfit && J.outfit.key) !== (S.fit || undefined)) setOutfit(J, S.fit);
    ring.material.color.set(S.fit && fitNames[S.fit] ? fitNames[S.fit].a : "#FF4D1A");
    if (fx) { pop = 1; blip("pop"); } save(); syncUI();
  }
  await document.fonts.load("900 40px Unbounded").catch(() => {});

  /* ui */
  const ui = sec.querySelector(".bld-ui");
  for (const part of ["skin", "shirt", "pants"]) {
    const box = ui.querySelector(`.bld-sw[data-part="${part}"]`);
    box.innerHTML = SW[part].map((c) => `<button type="button" style="--c:${c}" data-v="${c}" aria-label="${part} ${c}"></button>`).join("");
    box.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S[part] = b.dataset.v; apply(true); });
  }
  const facesBox = ui.querySelector(".bld-faces");
  facesBox.innerHTML = FACES.map((f) => `<button type="button" data-v="${f}" title="${FACE_NAMES[f][0]}"><canvas width="88" height="88"></canvas></button>`).join("");
  facesBox.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.face = b.dataset.v; apply(true); emote("hello"); });
  const paintFaceBtns = () => facesBox.querySelectorAll("button").forEach((b) => { const g = b.querySelector("canvas").getContext("2d"); g.clearRect(0, 0, 88, 88); g.fillStyle = S.skin; g.beginPath(); g.roundRect(4, 4, 80, 80, 20); g.fill(); drawFace(g, 44, 44, .62, b.dataset.v); });
  const fitsBox = ui.querySelector(".bld-fits");
  fitsBox.innerHTML = `<button type="button" data-v="">${de() ? "Keins" : "None"}</button>` + Object.keys(fitNames).map((k) => `<button type="button" data-v="${k}" style="--a:${fitNames[k].a}">${fitNames[k].t.replace(/:.*$/, "")}</button>`).join("");
  fitsBox.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.fit = b.dataset.v; apply(true); if (S.fit) { emote("jump"); blip("spark"); } });
  const nameIn = ui.querySelector(".bld-name"), roleIn = ui.querySelector(".bld-role");
  nameIn.addEventListener("input", () => { S.name = nameIn.value.slice(0, 18); save(); });
  roleIn.addEventListener("change", () => { S.role = roleIn.value; save(); blip("pop"); });
  function syncUI() {
    for (const part of ["skin", "shirt", "pants"]) ui.querySelectorAll(`.bld-sw[data-part="${part}"] button`).forEach((b) => b.classList.toggle("on", b.dataset.v.toLowerCase() === S[part].toLowerCase()));
    facesBox.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === S.face)); paintFaceBtns();
    fitsBox.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === S.fit));
  }
  nameIn.value = S.name; roleIn.value = S.role;
  // dice
  const act = ui.querySelector(".bld-act");
  const dice = document.createElement("button"); dice.type = "button"; dice.className = "bld-dice"; dice.setAttribute("aria-label", "Random avatar"); dice.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="16" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="16" cy="8" r="1.6"/><circle cx="8" cy="16" r="1.6"/></svg>';
  ui.querySelector(".bld-grp").prepend(dice);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  dice.addEventListener("click", () => { S.skin = pick(SW.skin); S.shirt = pick(SW.shirt); S.pants = pick(SW.pants); S.face = pick(FACES); S.fit = Math.random() < .75 ? pick(Object.keys(fitNames)) : ""; apply(true); emote("spin"); });
  apply(false);
  document.addEventListener("og-lang", () => { fitsBox.querySelector('[data-v=""]').textContent = de() ? "Keins" : "None"; });

  /* drag to turn, click to emote */
  let yaw = .35, yawV = 0, drag = null, moved = 0, pop = 0, em = null, et = 0, emI = -1;
  const EMS = ["wave", "jump", "dance", "spin"];
  function emote(n) { em = n; et = 0; }
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: yaw }; moved = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x; moved = Math.max(moved, Math.abs(dx)); const ny = drag.y + dx * .012; yawV = (ny - yaw) * 30; yaw = ny; });
  canvas.addEventListener("pointerup", () => { if (drag && moved < 5) { emI = (emI + 1) % EMS.length; emote(EMS[emI]); blip(EMS[emI] === "jump" ? "thud" : "pop"); } drag = null; });
  canvas.addEventListener("pointercancel", () => { drag = null; });

  /* render loop */
  let W = 1, H = 1;
  const size = () => { W = canvas.clientWidth || 1; H = canvas.clientHeight || 1; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); };
  size(); new ResizeObserver(size).observe(canvas);
  let active = false; new IntersectionObserver((es) => { active = es[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  let last = performance.now(), t = 0;
  function pose(dt) {
    t += dt; pop = Math.max(0, pop - dt * 3);
    if (!drag) { yawV *= Math.pow(.04, dt); yaw += yawV * dt; if (Math.abs(yawV) < .05) yaw += (.35 + Math.sin(t * .4) * .25 - yaw) * Math.min(1, dt * .8); }
    let y = 0, rs = 4, ls = 4, rf = 3 + Math.sin(t * 1.6) * 2, lf = 3 - Math.sin(t * 1.6) * 2, spin = 0, head = 0, sq = 0;
    if (em) { et += dt; const f = et, w = Math.min(clamp(f / .2, 0, 1), 1 - clamp((f - 1.3) / .2, 0, 1));
      if (em === "wave") { rs = 4 + w * (148 + 20 * Math.sin(f * 12)); rf = 4 + w * 10; head = .12 * w * Math.sin(f * 6); }
      if (em === "hello") { rs = 4 + w * (150 + 20 * Math.sin(f * 12)); ls = 4 + w * (150 + 20 * Math.sin(f * 12 + 1)); }
      if (em === "jump") { const x = clamp((f - .1) / .6, 0, 1); y = Math.sin(x * Math.PI) * .5; rs += 140 * Math.sin(x * Math.PI); ls += 140 * Math.sin(x * Math.PI); sq = f < .1 ? Math.sin(f / .1 * Math.PI) * .07 : 0; }
      if (em === "dance") { const b = Math.sin(f * 9); rs = 70 + 70 * b; ls = 70 - 70 * b; rf = lf = 30; y = Math.abs(Math.sin(f * 9)) * .1; spin = Math.sin(f * 4.5) * .5; head = .15 * Math.sin(f * 9); }
      if (em === "spin") { const x = clamp(f / .9, 0, 1); spin = sm(x) * Math.PI * 2; y = Math.sin(x * Math.PI) * .3; rs += 60 * Math.sin(x * Math.PI); ls += 60 * Math.sin(x * Math.PI); }
      if (f > (em === "dance" ? 2.4 : 1.5)) em = null; }
    root.position.y = y; root.rotation.y = yaw + spin; body.scale.set(1 + sq * .5 + pop * .04, 1 - sq + Math.sin(t * 2.1) * .006 + pop * .05, 1 + sq * .5 + pop * .04);
    J.head.rotation.set(0, 0, head + Math.sin(t * .9) * .02);
    setArm(J.armR, rf, rs, -1); setArm(J.armL, lf, ls, 1);
    J.legL.rotation.x = em === "dance" ? Math.sin(et * 9) * .2 : 0; J.legR.rotation.x = -J.legL.rotation.x;
    shadow.scale.setScalar(1 - y * .6); shadow.material.opacity = 1 - y;
    updateOutfit(J, t);
  }
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; if (!active) return;
    pose(reduce ? 0 : dt);
    const near = W / H < 1 ? 7.6 : 6.4; cam.position.set(0, 1.35, near); cam.lookAt(0, 1.0, 0);
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);

  /* crew card png */
  async function card() {
    const C = document.createElement("canvas"); C.width = 1080; C.height = 1500; const g = C.getContext("2d");
    const acc = S.fit && fitNames[S.fit] ? fitNames[S.fit].a : "#FF4D1A";
    // avatar snapshot at high res, front-ish pose
    const keepW = W, keepH = H, keepYaw = root.rotation.y, keepPR = renderer.getPixelRatio();
    renderer.setPixelRatio(1); renderer.setSize(900, 1000, false); cam.aspect = .9; cam.updateProjectionMatrix();
    root.rotation.y = .32; cam.position.set(0, 1.25, 6.2); cam.lookAt(0, 1.02, 0); renderer.render(scene, cam);
    const shot = document.createElement("canvas"); shot.width = 900; shot.height = 1000; shot.getContext("2d").drawImage(renderer.domElement, 0, 0, 900, 1000);
    renderer.setPixelRatio(keepPR); renderer.setSize(keepW, keepH, false); cam.aspect = keepW / keepH; cam.updateProjectionMatrix(); root.rotation.y = keepYaw;
    // frame
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    const bg = g.createLinearGradient(0, 0, 1080, 1500); bg.addColorStop(0, "#1d1d23"); bg.addColorStop(1, "#0b0b0d"); g.fillStyle = bg; rr(0, 0, 1080, 1500, 56); g.fill();
    const edge = g.createLinearGradient(0, 0, 1080, 1500); edge.addColorStop(0, acc); edge.addColorStop(.5, "#FFC34D"); edge.addColorStop(1, acc); g.strokeStyle = edge; g.lineWidth = 6; rr(3, 3, 1074, 1494, 54); g.stroke();
    // top row
    g.font = "800 26px Archivo, system-ui"; g.textBaseline = "middle"; g.fillStyle = acc; rr(56, 52, 196, 52, 26); g.fill();
    g.fillStyle = "#0b0b0d"; g.textAlign = "center"; g.letterSpacing = "6px"; g.fillText("ROOKIE", 156, 79);
    g.fillStyle = "#8f8a82"; g.textAlign = "right"; g.fillText("OVERGRIND · CREW", 1024, 79); g.letterSpacing = "0px";
    // art window
    g.save(); rr(56, 132, 968, 940, 36); g.clip();
    const ag = g.createRadialGradient(540, 540, 40, 540, 600, 640); ag.addColorStop(0, acc + "AA"); ag.addColorStop(.55, "#141418"); ag.addColorStop(1, "#0b0b0d"); g.fillStyle = ag; g.fillRect(56, 132, 968, 940);
    g.fillStyle = "rgba(255,255,255,.05)"; for (let y = 160; y < 1072; y += 64) for (let x = 88; x < 1024; x += 64) { g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); }
    g.font = "900 300px Unbounded, system-ui"; g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.04)"; g.fillText("OG", 540, 420);
    g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 40; g.shadowOffsetY = 24; g.drawImage(shot, 90, 120, 900, 1000); g.restore();
    g.strokeStyle = "rgba(255,255,255,.1)"; g.lineWidth = 2; rr(56, 132, 968, 940, 36); g.stroke();
    // name + role
    g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = "#F2EFE9";
    let fs = 96; g.font = `900 ${fs}px Unbounded, system-ui`; const nm = (S.name || "Grinder").trim() || "Grinder"; while (g.measureText(nm).width > 960 && fs > 40) { fs -= 4; g.font = `900 ${fs}px Unbounded, system-ui`; }
    g.letterSpacing = "-3px"; g.fillText(nm, 56, 1172); g.letterSpacing = "6px";
    g.font = "700 28px Archivo, system-ui"; g.fillStyle = acc; g.fillText(S.role.toUpperCase(), 60, 1224);
    // rows
    const rows = [[de() ? "Outfit" : "Outfit", S.fit && fitNames[S.fit] ? fitNames[S.fit].t : de() ? "Keins" : "None"], [de() ? "Gesicht" : "Face", FACE_NAMES[S.face][de() ? 1 : 0]], [de() ? "Gebaut" : "Built", new Date().toLocaleDateString(de() ? "de-CH" : "en-GB")]];
    g.letterSpacing = "0px";
    rows.forEach((r, i) => { const y = 1286 + i * 56; g.strokeStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.moveTo(56, y - 34); g.lineTo(1024, y - 34); g.stroke();
      g.font = "500 30px Archivo, system-ui"; g.fillStyle = "#8f8a82"; g.textAlign = "left"; g.fillText(r[0], 56, y); g.font = "700 30px Archivo, system-ui"; g.fillStyle = "#F2EFE9"; g.textAlign = "right"; g.fillText(r[1], 1024, y); });
    g.font = "700 22px Archivo, system-ui"; g.fillStyle = "#5c5853"; g.textAlign = "center"; g.letterSpacing = "4px"; g.fillText("OVERGRINDSTUDIO.CLICK", 540, 1466);
    return new Promise((res) => C.toBlob((b) => res({ blob: b, url: C.toDataURL("image/png") }), "image/png"));
  }
  const fname = () => `overgrind-${(S.name || "grinder").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "grinder"}.png`;
  function download(blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname(); a.rel = "noopener"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const shareBtn = act.querySelector('[data-act="share"]');
  try { if (navigator.canShare && navigator.canShare({ files: [new File([new Blob(["x"])], "x.png", { type: "image/png" })] })) shareBtn.hidden = false; } catch (e) {}
  act.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return; const kind = b.dataset.act; b.classList.add("busy");
    const { blob, url } = await card(); b.classList.remove("busy"); blip("spark");
    if (kind === "dl") download(blob);
    if (kind === "share") { try { await navigator.share({ files: [new File([blob], fname(), { type: "image/png" })], title: "Overgrind crew card", text: de() ? "Mein Overgrind-Grinder" : "My Overgrind grinder" }); } catch (er) {} }
    if (kind === "apply") {
      download(blob);
      const f = document.getElementById("apply-form");
      if (f) { if (S.name && S.name !== "Grinder" && !f.name.value) f.name.value = S.name;
        const opt = [...f.role.options].find((o) => o.textContent === S.role); f.role.value = opt ? opt.value : f.role.options[f.role.options.length - 1].value;
        const note = de() ? `Meine Crew-Karte aus dem Avatar-Builder hängt an (${fname()}).` : `My crew card from the avatar builder is attached (${fname()}).`;
        if (!f.msg.value.includes(fname())) f.msg.value = (f.msg.value ? f.msg.value + "\n\n" : "") + note;
        const stage = document.querySelector(".ap-stage"); let im = stage && stage.querySelector(".ap-card");
        if (stage && !im) { im = document.createElement("img"); im.className = "ap-card"; im.alt = de() ? "Deine Crew-Karte" : "Your crew card"; stage.appendChild(im); }
        if (im) { im.src = url; im.classList.remove("in"); void im.offsetWidth; im.classList.add("in"); } }
      const y = document.getElementById("apply"); if (y) (window.__lenis ? window.__lenis.scrollTo(y, { offset: -40 }) : y.scrollIntoView({ behavior: "smooth" }));
    }
  });
}
