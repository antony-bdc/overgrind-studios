/* Overgrind hero: a field of glossy stud bricks that drift, tumble and get shoved by the cursor. */
import * as THREE from "./vendor/three.module.min.js";

const canvas = document.getElementById("bricks");
const hero = document.querySelector(".hero");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = matchMedia("(max-width: 860px)").matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: "high-performance" }); }
catch (e) { canvas.remove(); throw e; }
renderer.setPixelRatio(Math.min(small ? 1.5 : 2, devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0b0d, 18, 46);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0, 22);

/* lights: soft fill, warm key, ember rim that follows the cursor */
scene.add(new THREE.HemisphereLight(0xf2efe9, 0x0b0b0d, 0.55));
const key = new THREE.DirectionalLight(0xfff1e0, 2.2); key.position.set(-8, 10, 12); scene.add(key);
const rim = new THREE.PointLight(0xff4d1a, 260, 40, 1.6); rim.position.set(6, -2, 6); scene.add(rim);
const cool = new THREE.PointLight(0x5ee7ff, 60, 40, 1.8); cool.position.set(-12, 6, -4); scene.add(cool);

/* one 2x2 brick = box + 4 studs, both instanced */
const N = small ? 34 : 78;
const boxGeo = new THREE.BoxGeometry(2, 1.2, 2);
const studGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 24);
const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.32, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.25 });
const boxes = new THREE.InstancedMesh(boxGeo, mat, N);
const studs = new THREE.InstancedMesh(studGeo, mat, N * 4);
boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); studs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(boxes, studs);

const palette = ["#FF4D1A", "#FF4D1A", "#F2EFE9", "#F2EFE9", "#1A1A1F", "#1A1A1F", "#1A1A1F", "#8BE04E", "#2BD4E0", "#A47BFF", "#FFB547"];
const B = [];
const rand = (a, b) => a + Math.random() * (b - a);
for (let i = 0; i < N; i++) {
  // keep a calmer pocket in the middle where the wordmark sits
  let x, y; do { x = rand(-19, 19); y = rand(-10, 10); } while (Math.abs(y) < 2.6 && Math.abs(x) < 9 && Math.random() < 0.8);
  const z = rand(-22, 4);
  const b = {
    home: new THREE.Vector3(x, y, z), pos: new THREE.Vector3(x, y + rand(-14, -8), z), vel: new THREE.Vector3(),
    rot: new THREE.Euler(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)), spin: new THREE.Vector3(rand(-.25, .25), rand(-.35, .35), rand(-.2, .2)),
    s: rand(0.55, 1.25), phase: rand(0, 6.3)
  };
  B.push(b);
  const c = new THREE.Color(palette[i % palette.length]);
  boxes.setColorAt(i, c); for (let k = 0; k < 4; k++) studs.setColorAt(i * 4 + k, c);
}
boxes.instanceColor.needsUpdate = true; studs.instanceColor.needsUpdate = true;

const studOff = [[-.5, .73, -.5], [.5, .73, -.5], [-.5, .73, .5], [.5, .73, .5]].map(v => new THREE.Matrix4().makeTranslation(...v));
const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), tmp = new THREE.Matrix4();

/* pointer → world point on the z=0 plane */
const ndc = new THREE.Vector2(9, 9), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(999, 999, 0);
let pointerActive = false;
addEventListener("pointermove", e => {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  pointerActive = true;
}, { passive: true });

function resize() {
  const r = canvas.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
}
resize(); addEventListener("resize", resize);

let visible = true, intro = 0, last = performance.now(), t = 0;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
window.__bricksIntro = () => { intro = 1; };
setTimeout(() => { intro = 1; }, 2600); // fallback if the loader never calls

function frame(now) {
  requestAnimationFrame(frame);
  if (!visible) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  const scroll = Math.min(1, scrollY / Math.max(1, innerHeight));

  if (pointerActive) { ray.setFromCamera(ndc, camera); ray.ray.intersectPlane(plane, hit); }
  rim.position.x += ((pointerActive ? hit.x : 6) - rim.position.x) * 0.08;
  rim.position.y += ((pointerActive ? hit.y : -2) - rim.position.y) * 0.08;

  for (let i = 0; i < N; i++) {
    const b = B[i];
    // home position breathes, spreads out as you scroll away
    const hx = b.home.x * (1 + scroll * 0.6), hy = b.home.y * (1 + scroll * 0.6) + Math.sin(t * 0.6 + b.phase) * 0.45 + scroll * 6, hz = b.home.z + scroll * 10;
    const k = intro ? 2.2 : 0.4;
    b.vel.x += (hx - b.pos.x) * k * dt; b.vel.y += (hy - b.pos.y) * k * dt; b.vel.z += (hz - b.pos.z) * k * dt;
    if (pointerActive && !reduce) {
      const dx = b.pos.x - hit.x, dy = b.pos.y - hit.y, d2 = dx * dx + dy * dy + 0.5;
      if (d2 < 22 && b.pos.z > -10) { const f = 26 / d2; b.vel.x += dx * f * dt; b.vel.y += dy * f * dt; b.spin.x += dy * 0.02; b.spin.y += dx * 0.02; }
    }
    b.vel.multiplyScalar(1 - 2.6 * dt);
    b.pos.addScaledVector(b.vel, dt * 3.2);
    b.spin.multiplyScalar(0.995).clampScalar(-2.4, 2.4);
    if (!reduce) { b.rot.x += b.spin.x * dt; b.rot.y += b.spin.y * dt; b.rot.z += b.spin.z * dt; }
    q.setFromEuler(b.rot); sc.setScalar(b.s);
    m.compose(b.pos, q, sc); boxes.setMatrixAt(i, m);
    for (let s = 0; s < 4; s++) { tmp.multiplyMatrices(m, studOff[s]); studs.setMatrixAt(i * 4 + s, tmp); }
  }
  boxes.instanceMatrix.needsUpdate = true; studs.instanceMatrix.needsUpdate = true;
  camera.position.x += ((pointerActive ? ndc.x * 1.2 : 0) - camera.position.x) * 0.04;
  camera.position.y += ((pointerActive ? ndc.y * 0.8 : 0) - camera.position.y) * 0.04;
  camera.lookAt(0, 0, -6);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
canvas.classList.add("on");
