/* Overgrind crew stage: the real crew avatars in 3D. They follow your cursor, react when you click them,
   high-five each other when you stop moving, and the camera walks the lineup as you scroll. */
import * as THREE from "./vendor/three.module.min.js";

const section = document.querySelector(".lineup");
const canvas = document.getElementById("lineup-gl");
if (section && canvas) init().catch((e) => { console.warn("lineup", e); section.classList.add("lu-fallback"); });

async function init() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 860px)").matches;
  const D2R = Math.PI / 180, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sm = (x) => x * x * (3 - 2 * x), eOut = (x) => 1 - Math.pow(1 - x, 3);
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(small ? 1.5 : 1.75, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070708);
  scene.fog = new THREE.Fog(0x070708, 9, 22);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

  /* ---------- load the crew ---------- */
  async function loadOGM(url) {
    const buf = await (await fetch(url)).arrayBuffer(), dv = new DataView(buf);
    const hl = dv.getUint32(0, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
    let o = 4 + hl; const n = H.n;
    const qp = new Uint16Array(buf, o, n * 3); o += n * 6; o += (4 - (o % 4)) % 4;
    const qn = new Int8Array(buf, o, n * 3); o += n * 3; o += (4 - (o % 4)) % 4;
    const qu = new Uint16Array(buf, o, n * 2); o += n * 4;
    const qi = new Uint16Array(buf, o, H.i);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n * 3; i++) { pos[i] = H.lo[i % 3] + qp[i] * H.sc[i % 3]; nor[i] = qn[i] / 127; }
    for (let i = 0; i < n * 2; i++) uv[i] = qu[i] / 65535;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(qi, 1));
    return { g, H };
  }
  const tl = new THREE.TextureLoader();
  const tex = (u, srgb) => tl.loadAsync(u).then((t) => { t.flipY = false; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; });
  const [fsM, anM, fsT, fsN, anT, anN] = await Promise.all([
    loadOGM("assets/crew3d/freshstatue.ogm"), loadOGM("assets/crew3d/andrin.ogm"),
    tex("assets/crew3d/freshstatue.jpg", true), tex("assets/crew3d/freshstatue_n.jpg"),
    tex("assets/crew3d/andrin.jpg", true), tex("assets/crew3d/andrin_n.jpg"),
  ]);

  const PARTS = ["head", "torso", "armL", "armR", "legL", "legR"];
  function rigFrom(model, mat) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const J = { root, body, meshes: [] };
    for (const nm of PARTS) {
      const [o, n] = model.H.parts[nm], piv = model.H.pivots[nm];
      const g = model.g.clone(); g.setIndex(new THREE.BufferAttribute(model.g.index.array.slice(o, o + n), 1));
      const grp = new THREE.Group(); grp.position.set(...piv);
      const m = new THREE.Mesh(g, mat); m.position.set(-piv[0], -piv[1], -piv[2]); grp.add(m); body.add(grp);
      J[nm] = grp; J.meshes.push(m);
    }
    return J;
  }
  function boxRig(mat) { // classic R6 silhouette for crew members whose avatar isn't in yet
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const J = { root, body, meshes: [] };
    const add = (nm, w, h, d, piv, off) => { const grp = new THREE.Group(); grp.position.set(...piv); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(...off); grp.add(m); body.add(grp); J[nm] = grp; J.meshes.push(m); };
    add("torso", .76, .76, .38, [0, 0, 0], [0, 1.16, 0]);
    add("head", .38, .38, .38, [0, 1.54, 0], [0, .2, 0]);
    add("armL", .36, .76, .36, [.57, 1.4, 0], [0, -.26, 0]);
    add("armR", .36, .76, .36, [-.57, 1.4, 0], [0, -.26, 0]);
    add("legL", .37, .78, .37, [.19, .78, 0], [0, -.39, 0]);
    add("legR", .37, .78, .37, [-.19, .78, 0], [0, -.39, 0]);
    return J;
  }

  const marble = new THREE.MeshStandardMaterial({ map: fsT, normalMap: fsN, roughness: .42, metalness: 0 });
  const cloth = new THREE.MeshStandardMaterial({ map: anT, normalMap: anN, roughness: .62, metalness: 0 });
  const shadowMat = new THREE.MeshStandardMaterial({ color: 0x2a2a31, roughness: .3, metalness: .15, emissive: 0x0d0604 });
  const holo = new THREE.MeshBasicMaterial({ color: 0xff4d1a, transparent: true, opacity: .14, depthWrite: false, blending: THREE.AdditiveBlending });

  const CREW = [];
  function addMember(J, x, opt) {
    J.root.position.x = x; scene.add(J.root);
    const st = { J, x, ...opt, yaw: 0, pitch: 0, emote: null, et: 0, hover: 0, focus: 0, drop: 0, step: 0, mood: 0 };
    J.meshes.forEach((m) => (m.userData.who = CREW.length));
    CREW.push(st); return st;
  }
  const fs = rigFrom(fsM, marble);
  { // FreshStatue: small neck + shoulder caps so the R6 joints stay closed
    const neckMat = new THREE.MeshStandardMaterial({ color: 0xcfccc6, roughness: .5 });
    const n = new THREE.Mesh(new THREE.CylinderGeometry(.16, .17, .14, 24), neckMat); n.position.set(0, 1.47, 0); fs.body.add(n);
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(.03, .46, .4), neckMat); f.position.set(sx * .378, 1.17, 0); fs.body.add(f); }
  }
  const an = rigFrom(anM, cloth);
  const ex = boxRig(shadowMat), gi = boxRig(shadowMat), you = boxRig(holo);
  const SP = small ? 1.35 : 1.55;
  const M = [
    addMember(fs, -1.5 * SP, { key: "fs", sig: "freeze", name: "FreshStatue" }),
    addMember(an, -.5 * SP, { key: "an", sig: "spin", name: "Andrin" }),
    addMember(ex, .5 * SP, { key: "ex", sig: "glitch", locked: true, name: "excess" }),
    addMember(gi, 1.5 * SP, { key: "gi", sig: "glitch", locked: true, name: "Ginoletsplay" }),
    addMember(you, 2.5 * SP, { key: "you", sig: "hello", ghost: true, name: "You" }),
  ];
  // wireframe edges for the "your avatar here" ghost
  you.meshes.forEach((m) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xff7a4d, transparent: true, opacity: .85 })); m.add(e); });
  [ex, gi].forEach((J) => J.meshes.forEach((m) => m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xff4d1a, transparent: true, opacity: .35 })))));
  // "?" floating above the locked two
  function qSprite() {
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    g.font = "900 104px Unbounded, system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#FF4D1A"; g.fillText("?", 64, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(.42, .42, 1); return s;
  }
  [ex, gi].forEach((J) => { const q = qSprite(); q.position.set(0, .2, .21); J.head.add(q); J.q = q; });

  /* ---------- stage ---------- */
  function radialTex(stops, s = 256) { const c = document.createElement("canvas"); c.width = c.height = s; const g = c.getContext("2d"); const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach((q) => gr.addColorStop(q[0], q[1])); g.fillStyle = gr; g.fillRect(0, 0, s, s); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: .3, metalness: .35 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  // studded pedestals
  const pedTop = new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: .35, metalness: .1 });
  const pedRing = new THREE.MeshBasicMaterial({ color: 0xff4d1a, transparent: true, opacity: .0, toneMapped: false });
  const studGeo = new THREE.CylinderGeometry(.06, .06, .05, 16);
  const pools = [];
  CREW.forEach((c, i) => {
    const g = new THREE.Group(); g.position.x = c.x; scene.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.62, .66, .14, 48), pedTop); base.position.y = .07; g.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.645, .012, 8, 64), pedRing.clone()); ring.rotation.x = Math.PI / 2; ring.position.y = .135; g.add(ring);
    const studs = new THREE.InstancedMesh(studGeo, pedTop, 40); let k = 0; const m4 = new THREE.Matrix4();
    for (let a = 0; a < 40; a++) { const r = a < 16 ? .5 : a < 28 ? .36 : .2, n = a < 16 ? 16 : a < 28 ? 12 : 12, j = a < 16 ? a : a < 28 ? a - 16 : a - 28; const th = j / n * Math.PI * 2; m4.makeTranslation(Math.cos(th) * r, .165, Math.sin(th) * r); studs.setMatrixAt(k++, m4); }
    g.add(studs);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: radialTex([[0, "rgba(255,150,90,.55)"], [.4, "rgba(255,77,26,.16)"], [1, "rgba(0,0,0,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = .004; g.add(pool);
    c.ring = ring; c.pool = pool; c.ped = g; c.J.root.position.y = .19; pools.push(pool);
  });
  // light beams
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uI: { value: 0 }, uCol: { value: new THREE.Color(0xffe6d2) } },
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY=uv.y; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }",
    fragmentShader: "uniform float uI; uniform vec3 uCol; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(abs(dot(vN,vV)),2.); float a=f*pow(vY,1.5)*uI*.2; gl_FragColor=vec4(uCol*a,a); }",
  });
  CREW.forEach((c) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.1, .9, 6, 40, 1, true), beamMat.clone()); b.position.set(c.x, 3.1, 0); scene.add(b); c.beam = b; });
  // dust
  const DN = small ? 160 : 360, dpos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) { dpos[i * 3] = (hash(i * 3.1) - .5) * 10; dpos[i * 3 + 1] = hash(i * 1.3) * 4; dpos[i * 3 + 2] = (hash(i * 7.7) - .5) * 4; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dpos.slice(), 3));
  const dotTex = radialTex([[0, "rgba(255,255,255,1)"], [.3, "rgba(255,235,215,.5)"], [1, "rgba(0,0,0,0)"]], 64);
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: .03, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55, color: 0xffe2c8 }));
  scene.add(dust);
  // stud particles for jumps, sparks for high-fives
  const PN = 260, pState = []; const pGeo = new THREE.BoxGeometry(.06, .04, .06);
  const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, emissive: 0x220800 });
  const parts = new THREE.InstancedMesh(pGeo, pMat, PN); parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parts.frustumCulled = false; scene.add(parts);
  const pCols = [new THREE.Color(0xff4d1a), new THREE.Color(0xf2efe9), new THREE.Color(0xffc34d), new THREE.Color(0xd52b1e), new THREE.Color(0x2bd4e0)];
  for (let i = 0; i < PN; i++) { pState.push({ life: 0 }); parts.setColorAt(i, pCols[0]); }
  let pHead = 0;
  function burst(x, y, z, n, speed, cols) {
    for (let k = 0; k < n; k++) { const p = pState[pHead]; pHead = (pHead + 1) % PN; const a = Math.random() * 6.283, u = Math.random();
      p.life = .9 + Math.random() * .7; p.age = 0; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * speed * (.4 + u); p.vz = Math.sin(a) * speed * (.4 + u) * .7; p.vy = speed * (1 + Math.random() * 1.2); p.r = Math.random() * 6;
      parts.setColorAt((pHead + PN - 1) % PN, cols[k % cols.length]); }
    parts.instanceColor.needsUpdate = true;
  }

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xcfd6ff, 0x140a06, .35));
  const key = new THREE.DirectionalLight(0xfff1e4, 1.6); key.position.set(-3, 5, 6); scene.add(key);
  const rimO = new THREE.SpotLight(0xff4d1a, 40, 20, .7, .7, 1.2); rimO.position.set(4, 3.5, -3.5); rimO.target.position.set(0, 1, 0); scene.add(rimO, rimO.target);
  const rimB = new THREE.SpotLight(0x6aa8ff, 22, 20, .7, .7, 1.2); rimB.position.set(-4.5, 3, -3); rimB.target.position.set(-1, 1, 0); scene.add(rimB, rimB.target);
  const spot = new THREE.SpotLight(0xffffff, 0, 12, .38, .55, 1.1); spot.position.set(0, 5.6, 1.4); scene.add(spot, spot.target);

  /* ---------- scroll story ---------- */
  const steps = [...section.querySelectorAll(".lu-step")], tags = [...section.querySelectorAll(".lu-tag")], dots = [...section.querySelectorAll(".lu-dots i")];
  const OX = small ? 0 : -.62; // desktop: copy sits on the left, so the subject goes right
  const SHOTS = [ // camera position x,y,z + look target x,y
    { p: [small ? -1 * SP : .5 * SP - 1.1, 2.6, small ? 13.5 : 12], l: [small ? -1 * SP : .5 * SP - 1.1, small ? .75 : 1.0], f: -1 },
    { p: [-1.5 * SP + OX, 1.6, small ? 6.6 : 5.7], l: [-1.5 * SP + OX, small ? .7 : 1.2], f: 0 },
    { p: [-.5 * SP + OX, 1.6, small ? 6.6 : 5.7], l: [-.5 * SP + OX, small ? .7 : 1.2], f: 1 },
    { p: [1.0 * SP + OX * .9, 1.75, small ? 8.4 : 6.2], l: [1.0 * SP + OX * .9, small ? .7 : 1.1], f: 23 },
    { p: [2.5 * SP + OX, 1.6, small ? 6.8 : 5.8], l: [2.5 * SP + OX, small ? .7 : 1.15], f: 4 },
  ];
  let prog = 0, stepF = 0, curStep = -1, inView = false, entered = 0;
  function readScroll() {
    const r = section.getBoundingClientRect(), total = r.height - innerHeight;
    prog = clamp(-r.top / Math.max(1, total), 0, 1);
    inView = r.bottom > 0 && r.top < innerHeight;
    if (r.top < innerHeight * .6) entered = 1;
    const s = Math.round(prog * (SHOTS.length - 1));
    if (s !== curStep) { curStep = s; steps.forEach((el, i) => el.classList.toggle("on", i === s)); dots.forEach((el, i) => el.classList.toggle("on", i === s)); }
  }
  addEventListener("scroll", readScroll, { passive: true }); readScroll();
  dots.forEach((d, i) => d.addEventListener("click", () => { const r = section.getBoundingClientRect(); const y = scrollY + r.top + (r.height - innerHeight) * (i / (SHOTS.length - 1)) + 2; window.__lenis ? window.__lenis.scrollTo(y) : scrollTo({ top: y, behavior: "smooth" }); }));

  /* ---------- pointer ---------- */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(0, .1), look = new THREE.Vector3(0, 1.4, 6);
  let lastMove = performance.now(), hovered = -1, pointerIn = false;
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3.2), hit = new THREE.Vector3();
  canvas.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); lastMove = performance.now(); pointerIn = true; });
  canvas.addEventListener("pointerleave", () => { pointerIn = false; hovered = -1; canvas.style.cursor = ""; });
  const clickTimes = {};
  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const who = pick(); if (who < 0) return; poke(who);
  });
  tags.forEach((t) => t.addEventListener("click", () => poke(+t.dataset.who)));
  function pick() {
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(CREW.flatMap((c) => c.J.meshes), false);
    return hits.length ? hits[0].object.userData.who : -1;
  }
  const EMOTES = { fs: ["freeze", "wave", "jump", "point"], an: ["spin", "wave", "jump", "point"], ex: ["glitch", "jump"], gi: ["glitch", "jump"], you: ["hello"] };
  function poke(who) {
    const c = CREW[who], now = performance.now() / 1000; lastMove = performance.now();
    const ct = (clickTimes[who] = (clickTimes[who] || []).filter((t) => now - t < 1.1)); ct.push(now);
    const list = EMOTES[c.key]; c.cycle = ((c.cycle == null ? -1 : c.cycle) + 1) % list.length;
    play(c, ct.length >= 3 ? "dance" : list[c.cycle]);
    if (c.ghost) { const a = document.querySelector('a[href="#apply"].lu-cta'); if (a) a.classList.add("pulse"), setTimeout(() => a.classList.remove("pulse"), 900); }
  }
  function play(c, name) {
    c.emote = name; c.et = 0;
    const x = c.x, top = 2.1;
    if (name === "jump" || name === "dance") setTimeout(() => burst(x, .25, .2, 26, 1.6, [pCols[0], pCols[1], pCols[2]]), 420);
    if (name === "freeze") setTimeout(() => burst(x, 1.4, .2, 34, 1.4, [pCols[1], pCols[1], pCols[2]]), 1000);
    if (name === "spin") setTimeout(() => burst(x, top, .1, 24, 1.2, [pCols[3], pCols[0], pCols[2]]), 300);
    if (name === "glitch") setTimeout(() => burst(x, 1.6, .2, 14, .9, [pCols[0], pCols[4]]), 100);
  }
  const DUR = { wave: 1.8, jump: 1.0, point: 1.6, freeze: 1.6, spin: 1.1, dance: 2.6, glitch: .9, hello: 1.6, five: 1.7 };

  /* ---------- per-frame pose ---------- */
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AZ = new THREE.Vector3(0, 0, 1);
  const armQ = (fwd, side, s) => { qa.setFromAxisAngle(AZ, s * side * D2R); qb.setFromAxisAngle(AX, -fwd * D2R); return qa.clone().multiply(qb); };
  const wv = (t, a, b) => Math.min(clamp((t - a) / .2, 0, 1), 1 - clamp((t - (b - .2)) / .2, 0, 1));
  let fiveT = -1, nextFive = 6;
  function pose(c, i, t, dt) {
    const J = c.J;
    // look target: cursor, the camera, or each other when idle
    let tx = look.x - c.x, ty = look.y - 1.5, tz = look.z;
    const idle = (performance.now() - lastMove) / 1000;
    if ((!pointerIn || idle > 4) && i < 2) { tx = (i === 0 ? CREW[1].x - c.x : CREW[0].x - c.x); ty = 0; tz = .6; }
    if (c.emote && c.emote !== "glitch") { tx = camera.position.x - c.x; ty = camera.position.y - 1.5; tz = camera.position.z; }
    const yawT = clamp(Math.atan2(tx, tz), -.9, .9), pitchT = clamp(-Math.atan2(ty, Math.hypot(tx, tz)), -.35, .3);
    c.yaw += (yawT - c.yaw) * Math.min(1, dt * 6); c.pitch += (pitchT - c.pitch) * Math.min(1, dt * 6);
    // entrance drop
    const dropT = entered ? clamp((t - (c.dropAt || (c.dropAt = t + .15 * i))) / .55, 0, 1) : 0;
    const dropY = (1 - dropT) * (1 - dropT) * 5, land = dropT >= 1 && !c.landed ? (c.landed = true, burst(c.x, .2, .2, 18, 1.1, [pCols[1], pCols[0]]), 0) : 0;
    let y = .19 + (entered ? dropY : 50), sq = 0, rotY = c.yaw * .35, rf = 4, rs = 6, lf = 4, ls = 6, headR = 0, body = 0;
    const br = Math.sin(t * 2.1 + i) * .008; // breathing
    // hover: turn a bit more and get ready
    c.hover += ((hovered === i ? 1 : 0) - c.hover) * Math.min(1, dt * 8);
    rs += c.hover * 10; ls += c.hover * 10; y += c.hover * .03;
    // high five between FreshStatue and Andrin
    let step = 0;
    if (i < 2 && fiveT >= 0) { const f = t - fiveT, e = wv(f, 0, DUR.five), up = sm(clamp(f / .5, 0, 1)) * (1 - sm(clamp((f - 1.2) / .4, 0, 1)));
      step = e * .12; if (i === 0) { ls = lerpA(ls, 166, up); lf = lerpA(lf, 10, up); } else { rs = lerpA(rs, 166, up); rf = lerpA(rf, 10, up); }
      rotY = (i === 0 ? .5 : -.5) * e; if (f > .52 && !c.fived) { c.fived = true; if (i === 0) burst((CREW[0].x + CREW[1].x) / 2, 2.25, .1, 30, 1.0, [pCols[2], pCols[0], pCols[1]]); }
      if (f > DUR.five) { c.fived = false; if (i === 1) fiveT = -1; } }
    // emotes
    if (c.emote) {
      c.et += dt; const f = c.et, E = c.emote;
      if (E === "wave") { const u = wv(f, 0, DUR.wave); rs = lerpA(rs, 150 + 22 * Math.sin(f * 12), u); rf = lerpA(rf, 12, u); headR = .1 * u * Math.sin(f * 6); }
      if (E === "jump") { const x = clamp((f - .15) / .6, 0, 1); y += Math.sin(x * Math.PI) * .6; sq = f < .15 ? Math.sin(f / .15 * Math.PI) * .08 : x >= 1 ? Math.sin(clamp((f - .75) / .25, 0, 1) * Math.PI) * .07 : 0; const u = Math.sin(x * Math.PI); rs += 140 * u; ls += 140 * u; }
      if (E === "point") { const u = wv(f, 0, DUR.point); rf = lerpA(rf, 88, u); rs = lerpA(rs, 4, u); body = .06 * u; }
      if (E === "freeze") { // FreshStatue turns back into stone, then cracks loose
        const u = wv(f, 0, DUR.freeze); J.meshes.forEach((m) => { if (m.material.color) m.material.color.setScalar(1 - .55 * clamp(f / .25, 0, 1) * (f < 1 ? 1 : 1 - clamp((f - 1) / .15, 0, 1))); });
        ls = lerpA(ls, 70, u); rs = lerpA(rs, 70, u); lf = lerpA(lf, 30, u); rf = lerpA(rf, 30, u);
        if (f > 1) { const s = Math.exp(-(f - 1) * 9) * Math.sin((f - 1) * 60) * .05; body += s; } }
      if (E === "spin") { const x = clamp(f / .9, 0, 1); rotY += sm(x) * Math.PI * 2; y += Math.sin(x * Math.PI) * .35; rs += 60 * Math.sin(x * Math.PI); ls += 60 * Math.sin(x * Math.PI); }
      if (E === "dance") { const b = Math.sin(f * 9); rs = 70 + 70 * b; ls = 70 - 70 * b; rf = 30; lf = 30; y += Math.abs(Math.sin(f * 9)) * .12; rotY += Math.sin(f * 4.5) * .5; headR = .15 * Math.sin(f * 9); }
      if (E === "glitch") { const g = f < DUR.glitch ? 1 : 0; J.root.position.x = c.x + (hash(Math.floor(t * 40)) - .5) * .12 * g; if (J.q) J.q.material.rotation = Math.sin(f * 30) * .3 * g; }
      if (E === "hello") { const u = wv(f, 0, DUR.hello); rs = lerpA(rs, 150 + 20 * Math.sin(f * 12), u); ls = lerpA(ls, 150 + 20 * Math.sin(f * 12 + 1), u); }
      if (f > (DUR[E] || 1.5)) { c.emote = null; J.meshes.forEach((m) => m.material.color && m.material.color.setScalar(1)); if (E === "glitch") J.root.position.x = c.x; }
    }
    if (c.emote !== "glitch") J.root.position.x = c.x + (i === 0 ? step : i === 1 ? -step : 0);
    J.root.position.y = y;
    J.root.rotation.y = rotY;
    J.body.scale.set(1 + sq * .5, 1 - sq + br, 1 + sq * .5);
    J.body.rotation.x = body;
    J.head.rotation.set(c.pitch, c.yaw * .65, headR + Math.sin(t * .9 + i) * .02);
    // little idle sway on the arms so nobody is a T-posing mannequin
    const sw = Math.sin(t * 1.6 + i * 2) * 2;
    J.armR.quaternion.copy(armQ(rf + sw, rs, -1)); J.armL.quaternion.copy(armQ(lf - sw, ls, 1));
    J.legL.rotation.x = 0; J.legR.rotation.x = 0;
    if (J.q) J.q.position.y = .2 + Math.sin(t * 2 + i) * .04 + .32;
  }
  function lerpA(a, b, u) { return a + (b - a) * u; }

  /* ---------- tags follow the heads ---------- */
  const v3 = new THREE.Vector3();
  function placeTags() {
    const r = canvas.getBoundingClientRect();
    tags.forEach((t) => { const c = CREW[+t.dataset.who]; v3.set(c.J.root.position.x, c.J.root.position.y + 2.12, 0).project(camera);
      t.style.transform = `translate(${(v3.x * .5 + .5) * r.width}px, ${(-v3.y * .5 + .5) * r.height}px) translate(-50%,-100%)`;
      t.classList.toggle("show", entered && (hovered === +t.dataset.who || curStep === 0)); });
  }

  /* ---------- loop ---------- */
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(canvas); resize();
  const camP = new THREE.Vector3(...SHOTS[0].p), camL = new THREE.Vector3(SHOTS[0].l[0], SHOTS[0].l[1], 0);
  let last = performance.now() / 1000, t = 0;
  section.classList.add("lu-ready");
  function frame() {
    requestAnimationFrame(frame);
    if (!inView) { last = performance.now() / 1000; return; }
    const now = performance.now() / 1000, dt = Math.min(window.__luDt || .05, now - last); last = now; t += dt;
    // camera along the shots
    stepF = prog * (SHOTS.length - 1); const a = Math.floor(stepF), b = Math.min(SHOTS.length - 1, a + 1), x = sm(stepF - a);
    const A = SHOTS[a], B = SHOTS[b];
    const tp = new THREE.Vector3(...A.p.map((v, k) => v + (B.p[k] - v) * x)), tlk = new THREE.Vector3(A.l[0] + (B.l[0] - A.l[0]) * x, A.l[1] + (B.l[1] - A.l[1]) * x, 0);
    if (!small && pointerIn) { tp.x += mouse.x * .25; tp.y += mouse.y * .12; }
    const k = reduce ? 1 : Math.min(1, dt * 4); camP.lerp(tp, k); camL.lerp(tlk, k);
    camera.position.copy(camP); camera.lookAt(camL);
    // pointer → look target & hover
    ray.setFromCamera(mouse, camera); if (ray.ray.intersectPlane(plane, hit)) look.lerp(hit, Math.min(1, dt * 10));
    if (pointerIn && !small) { const h = pick(); if (h !== hovered) { hovered = h; canvas.style.cursor = h >= 0 ? "pointer" : ""; } }
    // idle high five
    if ((now - lastMove / 1000) > 4 && fiveT < 0 && t > nextFive && !CREW[0].emote && !CREW[1].emote) { fiveT = t; nextFive = t + 9; }
    // focus light
    const focus = SHOTS[Math.round(stepF)].f;
    CREW.forEach((c, i) => { const on = focus === -1 ? .55 : focus === i || (focus === 23 && (i === 2 || i === 3)) ? 1 : .18; c.focus += (on - c.focus) * Math.min(1, dt * 3);
      c.beam.material.uniforms.uI.value = c.focus * (c.locked ? .6 : 1) * (c.ghost ? .8 : 1); c.pool.material.opacity = c.focus * .9; c.ring.material.opacity = c.focus * .8 + c.hover * .2; pose(c, i, t, dt); });
    const fc = focus >= 0 && focus < 5 ? CREW[focus] : null; spot.intensity += ((fc ? 30 : 0) - spot.intensity) * Math.min(1, dt * 3); if (fc) { spot.target.position.set(fc.x, 1, 0); spot.position.x = fc.x; }
    // dust + particles
    const dp = dGeo.attributes.position.array; for (let i = 0; i < DN; i++) { dp[i * 3 + 1] = (dpos[i * 3 + 1] + t * .05 * (.5 + hash(i))) % 4; dp[i * 3] = dpos[i * 3] + Math.sin(t * .3 + i) * .06; } dGeo.attributes.position.needsUpdate = true;
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
    for (let i = 0; i < PN; i++) { const p = pState[i]; if (p.life <= 0) { m4.makeScale(0, 0, 0); parts.setMatrixAt(i, m4); continue; }
      p.age += dt; if (p.age > p.life) { p.life = 0; continue; } p.vy -= 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < .02) { p.y = .02; p.vy *= -.35; p.vx *= .7; p.vz *= .7; }
      const s = 1 - Math.pow(p.age / p.life, 3); e4.set(p.r + p.age * 6, p.r * 2 + p.age * 4, 0); q4.setFromEuler(e4); s4.setScalar(s); m4.compose(new THREE.Vector3(p.x, p.y, p.z), q4, s4); parts.setMatrixAt(i, m4); }
    parts.instanceMatrix.needsUpdate = true;
    placeTags();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
