/* Overgrind scroll scenes, both drawn with an orthographic camera in CSS pixels so 3D lines up with the DOM:
   1) Worlds runway: FreshStatue runs along a stud lane above the game panels and jumps through a portal into every world,
      switching into that game's outfit.
   2) Roadmap obby: floating stud platforms on the roadmap, FreshStatue jumps from "Now" to "Later" as you scroll. */
import * as THREE from "./vendor/three.module.min.js";
import { LITE, loadCrew, makeAvatar, setArm, setOutfit, updateOutfit, blip, say, clamp, sm } from "./crew3d.js";
import { pxStage, studBrick, runPose, airPose, sparks } from "./stage.js";
import { Actor } from "./anim.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = matchMedia("(min-width: 861px)");

/* ============ 1) worlds runway ============ */
async function runway() {
  const sec = document.querySelector(".worlds"), rail = sec && sec.querySelector(".rail"), canvas = sec && sec.querySelector(".runway-gl");
  if (!canvas || !desktop.matches || reduce) return;
  const panels = [...rail.querySelectorAll(".panel")].map((p) => ({ el: p, key: (p.getAttribute("href") || "").split("/")[1], accent: p.dataset.accent || "#FF4D1A" }));
  const S = pxStage(canvas), { scene } = S;
  const data = await loadCrew("", ["fs", "an"]);
  const FSH = 112, sc = FSH / 2.05;
  // FreshStatue leads, Andrin runs right behind him
  const runners = [["fs", 0], ["an", -118]].map(([k, off]) => { const J = makeAvatar(k, data); J.root.scale.setScalar(sc * (k === "an" ? .96 : 1)); scene.add(J.root); return { k, J, A: new Actor(J, { voice: false }), off, world: -1, x: 0 }; });
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
  let fsX = 0, laneY = 0, prevX = null, vel = 0, dir = 1, active = false, last = performance.now();
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
    const gaps = portals.map((P, i) => { const r = panels[i].el.getBoundingClientRect(); const x = r.left - cr.left - 14; P.g.position.set(x, laneY + 72, 0); P.ring.rotation.z = now / 900; P.disc.material.uniforms.uT.value = now / 1000; P.g.visible = x > -200 && x < S.W + 200; return x; });
    const run = clamp(speed / 900, 0, 1), moving = run > .05;
    for (const R of runners) {
      const tx = fsX + R.off * (dir > 0 ? 1 : -1); R.x = R.x ? R.x + (tx - R.x) * Math.min(1, dt * 3) : tx;
      let w = -1; gaps.forEach((x, i) => { if (x < R.x) w = i; });
      if (w !== R.world) {
        const p = panels[Math.max(0, w)];
        if (R.world !== -1 || w >= 0) { setOutfit(R.J, w >= 0 ? p.key : ""); if (R.world !== -1) { R.A.play("jump", { voice: false, sound: false }); fx.burst(R.x, laneY + 70, 60, 40, 520, [p.accent, "#ffffff", "#FFC34D"]); blip("whoosh"); } }
        R.world = w;
      }
      R.A.setLoop(moving ? (run > .45 ? "run" : "walk") : "idle"); R.A.idle = !moving;
      R.A.update(dt);
      R.J.root.position.set(R.x, laneY, R.k === "fs" ? 30 : 10);
      const yaw = moving ? dir * 1.1 : (R.k === "fs" ? .3 : -.2); R.J.root.rotation.y += (yaw - R.J.root.rotation.y) * Math.min(1, dt * 10); R.J.root.rotation.x = .12;
      updateOutfit(R.J, now / 1000);
    }
    fx.step(dt);
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
  const J = makeAvatar("fs", data); scene.add(J.root); const A = new Actor(J, { voice: false });
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
    A.setLoop(moving && air < 0 ? "run" : "idle"); A.idle = !moving; A.update(dt);
    if (air >= 0) { J.body.position.set(0, 0, 0); J.body.rotation.set(0, 0, 0); airPose(J, air); }
    // land puffs + step highlight
    const landed = air < 0 ? (f >= .85 || shown >= .999 ? seg + 1 : seg) : -1;
    if (landed >= 0 && landed !== lastSeg) { if (lastSeg !== -1) { fx.burst(x, y, 40, 22, 260, ["#" + new THREE.Color(COLS[landed]).getHexString(), "#ffffff"]); blip("land"); } lastSeg = landed; items.forEach((el, i) => el.classList.toggle("hit", i <= landed)); A.play("land", { voice: false, sound: false }); }
    if (shown >= .995 && !reached) { reached = true; dispatchEvent(new Event("og-obby-done")); A.play("victory", { voice: false, sound: false }); flagMat.emissive.set(0x3ee07a); flagMat.color.set(0x1a6b38); fx.burst(L.x + 60, L.y + 90, 30, 60, 520, ["#3EE07A", "#FFC34D", "#ffffff"]); blip("spark"); }
    if (shown < .9 && reached) { reached = false; flagMat.emissive.set(0x000000); flagMat.color.set(0x333333); }
    J.root.position.set(x, y, 40); J.root.rotation.y += ((moving || air >= 0 ? dirF * 1.1 : .3) - J.root.rotation.y) * Math.min(1, dt * 10); J.root.rotation.x = .1;
    const cp = cloth.geometry.attributes.position.array; for (let i = 0; i < cp.length; i += 3) { const xx = clothBase[i] + 23; cp[i + 2] = Math.sin(xx * .12 - now / 160) * xx * .12; } cloth.geometry.attributes.position.needsUpdate = true;
    fx.step(dt);
    S.renderer.render(scene, S.cam);
  }
  requestAnimationFrame(frame);
}

function lazy(sel, fn) { const el = document.querySelector(sel); if (!el) return; const io = new IntersectionObserver((es) => { if (!es[0].isIntersecting) return; io.disconnect(); fn().catch((e) => console.warn(sel, e)); }, { rootMargin: "700px 0px" }); io.observe(el); }
lazy(".worlds", runway);
lazy(".road", obby);
