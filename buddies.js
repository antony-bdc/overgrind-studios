/* Overgrind scroll buddies: one FreshStatue and one Andrin travel down the page with you. They jump from spot to
   spot in a real arc: onto section titles, onto the video, over the application form, onto the Join title and into
   the footer. One fixed transparent canvas with a pixel camera, so they stick exactly to the DOM. */
import * as THREE from "./vendor/three.module.min.js";
import { loadCrew, makeAvatar, clamp, blip } from "./crew3d.js";
import { pxStage, sparks, airPose } from "./stage.js";
import { Actor, EMOTE_SETS } from "./anim.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = () => innerWidth < 860;

/* spots. at: line1end = on the end of the first text line, top = on the top edge of the box at fx (0..1) */
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
const spots = SPEC.map((s) => ({ ...s, el: document.querySelector(s.sel) })).filter((s) => s.el);

if (spots.length) {
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); init().catch((e) => console.warn("buddies", e)); } }, { rootMargin: "500px 0px" });
  ["#road", ".devlog", ".studio", ".builder", ".apply", ".join"].forEach((s) => { const el = document.querySelector(s); if (el) io.observe(el); });
}

function firstLine(el) { // the first rendered text line of a heading
  const r = document.createRange(); r.selectNodeContents(el); const rs = [...r.getClientRects()].filter((q) => q.width > 2);
  if (!rs.length) return el.getBoundingClientRect(); const top = rs[0].top; const line = rs.filter((q) => Math.abs(q.top - top) < 6);
  return { left: Math.min(...line.map((q) => q.left)), right: Math.max(...line.map((q) => q.right)), top, bottom: Math.max(...line.map((q) => q.bottom)), height: rs[0].height };
}

/* screen position of a spot: x, y (canvas px, y up), body height h in px */
function place(sp, H) {
  const r = sp.el.getBoundingClientRect(); let ax, ay, s;
  if (sp.at === "line1end") { const L = firstLine(sp.el); s = L.height * sp.size * (small() ? .85 : 1); ax = L.right - s * .32 - (sp.dx || 0) * s * .62; ay = L.top + L.height * .14; }
  else { s = clamp(r.width * sp.size, 70, sp.mode === "peek" ? 200 : 170) * (small() ? .8 : 1); if (sp.bye) s = clamp(r.height * sp.size, 60, 120); ax = r.left + r.width * (sp.fx ?? .5); ay = r.top; }
  return { x: ax, y: H - ay, h: s };
}

async function init() {
  const canvas = document.createElement("canvas"); canvas.className = "buddies-gl"; canvas.setAttribute("aria-hidden", "true"); document.body.appendChild(canvas);
  const S = pxStage(canvas), { scene, cam, renderer } = S; renderer.localClippingEnabled = true;
  const data = await loadCrew("", ["fs", "an"]);
  const fx = sparks(scene, 160);
  document.body.classList.add("buddies-on");
  const T = {}; // one traveller per character
  for (const who of ["fs", "an"]) {
    const J = makeAvatar(who, data); J.root.visible = false; scene.add(J.root);
    const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6); J.mat.clippingPlanes = [clip]; if (J.extraMat) J.extraMat.clippingPlanes = [clip];
    T[who] = { who, J, A: new Actor(J), clip, spot: null, landedSpot: null, from: null, exit: null, k: 1, dur: .75, x: 0, y: 0, h: 100, shown: false, cycle: -1, rise: 0, leaving: false };
  }
  window.__buddies = T;
  addEventListener("og-build", () => { const b = T.an; if (b.spot && b.spot.event === "og-build" && b.k >= 1 && !b.A.busy()) b.A.play(["clap", "cheer", "think", "clap"][(Math.random() * 4) | 0], { voice: false }); });
  addEventListener("og-obby-done", () => { const b = T.an; if (b.spot && b.spot.sel === "#road-title" && b.k >= 1) { b.A.play("cheer"); fx.burst(b.x, b.y + b.h * .9, 40, 30, 420, ["#3EE07A", "#FFC34D", "#ffffff"]); } });
  const stage = document.querySelector(".ap-stage"); let formState = "";
  const mouse = { x: -1, y: -1, in: false }; addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; }, { passive: true });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit() { if (!mouse.in) return null; ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    for (const b of Object.values(T)) if (b.shown) { const h = ray.intersectObjects(b.J.meshes, false); if (h.length && h[0].point.y > -b.clip.constant) return b; } return null; }
  addEventListener("click", (e) => { if (e.target.closest("a,button,input,select,textarea,label,canvas")) return; const b = hit(); if (!b || b.k < 1) return;
    const set = EMOTE_SETS[b.who]; b.cycle = (b.cycle + 1) % set.length; const em = set[b.cycle]; b.A.play(b.spot && b.spot.mode !== "stand" && /jump|victory|spin|dance/.test(em) ? "wave" : em); });

  let last = performance.now(), prevHover = null, lastScroll = scrollY, sdir = 1;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; const H = innerHeight;
    if (Math.abs(scrollY - lastScroll) > 2) sdir = scrollY > lastScroll ? 1 : -1; lastScroll = scrollY;
    // form mood for the peekers
    if (stage) { const st = stage.classList.contains("sent") ? "sent" : stage.classList.contains("nope") ? "nope" : stage.matches(":focus-within") ? "focus" : "";
      if (st !== formState) { formState = st; ["fs", "an"].forEach((w, k) => { const b = T[w]; if (b.spot && b.spot.form && b.k >= 1) setTimeout(() => b.A.play(st === "sent" ? "victory" : st === "nope" ? (k ? "shrug" : "facepalm") : st === "focus" ? "hop" : "wave", { voice: st === "sent" && !k }), k * 180); });
        if (st === "nope") setTimeout(() => stage.classList.remove("nope"), 600); } }
    let any = false;
    for (const b of Object.values(T)) {
      // the best visible spot for this character: closest to the middle of the screen
      let best = null, bd = 1e9;
      for (const sp of spots) { if (sp.who !== b.who) continue; const r = sp.el.getBoundingClientRect(); if (r.width === 0 || r.top > H * .9 || r.bottom < H * .08) continue;
        const d = Math.abs((r.top + Math.min(r.height, 300) / 2) - H * .5); if (d < bd) { bd = d; best = sp; } }
      if (best !== b.spot) {
        const P = best ? place(best, H) : null;
        // jump from where he is now, or in from the screen edge he would come from
        if (b.shown) b.from = { x: b.x, y: b.y, h: b.h };
        else if (P) b.from = { x: P.x + (sdir > 0 ? -60 : 60), y: sdir > 0 ? -P.h * 1.2 : H + P.h * .2, h: P.h };
        b.leaving = !best && b.shown;
        if (b.leaving) b.exit = { x: b.x + 40, y: sdir > 0 ? H + b.h * .3 : -b.h * 1.3, h: b.h };
        b.spot = best; b.landedSpot = null; b.k = reduce ? 1 : 0; b.dur = .75;
        if (best || b.leaving) { b.shown = true; b.J.root.visible = true; }
        b.A.idlePool = best && best.idle || null; b.A.setLoop("idle"); b.rise = 0;
      }
      if (!b.shown) continue;
      const P = b.spot ? place(b.spot, H) : b.exit;
      if (!P) { b.shown = false; b.J.root.visible = false; continue; }
      b.k = Math.min(1, b.k + dt / b.dur);
      const k = b.k, e = 1 - Math.pow(1 - k, 2.2), mode = b.spot ? b.spot.mode : "stand";
      // where his feet go at the end of the jump
      const endY = mode === "sit" ? P.y - .78 * P.h / 2.05 : mode === "peek" ? P.y - P.h * (1 - b.rise) : P.y;
      let x, y, h;
      if (k < 1 && b.from) { const arc = Math.max(90, Math.abs(endY - b.from.y) * .35 + 80);
        x = b.from.x + (P.x - b.from.x) * e; y = b.from.y + (endY - b.from.y) * e + Math.sin(k * Math.PI) * arc; h = b.from.h + (P.h - b.from.h) * e; }
      else { x = P.x; y = endY; h = P.h; }
      if (k >= 1 && b.landedSpot !== b.spot) { // just arrived
        if (b.leaving || !b.spot) { b.shown = false; b.J.root.visible = false; b.leaving = false; b.from = null; continue; }
        b.landedSpot = b.spot;
        b.A.setLoop(mode === "sit" ? "sit" : "idle");
        if (mode !== "peek") { b.A.play("land", { voice: false, sound: false }); fx.burst(x, y + 4, 40, 18, 260, ["#F2EFE9", "#FF4D1A"]); blip("thud"); }
        const sp = b.spot; setTimeout(() => { if (b.spot === sp && sp.hello) b.A.play(sp.hello, { voice: false, sound: false }); }, 550);
      }
      // peekers hide behind the top edge of the form and come up further while you type
      if (mode === "peek" && k >= 1) { const goal = formState === "focus" || formState === "sent" ? .72 : .5; b.rise += (goal - b.rise) * Math.min(1, dt * 3); b.clip.constant = -P.y; }
      else b.clip.constant = 1e6;
      if (b.spot && b.spot.dance && k >= 1 && !b.A.busy() && Math.random() < dt * .25) b.A.play(Math.random() < .5 ? "dance" : "cheer", { voice: false, sound: false });
      b.x = x; b.y = y; b.h = h; any = true;
      const S2 = h / 2.05;
      if (mouse.in) b.A.lookAt(Math.atan2(mouse.x - x, 420), Math.atan2(mouse.y - (H - (y + S2 * 1.75)), 600) * .7); else b.A.lookAt(b.spot && b.spot.pitch ? -.1 : .2, b.spot && b.spot.pitch || 0);
      b.A.update(dt);
      if (k < 1) airPose(b.J, k); // tucked jump pose in the air
      b.J.root.scale.setScalar(S2); b.J.root.position.set(x, y, 0);
      const dx = b.from ? P.x - b.from.x : 0;
      const yaw = k < 1 ? (Math.abs(dx) > 30 ? Math.sign(dx) * 1.0 : .2) : mode === "peek" ? 0 : (x > innerWidth * .5 ? -.35 : .35);
      b.J.root.rotation.y += (yaw - b.J.root.rotation.y) * Math.min(1, dt * 10); b.J.root.rotation.x = mode === "sit" ? .12 : .05;
    }
    const hv = hit(); if (hv !== prevHover) { prevHover = hv; document.documentElement.classList.toggle("buddy-hover", !!hv); if (hv && !hv.A.busy() && hv.k >= 1) { hv.A.play("hop", { voice: false, sound: false }); blip("tick"); } }
    fx.step(dt);
    if (any) renderer.render(scene, cam); else renderer.clear();
  }
  requestAnimationFrame(frame);
}
