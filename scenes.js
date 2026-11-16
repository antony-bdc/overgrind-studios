/* Overgrind scroll scenes, both drawn with an orthographic camera in CSS pixels so 3D lines up with the DOM:
   1) Worlds runway: FreshStatue runs along a stud lane above the game panels and jumps through a portal into every world,
      switching into that game's outfit.
   2) Roadmap obby: floating stud platforms on the roadmap, FreshStatue jumps from "Now" to "Later" as you scroll. */
import * as THREE from "./vendor/three.module.min.js";
import { LITE, loadCrew, makeAvatar, setArm, setOutfit, updateOutfit, blip, say, clamp, sm } from "./crew3d.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = matchMedia("(min-width: 861px)");

function pxStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(LITE ? 1 : 2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(0, 1, 1, 0, -3000, 3000); cam.position.z = 1000;
  scene.add(new THREE.HemisphereLight(0xf4f1ff, 0x1a0c06, 1.1));
  const key = new THREE.DirectionalLight(0xfff1e4, 2.3); key.position.set(-.4, .9, 1); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff6a33, 1.8); rim.position.set(1, .3, -.8); scene.add(rim);
  let W = 1, H = 1;
  const size = () => { W = canvas.clientWidth || 1; H = canvas.clientHeight || 1; renderer.setSize(W, H, false); cam.right = W; cam.top = H; cam.updateProjectionMatrix(); };
  size(); new ResizeObserver(size).observe(canvas);
  return { renderer, scene, cam, get W() { return W; }, get H() { return H; }, key, rim };
}

/* one Roblox 2x? stud brick, width in studs, unit = px per stud */
function studBrick(nx, nz, unit, color, hgt = .6) {
  const g = new THREE.Group(), mat = new THREE.MeshPhysicalMaterial({ color, roughness: .32, clearcoat: .7, clearcoatRoughness: .3 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(nx * unit, hgt * unit, nz * unit), mat); b.position.y = -hgt * unit / 2; g.add(b);
  const sg = new THREE.CylinderGeometry(unit * .3, unit * .3, unit * .2, 20), st = new THREE.InstancedMesh(sg, mat, nx * nz), m = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { m.makeTranslation((i - (nx - 1) / 2) * unit, unit * .1, (j - (nz - 1) / 2) * unit); st.setMatrixAt(k++, m); }
  g.add(st); g.userData.mat = mat; return g;
}

/* shared avatar posing */
function runPose(J, ph, amt) {
  const s = Math.sin(ph);
  J.legL.rotation.x = s * .75 * amt; J.legR.rotation.x = -s * .75 * amt;
  setArm(J.armR, (s * 50) * amt + 4, 5, -1); setArm(J.armL, (-s * 50) * amt + 4, 5, 1);
  J.body.position.y = Math.abs(Math.cos(ph)) * .07 * amt; J.body.rotation.x = .1 * amt;
}
function airPose(J, u) { // u: 0 take-off → 1 landing
  J.legL.rotation.x = -.7; J.legR.rotation.x = .35; setArm(J.armR, 150 - 40 * u, 20, -1); setArm(J.armL, 150 - 40 * u, 20, 1);
  J.body.position.y = 0; J.body.rotation.x = -.05 + .2 * u;
}

/* little additive spark bursts in px space */
function sparks(scene, n = 160) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), P = [];
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "#fff"); r.addColorStop(.35, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 9, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
  pts.frustumCulled = false; scene.add(pts); for (let i = 0; i < n; i++) P.push({ life: 0 }); let head = 0; const tc = new THREE.Color();
  return {
    burst(x, y, z, k, speed, colors) { for (let i = 0; i < k; i++) { const p = P[head]; const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random()); Object.assign(p, { life: .6 + Math.random() * .6, age: 0, x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v + speed * .4, c: colors[i % colors.length] }); head = (head + 1) % n; } },
    step(dt) { for (let i = 0; i < n; i++) { const p = P[i]; if (p.life <= 0 || p.age >= p.life) { pos[i * 3 + 1] = -9999; continue; } p.age += dt; p.vy -= 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; const f = 1 - p.age / p.life; tc.set(p.c).multiplyScalar(f); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b; } geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true; },
  };
}

/* ============ 1) worlds runway ============ */
async function runway() {
  const sec = document.querySelector(".worlds"), rail = sec && sec.querySelector(".rail"), canvas = sec && sec.querySelector(".runway-gl");
  if (!canvas || !desktop.matches || reduce) return;
  const panels = [...rail.querySelectorAll(".panel")].map((p) => ({ el: p, key: (p.getAttribute("href") || "").split("/")[1], accent: p.dataset.accent || "#FF4D1A" }));
  const S = pxStage(canvas), { scene } = S;
  const data = await loadCrew("", ["fs"]);
  const J = makeAvatar("fs", data); scene.add(J.root);
  const FSH = 112, sc = FSH / 2.05; J.root.scale.setScalar(sc);
  const fx = sparks(scene);
  // stud lane: a row of bricks that scrolls with the rail
  const U = 22, BW = 4, lane = new THREE.Group(); scene.add(lane);
  const laneCols = [0x3a3a44, 0x31313a, 0x42424d], tiles = [];
  for (let i = 0; i < 40; i++) { const b = studBrick(BW, 2, U, laneCols[i % 3]); b.rotation.x = .42; lane.add(b); tiles.push(b); }
  // portals between the worlds
  const swirl = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color() }, uA: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: "uniform float uT,uA; uniform vec3 uC; varying vec2 vUv; void main(){ vec2 p=vUv-.5; float r=length(p)*2.; float a=atan(p.y,p.x); float s=sin(a*3.+r*9.-uT*5.)*.5+.5; float m=smoothstep(1.,.55,r); float c=mix(.25,1.,s)*m*(.35+.65*r); gl_FragColor=vec4(uC*c*1.6*uA, c*uA); }" });
  const portals = panels.map((p, i) => {
    const g = new THREE.Group(), col = new THREE.Color(p.accent);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(56, 6, 14, 64), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .9, roughness: .3, metalness: .2 }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(53, 48), swirl.clone()); disc.material.uniforms.uC.value = col;
    const frame = studBrick(2, 2, U, 0x18181c); frame.position.y = -60; frame.scale.set(1.3, 1, 1);
    g.add(ring, disc, frame); g.rotation.y = 1.05; scene.add(g); return { g, ring, disc, col, i };
  });
  // layout: lane sits right above the panels
  let fsX = 0, laneY = 0, prevX = null, vel = 0, dir = 1, ph = 0, world = -1, jumpT = 1, active = false, last = performance.now();
  function layout() {
    const top = rail.offsetTop - 208 + "px"; if (canvas.style.top !== top) canvas.style.top = top;
    const cr = canvas.getBoundingClientRect(), rr = rail.getBoundingClientRect();
    laneY = cr.bottom - rr.top + 12; fsX = S.W * .34;
    return rr;
  }
  new IntersectionObserver((es) => { active = es[0].isIntersecting; }, { threshold: 0 }).observe(sec);
  canvas.classList.add("on");
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; if (!active) return;
    const cr = canvas.getBoundingClientRect(), rr = layout();
    const off = rr.left; // rail scroll position
    if (prevX != null) { const v = (prevX - off) / Math.max(dt, .001); vel += (v - vel) * Math.min(1, dt * 8); } prevX = off;
    const speed = Math.abs(vel); if (speed > 40) dir = vel > 0 ? 1 : -1;
    // lane tiles wrap around so the lane looks endless but moves exactly with the rail
    const tw = BW * U, base = ((off % tw) + tw) % tw - tw;
    tiles.forEach((b, i) => { b.position.set(base + i * tw + tw / 2, laneY, 0); });
    // portals sit in the gaps between panels
    let w = -1;
    portals.forEach((P, i) => { const r = panels[i].el.getBoundingClientRect(); const x = r.left - cr.left - 14; P.g.position.set(x, laneY + 72, 0); P.ring.rotation.z = now / 900; P.disc.material.uniforms.uT.value = now / 1000; if (x < fsX) w = i; P.g.visible = x > -200 && x < S.W + 200; });
    if (w !== world) {
      if (world !== -1 || w >= 0) { const p = panels[Math.max(0, w)]; setOutfit(J, w >= 0 ? p.key : ""); if (world !== -1) { jumpT = 0; fx.burst(fsX, laneY + 70, 60, 46, 520, [p.accent, "#ffffff", "#FFC34D"]); blip("whoosh"); } }
      world = w;
    }
    // run / jump through the portal
    const run = clamp(speed / 900, 0, 1); ph += dt * (6 + run * 10) * (run > .05 ? 1 : 0);
    jumpT = Math.min(1, jumpT + dt / .55);
    let y = laneY;
    if (jumpT < 1) { y += Math.sin(jumpT * Math.PI) * 46; airPose(J, jumpT); } else if (run > .05) runPose(J, ph, Math.min(1, run * 1.6 + .3)); else { runPose(J, 0, 0); setArm(J.armR, 4 + Math.sin(now / 600) * 3, 4, -1); setArm(J.armL, 4 - Math.sin(now / 600) * 3, 4, 1); }
    J.root.position.set(fsX, y, 30);
    const yaw = run > .05 || jumpT < 1 ? dir * 1.1 : .35; J.root.rotation.y += (yaw - J.root.rotation.y) * Math.min(1, dt * 10); J.root.rotation.x = .12;
    J.head.rotation.y = (run > .05 ? 0 : Math.sin(now / 1400) * .3);
    updateOutfit(J, now / 1000); fx.step(dt);
    S.renderer.render(scene, S.cam);
  }
  requestAnimationFrame(frame);
}

/* ============ 2) roadmap obby ============ */
async function obby() {
  const road = document.querySelector(".road"), steps = road && road.querySelector(".steps"), canvas = road && road.querySelector(".obby-gl");
  if (!canvas || !desktop.matches) return;
  const items = [...steps.querySelectorAll(".step")];
  const S = pxStage(canvas), { scene } = S;
  const data = await loadCrew("", ["fs"]);
  const J = makeAvatar("fs", data); scene.add(J.root);
  const FSH = 104, sc = FSH / 2.05; J.root.scale.setScalar(sc);
  const fx = sparks(scene);
  road.classList.add("obby-on");
  const U = 20, COLS = [0xff4d1a, 0xffc34d, 0x2bd4e0, 0xa47bff], LIFT = [0, 26, 52, 78];
  const plats = items.map((el, i) => { const b = studBrick(6, 3, U, COLS[i], .8); b.rotation.x = .38; scene.add(b); return { b, el, x: 0, y: 0 }; });
  // kill brick between 2 and 3, checkpoint flag on the last platform
  const kill = new THREE.Mesh(new THREE.BoxGeometry(70, 12, 12), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff1a1a, emissiveIntensity: 2.2 })); scene.add(kill);
  const flag = new THREE.Group(); scene.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 96, 10), new THREE.MeshStandardMaterial({ color: 0xd9d6cf, metalness: .5, roughness: .3 })); pole.position.y = 48; flag.add(pole);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000, side: THREE.DoubleSide, roughness: .6 });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(46, 30, 8, 1), flagMat); cloth.position.set(24, 80, 0); flag.add(cloth);
  const clothBase = cloth.geometry.attributes.position.array.slice();
  let prog = 0, shown = 0, last = performance.now(), active = false, lastSeg = -1, reached = false, prevU = 0, dirF = 1;
  new IntersectionObserver((es) => { active = es[0].isIntersecting; }, { threshold: 0 }).observe(road);
  const read = () => { const r = steps.getBoundingClientRect(); prog = clamp((innerHeight * .78 - r.top) / (innerHeight * .55), 0, 1); };
  canvas.classList.add("on");
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; if (!active) return;
    read(); shown += (prog - shown) * (reduce ? 1 : Math.min(1, dt * 6));
    const cr = canvas.getBoundingClientRect();
    plats.forEach((p, i) => { const r = p.el.getBoundingClientRect(); p.x = r.left - cr.left + 6 * U / 2; p.y = (cr.bottom - r.top) + 30 + LIFT[i] + Math.sin(now / 900 + i * 1.7) * 4; p.b.position.set(p.x, p.y, 0); });
    const a = plats[1], b = plats[2]; kill.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 30, 0); kill.rotation.z = now / 380;
    const L = plats[3]; flag.position.set(L.x + 40, L.y + 4, -10);
    // fs path: stand / run on platform i, then a jump arc to i+1
    const u = shown * 3, seg = Math.min(2, Math.floor(u)), f = u - seg; if (Math.abs(u - prevU) > .0005) dirF = u > prevU ? 1 : -1; prevU = u;
    const P0 = plats[seg], P1 = plats[seg + 1]; const W2 = 3 * U - 14;
    let x, y, air = -1;
    if (f < .3) { x = P0.x - W2 * .4 + (f / .3) * W2 * 1.2; y = P0.y + 4; }
    else if (f < .85) { const k = (f - .3) / .55; air = k; x = (P0.x + W2 * .8) + ((P1.x - W2 * .4) - (P0.x + W2 * .8)) * k; y = P0.y + 4 + (P1.y - P0.y) * k + Math.sin(k * Math.PI) * (72 + (seg === 1 ? 34 : 0)); }
    else { x = P1.x - W2 * .4 + ((f - .85) / .15) * W2 * .4; y = P1.y + 4; }
    if (shown >= .999) { x = L.x; y = L.y + 4; air = -1; }
    const moving = Math.abs(prog - shown) > .002;
    if (air >= 0) airPose(J, air); else if (moving) runPose(J, now / 70, 1); else { runPose(J, 0, 0); setArm(J.armR, 4, 4, -1); setArm(J.armL, 4, 4, 1); }
    // land puffs + step highlight
    const landed = air < 0 ? (f >= .85 || shown >= .999 ? seg + 1 : seg) : -1;
    if (landed >= 0 && landed !== lastSeg) { if (lastSeg !== -1) { fx.burst(x, y, 40, 22, 260, ["#" + new THREE.Color(COLS[landed]).getHexString(), "#ffffff"]); blip("thud"); } lastSeg = landed; items.forEach((el, i) => el.classList.toggle("hit", i <= landed)); }
    if (shown >= .995 && !reached) { reached = true; flagMat.emissive.set(0x3ee07a); flagMat.color.set(0x1a6b38); fx.burst(L.x + 60, L.y + 90, 30, 60, 520, ["#3EE07A", "#FFC34D", "#ffffff"]); blip("spark"); }
    if (shown < .9 && reached) { reached = false; flagMat.emissive.set(0x000000); flagMat.color.set(0x333333); }
    J.root.position.set(x, y, 40); J.root.rotation.y += ((moving || air >= 0 ? dirF * 1.1 : .3) - J.root.rotation.y) * Math.min(1, dt * 10); J.root.rotation.x = .1;
    J.head.rotation.y = moving ? 0 : Math.sin(now / 1500) * .35;
    const cp = cloth.geometry.attributes.position.array; for (let i = 0; i < cp.length; i += 3) { const xx = clothBase[i] + 23; cp[i + 2] = Math.sin(xx * .12 - now / 160) * xx * .12; } cloth.geometry.attributes.position.needsUpdate = true;
    fx.step(dt);
    S.renderer.render(scene, S.cam);
  }
  requestAnimationFrame(frame);
}

function lazy(sel, fn) { const el = document.querySelector(sel); if (!el) return; const io = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io.disconnect(); fn().catch((e) => console.warn(sel, e)); }, { rootMargin: "700px 0px" }); io.observe(el); }
lazy(".worlds", runway);
lazy(".road", obby);
