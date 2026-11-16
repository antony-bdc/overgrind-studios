/* Overgrind hero: FreshStatue and Andrin drop onto the giant OVERGRIND wordmark, land, say hi,
   high-five and then hang out on the letters, watching your cursor. Click them for emotes. */
import * as THREE from "./vendor/three.module.min.js";
import { loadCrew, makeAvatar, clamp, blip, say, preloadVoices, setOutfit, updateOutfit } from "./crew3d.js";
import { makeGrinder, loadGrinder, hasBuilt } from "./grinder.js";
import { pxStage, sparks } from "./stage.js";
import { Actor, EMOTE_SETS, mood } from "./anim.js";

const canvas = document.getElementById("hero-gl"), hero = document.querySelector(".hero"), mark = document.querySelector(".mark .w");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let intro = false; window.__bricksIntro = window.__heroIntro = () => { intro = true; };
setTimeout(() => { intro = true; }, 3200);
if (canvas && mark) init().catch((e) => console.warn("hero", e));

async function init() {
  const S = pxStage(canvas), { scene, cam } = S;
  const data = await loadCrew("", ["fs", "an"]);
  const fx = sparks(scene, 200);
  const crew = ["fs", "an"].map((k, i) => { const J = makeAvatar(k, data); scene.add(J.root); J.root.visible = false;
    return { k, J, A: new Actor(J), x: 0, feet: 0, size: 1, drop: -1, vy: 0, y: 0, landed: false, hover: false, cycle: -1, delay: i * .28 }; });
  const [FS, AN] = crew;
  const MOOD = mood();
  let t = 0, nextDuo = 9, five = -1;
  if (MOOD === "night") setOutfit(AN.J, "lantern"); // late visitors: Andrin brings the lantern
  // the visitor's own grinder from the avatar builder joins the crew (left of the founder, so FreshStatue stays in the middle)
  let GR = null;
  function addGrinder() {
    if (GR) { GR.G.set(loadGrinder()); const f = GR.G.state.fit || ""; if ((GR.J.outfit && GR.J.outfit.key || "") !== f) setOutfit(GR.J, f); return; }
    const G = makeGrinder(scene, loadGrinder()); G.J.root.visible = false; if (G.state.fit) setOutfit(G.J, G.state.fit);
    GR = { k: "me", J: G.J, G, A: new Actor(G.J, { voice: false }), x: 0, feet: 0, size: 1, drop: -1, vy: 0, y: 0, landed: false, hover: false, cycle: -1, delay: .56 };
    if (intro && t > 1) GR.drop = t + .2; crew.push(GR);
  }
  if (hasBuilt()) addGrinder();
  addEventListener("og-build", () => { if (hasBuilt()) addGrinder(); });
  // soft glow behind the duo
  const gc = document.createElement("canvas"); gc.width = gc.height = 256; const gg = gc.getContext("2d"), gr = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,110,60,.28)"); gr.addColorStop(.5, "rgba(255,77,26,.08)"); gr.addColorStop(1, "rgba(0,0,0,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.z = -400; scene.add(glow);
  canvas.classList.add("on"); preloadVoices("fs"); preloadVoices("an");

  /* pointer */
  const mouse = { x: -1, y: -1, in: false, last: 0 }, ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; mouse.last = performance.now(); }, { passive: true });
  function pick() {
    const r = canvas.getBoundingClientRect(); if (!mouse.in) return null;
    ndc.set((mouse.x - r.left) / r.width * 2 - 1, -((mouse.y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    for (const c of crew) if (c.landed && ray.intersectObjects(c.J.meshes, false).length) return c; return null;
  }
  addEventListener("click", (e) => {
    if (e.target.closest("a,button,input,select,textarea")) return; const c = pick(); if (!c) return;
    const set = EMOTE_SETS[c.k] || ["wave", "jump", "dance", "spin", "cheer", "dab"]; c.cycle = (c.cycle + 1) % set.length; c.A.play(set[c.cycle]); mouse.last = performance.now(); nextDuo = t + 14;
    if (set[c.cycle] === "jump" || set[c.cycle] === "victory") setTimeout(() => fx.burst(c.x, c.feet + 6, 80, 22, 320, ["#F2EFE9", "#FF4D1A"]), 520);
  });

  /* duo moments when nobody is touching them */
  function duo() {
    const pool = MOOD === "evening" ? ["dance", "dance", "five", "cheer"] : MOOD === "night" ? ["five", "pointcrown"] : ["five", "dance", "pointcrown", "cheer", "five"];
    const pick = pool[(Math.random() * pool.length) | 0];
    if (GR && GR.landed && (pick === "dance" || pick === "cheer")) setTimeout(() => GR.A.play(pick, { voice: false, sound: false }), 400);
    if (pick === "five") { five = t; FS.A.play("highfiveL", { sound: false }); AN.A.play("highfiveR", { sound: false }); }
    if (pick === "dance") { FS.A.play("dance", { voice: false, sound: false }); setTimeout(() => AN.A.play("dance", { voice: false, sound: false }), 250); }
    if (pick === "pointcrown") { FS.A.lookAt(.9, 0); FS.A.play("point", { voice: false, sound: false }); setTimeout(() => AN.A.play("crown", { voice: false, sound: false }), 600); }
    if (pick === "cheer") { FS.A.play("cheer", { voice: false, sound: false }); AN.A.play("cheer", { voice: false, sound: false }); }
  }

  /* layout: both stand on top of the letters */
  function layout() {
    const cr = canvas.getBoundingClientRect(), r = mark.getBoundingClientRect(), small = innerWidth < 860;
    const top = cr.bottom - (r.top + r.height * .1); // letter cap line in canvas px (y up)
    const H = Math.min(clamp(r.height * (small ? 1.9 : 1.7), 110, 340), r.top + r.height * .1 - (small ? 84 : 104));
    FS.x = r.left - cr.left + r.width * (small ? .5 : .55); AN.x = r.left - cr.left + r.width * (small ? .78 : .74);
    if (GR) GR.x = r.left - cr.left + r.width * (small ? .22 : .36);
    for (const c of crew) { c.feet = top; c.size = H / 2.05; }
    glow.position.set((FS.x + AN.x) / 2, top + H * .5, -400); glow.scale.set(H * 3.4, H * 2.6, 1);
  }

  let last = performance.now(), visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; if (!visible) return; t += dt;
    layout();
    const hov = pick();
    for (const c of crew) {
      // drop-in with gravity, squash on landing
      if (intro && c.drop < 0) c.drop = t + c.delay;
      if (c.drop >= 0 && t >= c.drop && !c.landed) { c.J.root.visible = true; if (c.y === 0 && c.vy === 0) c.y = reduce ? 0 : 700; c.vy -= 3200 * dt; c.y += c.vy * dt;
        if (c.y <= 0) { c.y = 0; c.vy = 0; c.landed = true; c.A.play("land", { voice: false, sound: false }); blip("land"); fx.burst(c.x, c.feet + 4, 60, 26, 300, ["#F2EFE9", "#9a948a", "#FF4D1A"]); blip("thud");
          setTimeout(() => c.A.play(c.k === "fs" ? (MOOD === "morning" ? "stretch" : MOOD === "night" ? "yawn" : "wave") : c.k === "me" ? "hello" : MOOD === "evening" ? "dance" : "hello", { voice: c.k === "fs" && MOOD !== "night" }), c.k === "fs" ? 650 : 900);
          if (c.k === "an") setTimeout(() => { if (!FS.A.busy()) { five = t; FS.A.play("highfiveL", { sound: false }); AN.A.play("highfiveR", { sound: false }); } }, 3000); } }
      // look at the cursor, or at each other when the cursor is away
      const idleMouse = !mouse.in || now - mouse.last > 4000, cr = canvas.getBoundingClientRect();
      if (idleMouse) c.A.lookAt(c === AN ? -.55 : .55, 0);
      else { const hx = cr.left + c.x, hy = cr.bottom - (c.feet + c.size * 1.75); c.A.lookAt(Math.atan2(mouse.x - hx, 500), Math.atan2(mouse.y - hy, 700) * .8); }
      const isHov = hov === c; if (isHov && !c.hover && !c.A.busy()) c.A.play("hop", { voice: false }); c.hover = isHov;
      c.A.update(dt);
      c.J.root.scale.setScalar(c.size); c.J.root.position.set(c.x, c.feet + c.y, 0);
      c.J.root.rotation.set(.06, (c === FS ? .22 : c === GR ? .4 : -.22), 0);
      if (c.J.outfit) updateOutfit(c.J, t);
    }
    hero.style.cursor = hov ? "pointer" : "";
    if (five >= 0 && t - five > .5) { five = -1; fx.burst((FS.x + AN.x) / 2, FS.feet + FS.size * 2.35, 50, 34, 420, ["#FFC34D", "#FF4D1A", "#ffffff"]); }
    if (FS.landed && AN.landed && t > nextDuo && now - mouse.last > 3000 && !FS.A.busy() && !AN.A.busy()) { duo(); nextDuo = t + 12 + Math.random() * 6; }
    fx.step(dt);
    S.renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);
}
