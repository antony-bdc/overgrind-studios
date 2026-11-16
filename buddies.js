/* Overgrind scroll buddies: FreshStatue and Andrin show up all over the page. They sit on section titles,
   point at the video, check TikTok on their phone, peek over the application form, cheer when you build an avatar
   and say bye in the footer. One fixed transparent canvas, pixel camera, so they stick exactly to the DOM. */
import * as THREE from "./vendor/three.module.min.js";
import { loadCrew, makeAvatar, clamp, blip } from "./crew3d.js";
import { pxStage, sparks } from "./stage.js";
import { Actor, EMOTE_SETS } from "./anim.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = () => innerWidth < 860;

/* where they go. at: line1end = end of the first text line, top = top edge of the box at fx (0..1) */
const SPEC = [
  { sel: "#road-title", who: "an", mode: "stand", at: "line1end", hello: "wave", size: 1.5 },
  { sel: ".dl-video", who: "fs", mode: "sit", at: "top", fx: .8, hello: "point", size: .27, pitch: .35 },
  { sel: ".tt-head h3", who: "an", mode: "stand", at: "line1end", hello: "phone", size: 2.6, idle: ["phone", "lookaround", "phone"] },
  { sel: "#studio-title", who: "fs", mode: "stand", at: "line1end", hello: "wave", size: 1.5 },
  { sel: ".bld-stage", who: "an", mode: "stand", at: "top", fx: .9, hello: "hello", size: .3, event: "og-build" },
  { sel: ".ap-form", who: "fs", mode: "peek", at: "top", fx: .14, size: .34, form: true },
  { sel: ".ap-form", who: "an", mode: "peek", at: "top", fx: .86, size: .3, form: true },
  { sel: "#join-title", who: "fs", mode: "stand", at: "line1end", hello: "dance", size: 1.0, dance: true },
  { sel: "#join-title", who: "an", mode: "stand", at: "line1end", dx: 1.0, hello: "dance", size: 1.0, dance: true },
  { sel: "footer .wrap", who: "fs", mode: "stand", at: "top", fx: .97, hello: "wave", size: 3.2, bye: true },
];

const items = SPEC.map((s) => ({ ...s, el: document.querySelector(s.sel) })).filter((s) => s.el);
if (items.length && !matchMedia("(max-width: 380px)").matches) {
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); init().catch((e) => console.warn("buddies", e)); } }, { rootMargin: "400px 0px" });
  ["#road", ".devlog", ".studio", ".builder", ".apply", ".join"].forEach((s) => { const el = document.querySelector(s); if (el) io.observe(el); });
}

function firstLine(el) { // rect of the first rendered text line of a heading
  const r = document.createRange(); r.selectNodeContents(el); const rs = [...r.getClientRects()].filter((q) => q.width > 2);
  if (!rs.length) return el.getBoundingClientRect(); const top = rs[0].top; const line = rs.filter((q) => Math.abs(q.top - top) < 6);
  return { left: Math.min(...line.map((q) => q.left)), right: Math.max(...line.map((q) => q.right)), top, bottom: Math.max(...line.map((q) => q.bottom)), height: rs[0].height };
}

async function init() {
  const canvas = document.createElement("canvas"); canvas.className = "buddies-gl"; canvas.setAttribute("aria-hidden", "true"); document.body.appendChild(canvas);
  const S = pxStage(canvas), { scene, cam, renderer } = S; renderer.localClippingEnabled = true;
  const data = await loadCrew("", ["fs", "an"]);
  const fx = sparks(scene, 160);
  document.body.classList.add("buddies-on");
  window.__buddies = items;
  for (const it of items) {
    it.J = makeAvatar(it.who, data); it.J.root.visible = false; scene.add(it.J.root);
    it.A = new Actor(it.J, { idle: true }); if (it.idle) it.A.idlePool = it.idle;
    if (it.mode === "sit") it.A.setLoop("sit");
    it.clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (it.mode === "peek") { it.J.mat.clippingPlanes = [it.clip]; if (it.J.extraMat) it.J.extraMat.clippingPlanes = [it.clip]; }
    it.on = false; it.drop = 0; it.vy = 0; it.rise = 0; it.cycle = -1; it.lastSeen = -99;
  }
  // reactions to the page
  addEventListener("og-build", () => { const b = items.find((i) => i.event === "og-build"); if (b && b.on && !b.A.busy()) b.A.play(["clap", "cheer", "think", "clap"][(Math.random() * 4) | 0], { voice: false }); });
  addEventListener("og-obby-done", () => { const b = items.find((i) => i.sel === "#road-title"); if (b && b.on) { b.A.play("cheer"); fx.burst(b.x, b.y + b.s * 1.8, 40, 30, 420, ["#3EE07A", "#FFC34D", "#ffffff"]); } });
  const stage = document.querySelector(".ap-stage");
  let formState = "";
  const mouse = { x: -1, y: -1, in: false }; addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; }, { passive: true });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit() { if (!mouse.in) return null; ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    for (const it of items) if (it.on && it.J.root.visible) { const h = ray.intersectObjects(it.J.meshes, false); if (h.length && (it.mode !== "peek" || h[0].point.y > -it.clip.constant)) return it; } return null; }
  addEventListener("click", (e) => { if (e.target.closest("a,button,input,select,textarea,label,canvas")) return; const it = hit(); if (!it) return;
    const set = EMOTE_SETS[it.who]; it.cycle = (it.cycle + 1) % set.length; it.A.play(it.mode === "sit" && /jump|victory|spin/.test(set[it.cycle]) ? "wave" : set[it.cycle]); });

  let last = performance.now(), t = 0, prevHover = null;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    const H = innerHeight; let any = false;
    // form mood for the peekers
    if (stage) { const st = stage.classList.contains("sent") ? "sent" : stage.classList.contains("nope") ? "nope" : stage.matches(":focus-within") ? "focus" : "";
      if (st !== formState) { formState = st; items.filter((i) => i.form && i.on).forEach((i, k) => setTimeout(() => i.A.play(st === "sent" ? "victory" : st === "nope" ? (k ? "shrug" : "facepalm") : st === "focus" ? "hop" : "wave", { voice: st === "sent" && !k }), k * 180));
        if (st === "nope") setTimeout(() => stage.classList.remove("nope"), 600); } }
    for (const it of items) {
      const r = it.el.getBoundingClientRect(), vis = r.bottom > -40 && r.top < H + 260 && r.width > 0;
      if (!vis) { if (it.on) { it.on = false; it.J.root.visible = false; } continue; }
      it.lastSeen = t; any = true;
      // anchor point (screen px) and size
      let ax, ay, s;
      if (it.at === "line1end") { const L = firstLine(it.el); s = L.height * it.size; ax = L.right - s * .32 - (it.dx || 0) * s * .62; ay = L.top + L.height * (it.mode === "sit" ? .2 : .14); }
      else { s = clamp(r.width * it.size, 70, it.mode === "peek" ? 200 : 170) * (small() ? .8 : 1); if (it.bye) s = clamp(r.height * it.size, 60, 120); ax = r.left + r.width * (it.fx ?? .5); ay = r.top; }
      if (small() && it.at === "line1end") s *= .85;
      const S2 = s / 2.05, wx = ax, wy = H - ay; it.x = wx; it.y = wy; it.s = S2;
      // enter: drop in (or rise for peekers) the first time it comes into view
      const inView = r.top < H * .88 && r.bottom > H * .1;
      if (!it.on && inView) { it.on = true; it.J.root.visible = true; it.drop = reduce || it.mode === "peek" ? 0 : 520; it.vy = 0; it.landed = false; it.rise = 0; }
      if (!it.on) continue;
      if (!it.landed) { it.vy -= 3000 * dt; it.drop = Math.max(0, it.drop + it.vy * dt); if (it.drop <= 0) { it.landed = true; if (it.mode !== "peek") { it.A.play("land", { voice: false, sound: false }); fx.burst(wx, wy + 4, 40, 16, 240, ["#F2EFE9", "#FF4D1A"]); }
        setTimeout(() => it.hello && it.A.play(it.hello, { voice: false, sound: false }), 600); } }
      if (it.dance && it.landed && !it.A.busy() && Math.random() < dt * .25) it.A.play(Math.random() < .5 ? "dance" : "cheer", { voice: false, sound: false });
      // peekers: hidden behind the top edge of the form, rise further while you type
      let y = wy + it.drop;
      if (it.mode === "peek") { const goal = formState === "focus" || formState === "sent" ? .72 : .5; it.rise += (goal - it.rise) * Math.min(1, dt * 3); y = wy - 2.05 * S2 * (1 - it.rise); it.clip.constant = -wy; }
      if (it.mode === "sit") y = wy - .78 * S2 + it.drop;
      // look at the cursor
      if (mouse.in) { const hx = wx, hy = H - (y + S2 * 1.75); it.A.lookAt(Math.atan2(mouse.x - hx, 420), Math.atan2(mouse.y - (H - hy), 600) * .7); } else it.A.lookAt(it.pitch ? 0 : .2, it.pitch || 0);
      if (it.pitch && !mouse.in) it.A.lookAt(-.1, it.pitch);
      it.A.update(dt);
      it.J.root.scale.setScalar(S2); it.J.root.position.set(wx, y, 0);
      it.J.root.rotation.set(it.mode === "sit" ? .12 : .05, it.mode === "peek" ? 0 : (wx > innerWidth * .5 ? -.35 : .35), 0);
    }
    const h = hit(); if (h !== prevHover) { prevHover = h; document.documentElement.classList.toggle("buddy-hover", !!h); if (h && !h.A.busy()) { h.A.play("hop", { voice: false, sound: false }); blip("tick"); } }
    fx.step(dt);
    if (any) renderer.render(scene, cam); else renderer.clear();
  }
  requestAnimationFrame(frame);
}
