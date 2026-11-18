/* OVERGRIND built from real 3D studded bricks in the footer: they fly in from all over and snap into the wordmark
   as the footer scrolls in. The bricks under your cursor lift up. */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/addons/environments/RoomEnvironment.js";

const host = document.querySelector(".ft-mark"); if (host) init().catch((e) => console.warn("brickword", e));
async function init(){
  await document.fonts.load("900 120px Unbounded");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* sample the word into a grid */
  const FS = 120, word = "OVERGRIND", c2 = document.createElement("canvas"), g = c2.getContext("2d");
  g.font = `900 ${FS}px Unbounded`; const tw = Math.ceil(g.measureText(word).width * .95) + 20; c2.width = tw; c2.height = FS + 20;
  g.font = `900 ${FS}px Unbounded`; g.letterSpacing = "-6px"; g.textBaseline = "top"; g.fillText(word, 10, 10);
  const data = g.getImageData(0, 0, c2.width, c2.height).data, CELL = 7, cols = Math.floor(c2.width / CELL), rows = Math.floor(c2.height / CELL), cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const a = data[((y * CELL + CELL / 2 | 0) * c2.width + (x * CELL + CELL / 2 | 0)) * 4 + 3]; if (a > 140) cells.push([x, y]); }
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; cells.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  const W0 = maxX - minX + 1, H0 = maxY - minY + 1;
  /* scene */
  const cv = document.createElement("canvas"); cv.className = "bw-canvas"; host.appendChild(cv); host.classList.add("bw");
  const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NeutralToneMapping;
  const sc = new THREE.Scene(); { const pm = new THREE.PMREMGenerator(R); sc.environment = pm.fromScene(new RoomEnvironment(), .04).texture; sc.environmentIntensity = .7; }
  const kl = new THREE.DirectionalLight(0xffffff, 2.2); kl.position.set(-3, 6, 8); sc.add(kl);
  const cam = new THREE.PerspectiveCamera(22, 1, .1, 500);
  const N = cells.length, box = new THREE.BoxGeometry(.96, .96, .7), stud = new THREE.CylinderGeometry(.3, .3, .22, 16); stud.rotateX(Math.PI / 2); stud.translate(0, 0, .45);
  const mat = new THREE.MeshPhysicalMaterial({ roughness: .3, clearcoat: 1, clearcoatRoughness: .15 });
  const IB = new THREE.InstancedMesh(box, mat, N), IS = new THREE.InstancedMesh(stud, mat, N); sc.add(IB, IS);
  const PAL = [new THREE.Color(0xE2202E), new THREE.Color(0xE8A400), new THREE.Color(0x2450FF), new THREE.Color(0x7B45F5)];
  const T = [], S = [], RO = [], D = [], col = new THREE.Color();
  const hs = (n) => { const x = Math.sin(n * 91.7) * 47453.53; return x - Math.floor(x); };
  cells.forEach(([x, y], i) => {
    const tx = x - minX - W0 / 2 + .5, ty = -(y - minY - H0 / 2 + .5); T.push(new THREE.Vector3(tx, ty, 0));
    S.push(new THREE.Vector3(tx * 1.6 + (hs(i) - .5) * 70, ty + (hs(i + 3) - .5) * 60 + 30, 40 + hs(i + 7) * 90));
    RO.push(new THREE.Euler(hs(i + 1) * 9, hs(i + 2) * 9, hs(i + 5) * 9)); D.push((tx / W0 + .5) * .45 + hs(i + 9) * .15);
    const u = (tx / W0 + .5) * 3, k = Math.floor(u), f = u - k; col.copy(PAL[Math.min(3, k)]).lerp(PAL[Math.min(3, k + 1)], f * f * (3 - 2 * f)); IB.setColorAt(i, col); IS.setColorAt(i, col);
  });
  IB.instanceColor.needsUpdate = IS.instanceColor.needsUpdate = true;
  let W = 1, H = 1; function layout(){ const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); R.setSize(W, H, false); cam.aspect = W / H;
    const dist = (W0 / 2 * 1.04) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / cam.aspect; cam.position.set(0, -2, Math.max(dist, (H0 / 2 + 2) / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)))); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); }
  layout(); addEventListener("resize", layout);
  let p = reduce ? 1 : 0, vis = false; new IntersectionObserver((es) => es.forEach((e) => (vis = e.isIntersecting))).observe(host);
  const mouse = new THREE.Vector2(9e3, 9e3), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), mp = new THREE.Vector3(9e3, 9e3, 0);
  host.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); });
  host.addEventListener("pointerleave", () => mouse.set(9e3, 9e3));
  const lift = new Float32Array(N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), e0 = new THREE.Euler(), clock = new THREE.Clock();
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  function frame(){
    requestAnimationFrame(frame); const dt = Math.min(.05, clock.getDelta()); if (!vis) return;
    const r = host.getBoundingClientRect(), target = reduce ? 1 : Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .75 + r.height * .3)));
    p += (target - p) * Math.min(1, dt * 4);
    if (mouse.x < 10){ ray.setFromCamera(mouse, cam); ray.ray.intersectPlane(plane, hit) ? mp.copy(hit) : mp.set(9e3, 9e3, 0); } else mp.set(9e3, 9e3, 0);
    for (let i = 0; i < N; i++){
      const k = ease((p - D[i]) / .4), d = Math.hypot(T[i].x - mp.x, T[i].y - mp.y); lift[i] += ((d < 6 ? (1 - d / 6) * 2.2 : 0) - lift[i]) * Math.min(1, dt * 8);
      pos.copy(S[i]).lerp(T[i], k); pos.z += lift[i];
      e0.set(RO[i].x * (1 - k), RO[i].y * (1 - k), RO[i].z * (1 - k) + lift[i] * .15); q.setFromEuler(e0); m4.compose(pos, q, one);
      IB.setMatrixAt(i, m4); IS.setMatrixAt(i, m4);
    }
    IB.instanceMatrix.needsUpdate = IS.instanceMatrix.needsUpdate = true; R.render(sc, cam);
  }
  frame();
}
