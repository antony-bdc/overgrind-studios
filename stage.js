/* Shared pixel-space 3D stage: orthographic camera in CSS pixels so 3D lines up with the DOM. */
import * as THREE from "./vendor/three.module.min.js";
import { LITE, setArm } from "./crew3d.js";

export function pxStage(canvas) {
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
export function studBrick(nx, nz, unit, color, hgt = .6) {
  const g = new THREE.Group(), mat = new THREE.MeshPhysicalMaterial({ color, roughness: .32, clearcoat: .7, clearcoatRoughness: .3 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(nx * unit, hgt * unit, nz * unit), mat); b.position.y = -hgt * unit / 2; g.add(b);
  const sg = new THREE.CylinderGeometry(unit * .3, unit * .3, unit * .2, 20), st = new THREE.InstancedMesh(sg, mat, nx * nz), m = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { m.makeTranslation((i - (nx - 1) / 2) * unit, unit * .1, (j - (nz - 1) / 2) * unit); st.setMatrixAt(k++, m); }
  g.add(st); g.userData.mat = mat; return g;
}

/* shared avatar posing */
export function runPose(J, ph, amt) {
  const s = Math.sin(ph);
  J.legL.rotation.x = s * .75 * amt; J.legR.rotation.x = -s * .75 * amt;
  setArm(J.armR, (s * 50) * amt + 4, 5, -1); setArm(J.armL, (-s * 50) * amt + 4, 5, 1);
  J.body.position.y = Math.abs(Math.cos(ph)) * .07 * amt; J.body.rotation.x = .1 * amt;
}
export function airPose(J, u) { // u: 0 take-off → 1 landing
  J.legL.rotation.x = -.7; J.legR.rotation.x = .35; setArm(J.armR, 150 - 40 * u, 20, -1); setArm(J.armL, 150 - 40 * u, 20, 1);
  J.body.position.y = 0; J.body.rotation.x = -.05 + .2 * u;
}

/* little additive spark bursts in px space */
export function sparks(scene, n = 160) {
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

