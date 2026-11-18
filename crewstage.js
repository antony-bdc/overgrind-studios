/* Overgrind hero stage: the four real crew avatars (FreshStatue in the middle, on the founder plinth) plus one open spot.
   They drop in one after another, watch your cursor, react when you click them and do small things on their own. */
import * as THREE from "./vendor/three.module.min.js";
import { loadCrew4, pose } from "./crew4.js";
import { fsBlockify } from "./fsblock.js";
import { RoomEnvironment } from "./vendor/addons/environments/RoomEnvironment.js";
import { makeGear } from "./gearmodel.js";
await (window.ogIntro || Promise.resolve()); // let the intro play smoothly before the 3D crew loads

const canvas = document.getElementById("stage-gl");

const CREW = [
  { key: "andrin", name: "Andrin", role: "Creator", c: "#E2202E", x: -3.55, z: 0.1, ry: 0.22, emotes: ["wave", "dance", "flex"] },
  { key: "fs", name: "FreshStatue", role: "Founder", c: "#E8A400", x: 0, z: 1.25, ry: 0, plinth: 0.42, emotes: ["flex", "wave", "cheer"] },
  { key: "gino", name: "Gino", role: "Creator", c: "#2450FF", x: 3.55, z: 0.1, ry: -0.22, emotes: ["point", "dance", "wave"] },
  { key: "excess", name: "excess", role: "Creator", c: "#7B45F5", x: 7.0, z: -0.9, ry: -0.38, emotes: ["cheer", "wave", "dance"] },
];

async function init() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.02;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = new THREE.Scene();
  { const pm = new THREE.PMREMGenerator(R); sc.environment = pm.fromScene(new RoomEnvironment(), .04).texture; sc.environmentIntensity = .45; pm.dispose(); } // reflections for marble, gold and clearcoat
  sc.add(new THREE.HemisphereLight(0xffffff, 0xbdb6a8, 1.15));
  const key = new THREE.DirectionalLight(0xfff3e2, 2.5); key.position.set(5, 11, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 9, bottom: -4, near: 1, far: 40 }); key.shadow.radius = 5; key.shadow.bias = -0.0004; sc.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.3); rim.position.set(-6, 6, -8); sc.add(rim);
  const fill = new THREE.DirectionalLight(0xe9efff, 0.6); fill.position.set(-8, 3, 6); sc.add(fill);

  /* ---- the floating island: a studded baseplate with a rocky brick underside ---- */
  const island = new THREE.Group(); sc.add(island);
  const studG = new THREE.CylinderGeometry(.22, .22, .16, 20);
  const top = new THREE.Mesh(new THREE.BoxGeometry(23, .7, 8.6), new THREE.MeshStandardMaterial({ color: 0xefece4, roughness: .55 })); top.position.y = -.35; top.receiveShadow = true; island.add(top);
  { const cols = 28, rows = 10, inst = new THREE.InstancedMesh(studG, new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: .45 }), cols * rows), m = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { m.makeTranslation(-11.1 + i * .82, .08, -3.7 + j * .82); inst.setMatrixAt(n++, m); }
    inst.receiveShadow = true; island.add(inst); }
  const PALC = [0xE2202E, 0xE8A400, 0x2450FF, 0x7B45F5];
  for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, .5, .5), new THREE.MeshStandardMaterial({ color: PALC[i % 4], roughness: .35 })); b.position.set(-10.4 + i * 1.6, -.45, 4.55); b.castShadow = true; island.add(b); }
  const rockM = [0x2b2b31, 0x34343c, 0x3e3e47, 0x26262b].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }));
  const hsh = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  for (let L = 0; L < 7; L++) { const w = 22 - L * 2.9, d = 8 - L * 1.05, y = -1 - L * .9, n = Math.max(2, 9 - L);
    for (let i = 0; i < n; i++) { const bw = w / n * (.9 + hsh(L * 9 + i) * .25), b = new THREE.Mesh(new THREE.BoxGeometry(bw, .9, d * (.75 + hsh(i + L) * .3)), hsh(L * 3 + i * 7) > .9 ? new THREE.MeshStandardMaterial({ color: PALC[(L + i) % 4], roughness: .4 }) : rockM[(L + i) % 4]);
      b.position.set(-w / 2 + (i + .5) * w / n + (hsh(i * 5 + L) - .5) * .4, y, (hsh(i * 3 + L * 2) - .5) * .8); island.add(b); } }
  const chunks = []; for (let i = 0; i < 12; i++) { const s = .5 + hsh(i + 40) * .9, b = new THREE.Mesh(new THREE.BoxGeometry(s, s * .6, s), i % 3 ? rockM[i % 4] : new THREE.MeshStandardMaterial({ color: PALC[i % 4], roughness: .35 }));
    const st = new THREE.Mesh(studG, b.material); st.scale.setScalar(s * 1.4); st.position.y = s * .3 + .05; b.add(st);
    const sx = i % 2 ? 1 : -1; b.userData = { p: new THREE.Vector3(sx * (13 + hsh(i + 9) * 7), -3 + hsh(i + 3) * 9, -6 - hsh(i + 5) * 12), ph: hsh(i) * 6 }; sc.add(b); chunks.push(b); }
  /* ---- the gear rises behind them like a sun ---- */
  const G = makeGear(); const sun = G.gear; sun.position.set(0, 2.8, -30); sun.scale.setScalar(6.6); sc.add(sun);
  const sunL = new THREE.PointLight(0xffd9a0, 0, 60, 1.2); sunL.position.set(0, 6, -10); sc.add(sunL);

  // founder plinth: a gold studded brick
  const plM = new THREE.MeshStandardMaterial({ color: 0xE8A400, roughness: .35, metalness: .1 });
  const pl = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.42, 2.0), plM);
  pl.position.set(0, 0.21, 1.25); pl.castShadow = pl.receiveShadow = true; sc.add(pl);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const s = new THREE.Mesh(studG, plM); s.position.set(-.82 + i * .82 + 0, .5, .85 + j * .8); s.scale.setScalar(1); sc.add(s); }
  const ple = new THREE.Group();

  // open spot: a ghost outline of a blocky avatar
  const ghost = new THREE.Group(); ghost.position.set(-7.0, 0, -0.9); ghost.rotation.y = 0.38; ghost.scale.set(0.72, 0.98, 0.72); sc.add(ghost);
  const gmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const lmat = new THREE.LineDashedMaterial({ color: 0x0f0f10, dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.6 });
  for (const [w, h, d, x, y] of [[1.9, 1.9, 1.0, 0, 2.95], [1.2, 1.2, 1.2, 0, 4.5], [0.9, 1.9, 0.9, -1.45, 2.95], [0.9, 1.9, 0.9, 1.45, 2.95], [0.9, 2.0, 0.9, -0.5, 1.0], [0.9, 2.0, 0.9, 0.5, 1.0]]) {
    const g = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(g, gmat); m.position.set(x, y, 0); ghost.add(m);
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), lmat); l.computeLineDistances(); l.position.copy(m.position); ghost.add(l);
  }
  const ghostHit = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5.2, 1.6), new THREE.MeshBasicMaterial({ visible: false })); ghostHit.position.y = 2.6; ghost.add(ghostHit);
  ghostHit.userData.ghost = true;

  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 300);
  const look = new THREE.Vector3(0, 2.6, 0), base = { d: 19, y: 3.2, ly: 2.75 };

  // load all four
  const items = await Promise.all(CREW.map(async (c, i) => {
    const J = await loadCrew4("assets/crew4/" + c.key);
    if (c.key === "fs") fsBlockify(J);
    if (c.key === "excess" && !J.pet) { try { const Jb = await loadCrew4("assets/crew4/excessbee"); if (Jb.pet) { Jb.pet.parent.remove(Jb.pet); J.B.UpperTorso.add(Jb.pet); J.pet = Jb.pet; } } catch (e) {} }
    const g = new THREE.Group(); g.add(J.root); g.position.set(c.x, c.plinth || 0, c.z); g.rotation.y = c.ry; sc.add(g);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.4, 1.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 2.7; hit.userData.i = i; g.add(hit);
    return { ...c, J, g, hit, act: null, t0: 0, i, baseY: c.plinth || 0, phase: i * 1.7, drop: 0 };
  }));
  document.documentElement.classList.add("stage-ready");

  // labels above heads
  const tags = [...document.querySelectorAll(".st-tag")];
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(9, 9), aim = new THREE.Vector2(), aimS = new THREE.Vector2();
  let hover = -1, W = 1, H = 1, visible = true, mobile = false;

  function layout() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    R.setSize(W, H, false); cam.aspect = W / H; mobile = W < 760;
    const span = mobile ? 12.4 : 19.5; // world width that must fit
    const dist = (span / 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / cam.aspect;
    const d = Math.max(dist, mobile ? 15 : 19);
    cam.position.set(0, mobile ? 3.4 : 3.2, d); look.set(0, mobile ? 2.9 : 2.75, 0); cam.lookAt(look); cam.updateProjectionMatrix(); base.d = d; base.y = cam.position.y; base.ly = look.y;
    // tighter spacing on phones
    const k = mobile ? 0.6 : 1;
    items.forEach((it) => { it.g.position.x = it.x * k; it.g.position.z = it.z; });
    ghost.position.x = -7.0 * k;
  }
  layout(); addEventListener("resize", layout);

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });
  addEventListener("pointermove", (e) => { aim.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });
  canvas.addEventListener("pointerleave", () => mouse.set(9, 9));

  function pick() {
    if (mouse.x > 5) return null; ray.setFromCamera(mouse, cam);
    const hits = ray.intersectObjects([...items.map((i) => i.hit), ghostHit], false);
    return hits.length ? hits[0].object : null;
  }
  function play(it, name) { it.act = name; it.t0 = clock.elapsedTime; }
  canvas.addEventListener("click", () => {
    const o = pick(); if (!o){ if (focus >= 0) closeLobby(); return; }
    if (o.userData.ghost) { document.querySelector("#apply")?.scrollIntoView({ behavior: "smooth" }); return; }
    const it = items[o.userData.i]; it.n = ((it.n ?? -1) + 1) % it.emotes.length; play(it, it.emotes[it.n]);
    if (focus !== it.i) openLobby(it.i);
    const t = tags[it.i]; if (t) { t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop"); }
    window.ogBlip?.(it.i);
  });

  const io = new IntersectionObserver((es) => es.forEach((e) => (visible = e.isIntersecting)), { threshold: 0 }); io.observe(canvas);
  const clock = new THREE.Clock();
  const DUR = { wave: 2.4, dance: 3.2, flex: 2.2, cheer: 2.0, point: 1.8, land: 1.1, uppercut: 1.6 };
  const order = [0, 2, 3, 1]; // FS lands last
  const start = 0.35;
  items.forEach((it) => { it.drop = reduce ? -1 : start + order.indexOf(it.i) * 0.32; });
  let nextIdle = 5, clockDt = .016, focus = -1, lobbyK = 0;
  const v = new THREE.Vector3(), camP = cam.position.clone(), camL = look.clone(), warm = new THREE.Color(0xfff3e2), focusCol = new THREE.Color(0xffd9a0);
  const panel = document.querySelector(".lobby"), rise = 0;
  function openLobby(i){ focus = i; const it = items[i]; focusCol.set(it.c); const card = document.querySelector('.card[data-k="' + (it.key === "fs" ? "fs" : it.key) + '"]');
    if (panel){ panel.style.setProperty("--c", it.c); panel.querySelector(".lb-name").textContent = it.name; panel.querySelector(".lb-role").textContent = card?.querySelector(".c-role")?.textContent || it.role; panel.querySelector(".lb-bio").textContent = card?.querySelector("p")?.textContent || "";
      panel.querySelector(".lb-no").textContent = String(i + 1).padStart(2, "0"); panel.hidden = false; requestAnimationFrame(() => panel.classList.add("on")); }
    document.documentElement.classList.add("lobby-on"); }
  function closeLobby(){ focus = -1; if (panel){ panel.classList.remove("on"); setTimeout(() => { if (focus < 0) panel.hidden = true; }, 500); } document.documentElement.classList.remove("lobby-on"); }
  panel?.querySelector(".lb-close")?.addEventListener("click", closeLobby);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && focus >= 0) closeLobby(); });
  addEventListener("scroll", () => { if (focus >= 0 && scrollY > 200) closeLobby(); }, { passive: true });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) { clock.getDelta(); return; }
    clockDt = Math.min(.05, clock.getDelta()); const t = clock.elapsedTime;
    aimS.lerp(aim, 0.08);
    const o = pick(); const h = o ? (o.userData.ghost ? 9 : o.userData.i) : -1;
    if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? "pointer" : ""; tags.forEach((tg, i) => tg.classList.toggle("on", i === h || (h === 9 && i === 4))); }
    if (t > nextIdle && !reduce) { const it = items[(Math.random() * 4) | 0]; if (!it.act) play(it, it.emotes[(Math.random() * it.emotes.length) | 0]); nextIdle = t + 5 + Math.random() * 4; }
    for (const it of items) {
      const J = it.J, list = [["idle", t + it.phase, 1]];
      // entrance: fall from the sky, land, stand up
      let y = it.baseY;
      if (it.drop >= 0) {
        const k = t - it.drop;
        if (k < 0) { it.g.visible = false; continue; }
        it.g.visible = true;
        if (k < 0.45) { const f = k / 0.45; y = it.baseY + (1 - f * f) * 14; list.length = 0; list.push(["skydive", t, 0.4], ["flail", t, 0.6]); }
        else if (k < 1.5) { list.length = 0; list.push(["land", k - 0.45, 1]); }
        else it.drop = -1;
      }
      if (it.act) {
        const k = t - it.t0, d = DUR[it.act] || 2, w = Math.min(1, k / 0.18, (d - k) / 0.3);
        if (k > d) it.act = null; else { list[0][2] = 1 - w; list.push([it.act, k, w]); }
      }
      it.g.position.y = y;
      pose(J, list, (P) => {
        // look at the cursor: head and chest turn toward it, more for the one you hover
        const s = hover === it.i ? 1.25 : 0.8, dx = aimS.x - (it.g.position.x / 10), dy = aimS.y + 0.1;
        P.Head.y += dx * 0.55 * s - it.ry * 0.7; P.Head.x += -dy * 0.22 * s; P.UpperTorso.y += dx * 0.18 * s;
      });
      if (J.fsMat) { // FreshStatue: the gold seams glow while he emotes
        const on = it.act ? Math.min(1, (t - it.t0) / .25) * Math.max(0, Math.min(1, ((DUR[it.act] || 2) - (t - it.t0)) / .4)) : 0;
        J.fsMat.gold.emissiveIntensity = on * (1.6 + .8 * Math.sin(t * 9)); J.fsMat.marble.emissive.setRGB(1, .72, .25); J.fsMat.marble.emissiveIntensity = on * .06; }
      if (J.pet) { J.pet.position.set(Math.sin(t * 1.3) * 0.18, Math.sin(t * 2.6) * 0.14, Math.cos(t * 1.3) * 0.12); J.pet.rotation.z = Math.sin(t * 9) * 0.06; }
    }
    ghost.children.forEach((c) => c.isLineSegments && (c.material.opacity = 0.45 + Math.sin(t * 2) * 0.15));
    /* world: gear sun turns, chunks float */
    sun.rotation.z = t * .12; sun.position.y = 2.8 + Math.sin(t * .5) * .25 + rise * 0;
    chunks.forEach((b) => { const u = b.userData; b.position.set(u.p.x, u.p.y + Math.sin(t * .8 + u.ph) * .4, u.p.z); b.rotation.set(Math.sin(t * .3 + u.ph) * .3, t * .2 + u.ph, 0); });
    /* camera: orbit with the cursor, dive under the island while you scroll, or fly to the chosen creator */
    const heroH = canvas.closest(".hero")?.offsetHeight || H, dive = Math.min(1, Math.max(0, scrollY / heroH));
    const yaw = aimS.x * .16, pitch = aimS.y * .05;
    let px = Math.sin(yaw) * base.d, py = base.y - pitch * 6 - dive * 7.5, pz = Math.cos(yaw) * base.d + dive * 3;
    let lx = 0, ly = base.ly - dive * 1.5, lz = 0;
    if (focus >= 0){ const it = items[focus], gp = it.g.position, f = mobile ? 15 : 13.5; px = gp.x + Math.sin(it.ry * .6) * f + aimS.x * .8 + (mobile ? 0 : 1.6); py = gp.y + 3.3; pz = gp.z + Math.cos(it.ry * .6) * f; lx = gp.x + (mobile ? 0 : 2.6); ly = gp.y + (mobile ? 1.6 : 2.6); lz = gp.z; }
    const kk = 1 - Math.pow(.02, clockDt);
    camP.lerp(v.set(px, py, pz), kk); camL.lerp(v.set(lx, ly, lz), kk);
    cam.position.copy(camP); cam.lookAt(camL);
    island.rotation.z = Math.sin(t * .3) * .004; island.position.y = Math.sin(t * .6) * .05;
    /* lobby light: the chosen creator's colour fills the stage */
    lobbyK += ((focus >= 0 ? 1 : 0) - lobbyK) * kk;
    key.color.copy(warm).lerp(focusCol, lobbyK * .55); sunL.intensity = 40 + lobbyK * 80; sunL.color.copy(focusCol);
    sc.environmentIntensity = .45 - lobbyK * .15;
    R.render(sc, cam);
    // tag positions (above each head)
    items.forEach((it, i) => {
      const tg = tags[i]; if (!tg) return; v.set(0, 5.6, 0); it.g.localToWorld(v); v.project(cam);
      tg.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%, -100%)`;
      tg.style.opacity = it.g.visible ? "" : "0";
    });
    const gt = tags[4]; if (gt) { v.set(0, 5.6, 0); ghost.localToWorld(v); v.project(cam); gt.style.transform = `translate(${(v.x * 0.5 + 0.5) * W}px, ${(-v.y * 0.5 + 0.5) * H}px) translate(-50%, -100%)`; }
  }
  frame();
}

if (canvas) init().catch((e) => { console.warn("stage", e); document.documentElement.classList.add("no-stage"); });
