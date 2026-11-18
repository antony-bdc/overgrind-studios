/* The journey: a pinned section where scrolling flies the camera through a studded world, past one floating island
   per game. Each island carries the game's key art on a framed billboard; the overlay names the world and links to it. */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/addons/environments/RoomEnvironment.js";

const sec = document.querySelector(".journey"); if (sec) init().catch((e) => { console.warn("journey", e); sec.classList.add("jn-fallback"); });
async function init(){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = sec.querySelector(".jn-gl"), stations = [...sec.querySelectorAll(".jn-st")], N = stations.length;
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.6)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = new THREE.Scene(), SKY = new THREE.Color(0xf1ede4); sc.background = SKY.clone(); sc.fog = new THREE.Fog(SKY.clone(), 40, 210);
  { const pm = new THREE.PMREMGenerator(R); sc.environment = pm.fromScene(new RoomEnvironment(), .04).texture; sc.environmentIntensity = .55; }
  sc.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b4, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 }); sun.shadow.bias = -.0006; sc.add(sun, sun.target);
  const cam = new THREE.PerspectiveCamera(45, 1, .1, 600);
  /* studded ground far below */
  const stT = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#e3ddcf"; g.fillRect(0, 0, 128, 128);
    const gr = g.createRadialGradient(56, 56, 4, 64, 64, 34); gr.addColorStop(0, "#f2eee4"); gr.addColorStop(.75, "#e8e2d5"); gr.addColorStop(1, "#cfc7b6"); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 34, 0, 7); g.fill();
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(220, 220); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: stT, roughness: .8 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -26; ground.receiveShadow = true; sc.add(ground);
  /* stations along a winding path */
  const tl = new THREE.TextureLoader(), studG = new THREE.CylinderGeometry(.42, .42, .3, 20), hs = (n) => { const x = Math.sin(n * 77.7) * 4375.85; return x - Math.floor(x); };
  const ST = [], camPts = [], lookPts = [], GAP = 46;
  for (let i = 0; i < N; i++){
    const el = stations[i], col = new THREE.Color(el.dataset.a), side = i % 2 ? -1 : 1, z = -i * GAP, x = side * 9 + Math.sin(i * 1.3) * 4, y = Math.sin(i * .9) * 3;
    const g = new THREE.Group(); g.position.set(x, y, z); sc.add(g);
    /* island: a studded plate with a stepped rock underneath */
    const topM = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: .55 }), plate = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 14), topM); plate.castShadow = plate.receiveShadow = true; g.add(plate);
    const studs = new THREE.InstancedMesh(studG, new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: .45 }), 15 * 11); let n = 0; const m = new THREE.Matrix4();
    for (let a = 0; a < 15; a++) for (let b = 0; b < 11; b++){ m.makeTranslation(-8.4 + a * 1.2, .75, -6 + b * 1.2); studs.setMatrixAt(n++, m); } studs.receiveShadow = true; g.add(studs);
    for (let L = 0; L < 5; L++){ const w = 16 - L * 3, d = 12 - L * 2.2; const rock = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), new THREE.MeshStandardMaterial({ color: L % 2 ? 0x3a3a42 : 0x2e2e35, roughness: .8 })); rock.position.y = -1.4 - L * 1.6; g.add(rock); }
    const trim = new THREE.Mesh(new THREE.BoxGeometry(18.2, .5, .6), new THREE.MeshStandardMaterial({ color: col, roughness: .35 })); trim.position.set(0, -.4, 7.1); g.add(trim);
    /* billboard with the key art, facing the path */
    const tex = await tl.loadAsync(el.dataset.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const bb = new THREE.Group(); bb.position.set(0, 7.4, -1.5); bb.rotation.y = -side * .55; g.add(bb);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(16.6, 9.6, .6), new THREE.MeshStandardMaterial({ color: col, roughness: .3, metalness: .1 })); frame.castShadow = true; bb.add(frame);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 8.775), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); art.position.z = .31; bb.add(art);
    for (const px of [-5.5, 5.5]){ const leg = new THREE.Mesh(new THREE.BoxGeometry(.9, 4, .9), frame.material); leg.position.set(px, -5.8, 0); leg.castShadow = true; bb.add(leg); }
    /* floating bricks in the world's colour */
    const bits = []; for (let k = 0; k < 9; k++){ const s = .8 + hs(i * 9 + k) * 1.4, b = new THREE.Mesh(new THREE.BoxGeometry(s * 2, s, s), new THREE.MeshStandardMaterial({ color: k % 3 ? col : 0xf3efe6, roughness: .35 }));
      const st = new THREE.Mesh(studG, b.material); st.scale.setScalar(s * 1.1); st.position.y = s * .5 + .1; b.add(st); b.castShadow = true;
      b.userData = { p: new THREE.Vector3((hs(k + i) - .5) * 34, 4 + hs(k * 3 + i) * 14, (hs(k * 7 + i) - .5) * 26), ph: hs(k) * 6 }; g.add(b); bits.push(b); }
    const lamp = new THREE.PointLight(col, 0, 40, 1.4); lamp.position.set(0, 8, 6); g.add(lamp);
    ST.push({ g, bb, bits, lamp, col, side });
    /* camera passes in front of the billboard, a bit to the outside */
    const bw = new THREE.Vector3(); bb.getWorldPosition(bw);
    camPts.push(new THREE.Vector3(x - side * 6, y + 10, z + 34)); lookPts.push(bw.clone());
  }
  camPts.unshift(camPts[0].clone().add(new THREE.Vector3(0, 6, 30))); lookPts.unshift(lookPts[0].clone());
  camPts.push(camPts[camPts.length - 1].clone().add(new THREE.Vector3(0, 10, -30))); lookPts.push(lookPts[lookPts.length - 1].clone().add(new THREE.Vector3(0, 0, -40)));
  const curve = new THREE.CatmullRomCurve3(camPts, false, "catmullrom", .3), lookCurve = new THREE.CatmullRomCurve3(lookPts, false, "catmullrom", .3);
  /* size */
  let W = 1, H = 1; function layout(){ const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); R.setSize(W, H, false); cam.aspect = W / H; cam.fov = W < 760 ? 62 : 45; cam.updateProjectionMatrix(); }
  layout(); addEventListener("resize", layout); if (window.ResizeObserver) new ResizeObserver(layout).observe(cv);
  /* scroll */
  let target = 0, p = 0, visible = false; new IntersectionObserver((es) => es.forEach((e) => (visible = e.isIntersecting))).observe(sec);
  if (window.ScrollTrigger){
    ScrollTrigger.create({ refreshPriority: 1, trigger: sec, start: "top top", end: () => "+=" + innerHeight * (N + 1) * .9, pin: ".jn-pin", scrub: true, anticipatePin: 1, onUpdate: (s) => { target = s.progress; } });
    ScrollTrigger.sort(); ScrollTrigger.refresh();
  }
  const bar = sec.querySelector(".jn-bar i"), cnt = sec.querySelector(".jn-count b"), aim = new THREE.Vector2(), aimS = new THREE.Vector2(), tmp = new THREE.Vector3(), lk = new THREE.Vector3(), clock = new THREE.Clock();
  addEventListener("pointermove", (e) => aim.set(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5), { passive: true });
  let lastI = -1;
  function frame(){
    requestAnimationFrame(frame); const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime; if (!visible) return;
    p += (target - p) * (reduce ? 1 : Math.min(1, dt * 5)); aimS.lerp(aim, .06);
    const u = Math.min(.999, Math.max(0, p)), fi = u * (N + 1), i = Math.min(N - 1, Math.max(0, Math.round(fi - 1)));
    curve.getPointAt(u, cam.position); cam.position.x += aimS.x * 3; cam.position.y -= aimS.y * 2;
    lookCurve.getPointAt(Math.min(.999, u + .015), lk); cam.lookAt(lk);
    sun.position.copy(cam.position).add(tmp.set(30, 60, 20)); sun.target.position.copy(cam.position).add(tmp.set(0, -10, -40));
    /* station activity: the nearest one lights up in its colour, sky tints toward it */
    ST.forEach((s, k) => { const near = Math.max(0, 1 - Math.abs(fi - 1 - k) * 1.4); s.lamp.intensity = 60 * near; s.bb.rotation.y = -s.side * (.55 - .25 * near);
      s.bits.forEach((b) => { const d = b.userData; b.position.set(d.p.x, d.p.y + Math.sin(t * .9 + d.ph) * .6, d.p.z); b.rotation.set(Math.sin(t * .4 + d.ph) * .3, t * .3 + d.ph, 0); }); });
    const near = ST[i], nk = Math.max(0, 1 - Math.abs(fi - 1 - i) * 1.4);
    sc.background.copy(SKY).lerp(near.col, nk * .12); sc.fog.color.copy(sc.background);
    if (i !== lastI){ lastI = i; stations.forEach((el, k) => el.classList.toggle("on", k === i)); if (cnt) cnt.textContent = String(i + 1).padStart(2, "0"); window.ogSfx && window.ogSfx("whoosh"); }
    stations.forEach((el, k) => el.style.setProperty("--k", k === i ? nk.toFixed(3) : 0));
    if (bar) bar.style.transform = "scaleX(" + u.toFixed(4) + ")";
    R.render(sc, cam);
  }
  frame(); sec.classList.add("jn-ready");
}
