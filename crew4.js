/* Overgrind crew, 4 real Roblox skins as skinned R15 meshes (shoulders, elbows, wrists, hips, knees, ankles)
   plus the procedural move set used in our videos. Compact web format: pos f32, normal i8, uv u16, bone u8, weight u8, index u32. */
import * as THREE from "./vendor/three.module.min.js";
const ORDER = ["LowerTorso", "UpperTorso", "Head", "RUpperArm", "RLowerArm", "RHand", "LUpperArm", "LLowerArm", "LHand", "RUpperLeg", "RLowerLeg", "RFoot", "LUpperLeg", "LLowerLeg", "LFoot"];
const al = (x) => (x + 3) & ~3;
export async function loadCrew4(base) {
  const [meta, bin] = await Promise.all([fetch(base + ".json").then((r) => r.json()), fetch(base + ".bin").then((r) => r.arrayBuffer())]);
  const n = meta.n; let o = 0; const take = (T, c, b) => { const a = new T(bin, o, n * c); o += al(n * c * b); return a; };
  const pos = take(Float32Array, 3, 4), nor = take(Int8Array, 4, 1), uv = take(Uint16Array, 2, 2), si = take(Uint8Array, 4, 1), sw = take(Uint8Array, 4, 1);
  const idx = new Uint32Array(bin, o, meta.ni);
  const tex = await new THREE.TextureLoader().loadAsync(base + ".jpg"); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = true; tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .6, metalness: 0 });
  const root = new THREE.Group(), flip = new THREE.Group(); flip.rotation.y = Math.PI; root.add(flip);
  const B = {}, bones = [], abs = {}; let pet = null; const meshes = [];
  for (const b of meta.bones) { const bone = new THREE.Bone(); bone.name = b.name; B[b.name] = bone; abs[b.name] = b.pos; bones.push(bone);
    if (b.parent) { const pp = abs[b.parent]; bone.position.set(b.pos[0] - pp[0], b.pos[1] - pp[1], b.pos[2] - pp[2]); B[b.parent].add(bone); } else { bone.position.set(...b.pos); flip.add(bone); }
    bone.userData.rest = bone.position.clone(); }
  const skel = new THREE.Skeleton(bones); root.updateMatrixWorld(true);
  const P = new THREE.BufferAttribute(pos, 3), N = new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(nor, 4), 3, 0, true), U = new THREE.BufferAttribute(uv, 2, true);
  for (const p of meta.parts) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", P); g.setAttribute("normal", N); g.setAttribute("uv", U);
    g.setIndex(new THREE.BufferAttribute(idx.slice(p.start, p.start + p.count), 1));
    if (p.pet) { // flying companion: rigid, follows the upper torso and bobs on its own
      const ut = abs.UpperTorso, g2 = g.clone(), a = g2.attributes.position = new THREE.BufferAttribute(pos.slice(), 3);
      for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) - ut[0], a.getY(i) - ut[1], a.getZ(i) - ut[2]);
      const m = new THREE.Mesh(g2, mat), pg = new THREE.Group(); pg.add(m); B.UpperTorso.add(pg); pet = pg; m.castShadow = true; meshes.push(m); continue; }
    g.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4, true));
    const m = new THREE.SkinnedMesh(g, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; flip.add(m); m.bind(skel); meshes.push(m);
  }
  return { root, B, meshes, pet, mat, armRest: meta.armRest || 0, height: meta.height, hipY: meta.hipY };
}

/* ---------- pose model ---------- */
const J0 = () => ({ x: 0, y: 0, z: 0 });
export function emptyPose() { const p = { root: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 } }; for (const n of ORDER) p[n] = J0(); return p; }
export function addPose(a, b, w = 1) { // a += b * w
  for (const k in b) { if (k === "root") { for (const c in b.root) a.root[c] += b.root[c] * w; } else if (a[k]) { a[k].x += b[k].x * w; a[k].y += b[k].y * w; a[k].z += b[k].z * w; } }
  return a;
}
export function applyPose(J, P) {
  for (const n of ORDER) { const b = J.B[n], q = P[n]; let z = q.z;
    if (J.armRest && n[1] === "U" && n.endsWith("UpperArm")) z -= (n[0] === "R" ? 1 : -1) * J.armRest; // A/T-pose meshes: pose 0 = arms hanging
    b.rotation.set(q.x, q.y, z, "YXZ"); }
  const r = P.root, lt = J.B.LowerTorso; lt.position.copy(lt.userData.rest).add(new THREE.Vector3(-r.x, r.y, -r.z)); // flip: model is turned by PI
  lt.rotation.x += r.rx; lt.rotation.y += r.ry; lt.rotation.z += r.rz;
}
const S = (x) => Math.sin(x), C = (x) => Math.cos(x), cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const bump = (x) => Math.sin(cl(x) * Math.PI);
/* each action returns a pose delta; side helpers keep left/right symmetric */
function arm(P, s, sw, out, elbow, twist = 0, wrist = 0) { const p = s === "R" ? 1 : -1; P[s + "UpperArm"].x += sw; P[s + "UpperArm"].z += p * out; P[s + "UpperArm"].y += twist * p; P[s + "LowerArm"].x += elbow; P[s + "Hand"].x += wrist; }
function leg(P, s, sw, knee, ankle, out = 0) { const p = s === "R" ? 1 : -1; P[s + "UpperLeg"].x += sw; P[s + "UpperLeg"].z += p * out; P[s + "LowerLeg"].x += -knee; P[s + "Foot"].x += ankle; }
export const ACT = {
  idle(t) { const P = emptyPose(), b = S(t * 1.9); P.UpperTorso.x = b * .025; P.Head.x = -b * .02 + S(t * .7) * .03; P.Head.y = S(t * .45) * .12;
    P.root.x = S(t * .8) * .03; P.root.rz = S(t * .8) * .02; P.root.y = -.01 + b * .008;
    arm(P, "R", S(t * 1.9 + .5) * .04, .07, .14); arm(P, "L", S(t * 1.9) * .04, .07, .14); leg(P, "R", 0, .03, .02); leg(P, "L", 0, .03, .02); return P; },
  run(t, speed = 1) { const P = emptyPose(), w = t * 10.2 * speed, s = S(w), c = C(w);
    leg(P, "R", s * .95, cl(.35 - c * 1.15, 0, 1.6), -s * .35 + .1); leg(P, "L", -s * .95, cl(.35 + c * 1.15, 0, 1.6), s * .35 + .1);
    arm(P, "R", -s * .85, .1, 1.25 + s * .25); arm(P, "L", s * .85, .1, 1.25 - s * .25);
    P.LowerTorso.y = s * .1; P.UpperTorso.y = -s * .22; P.UpperTorso.x = -.18; P.Head.x = .12; P.Head.y = s * .06;
    P.root.y = Math.abs(C(w)) * .16 - .04; P.root.rz = s * .03; return P; },
  walk(t) { const P = emptyPose(), w = t * 6, s = S(w), c = C(w);
    leg(P, "R", s * .5, cl(.1 - c * .5, 0, .8), -s * .15); leg(P, "L", -s * .5, cl(.1 + c * .5, 0, .8), s * .15);
    arm(P, "R", -s * .45, .07, .3); arm(P, "L", s * .45, .07, .3); P.UpperTorso.y = -s * .08; P.root.y = Math.abs(C(w)) * .05; return P; },
  skydive(t) { const P = emptyPose(), f = S(t * 7) * .06; P.root.rx = -1.35; arm(P, "R", .3, 1.25 + f, .5); arm(P, "L", .3, 1.25 - f, .5); P.Head.x = .7;
    leg(P, "R", -.25, .7, .3, .25); leg(P, "L", -.25, .7, .3, .25); return P; },
  flail(t) { const P = emptyPose(), a = t * 14; arm(P, "R", S(a) * 1.4 + 1.2, .6 + C(a) * .5, .6); arm(P, "L", -S(a) * 1.4 + 1.2, .6 - C(a) * .5, .6); leg(P, "R", S(a * .8) * .6, .5, 0); leg(P, "L", -S(a * .8) * .6, .5, 0); P.Head.x = S(a) * .15; return P; },
  jump(t) { const P = emptyPose(), k = cl(t / .5); const crouch = bump(k * 1.6) * (k < .3 ? 1 : 0), air = sm((k - .25) / .3);
    leg(P, "R", .9 * crouch + .4 * air, 1.2 * crouch + .6 * air, .2); leg(P, "L", .9 * crouch - .1 * air, 1.2 * crouch + .2 * air, .2);
    arm(P, "R", -.6 * crouch + 2.6 * air, .2, .3); arm(P, "L", -.6 * crouch + 2.6 * air, .2, .3); P.root.y = -.5 * crouch; P.UpperTorso.x = -.3 * crouch; return P; },
  land(t) { const P = emptyPose(), k = cl(t / .7), d = bump(k) * (1 - k * .3); // superhero landing: one knee, fist down
    leg(P, "R", 1.3 * d, 1.9 * d, -.3 * d); leg(P, "L", -.3 * d, 1.5 * d, .4 * d); arm(P, "R", -.2 * d, .3 * d, .2); arm(P, "L", .9 * d, .2 * d, .5 * d);
    P.root.y = -.95 * d; P.UpperTorso.x = -.5 * d; P.Head.x = .35 * d; return P; },
  uppercut(t) { const P = emptyPose(), wind = sm(t / .25) * (1 - sm((t - .25) / .12)), hit = sm((t - .25) / .15), hold = 1 - sm((t - 1.0) / .4);
    arm(P, "R", -.6 * wind + 3.0 * hit * hold, .25, 1.6 * wind + .3 * hit, 0, 0); arm(P, "L", .5 * hit * hold, .2, 1.4);
    leg(P, "R", .5 * wind - .2 * hit, .9 * wind, 0); leg(P, "L", -.3 * wind + .3 * hit, .5 * wind, .3 * hit);
    P.UpperTorso.y = .5 * wind - .5 * hit * hold; P.UpperTorso.x = -.35 * wind + .25 * hit * hold; P.root.y = -.35 * wind + .45 * hit * hold; P.Head.x = .3 * hit * hold; return P; },
  punch(t) { const P = emptyPose(), k = sm(t / .12) * (1 - sm((t - .35) / .25)); arm(P, "R", 1.55 * k, .1, .2 * (1 - k)); arm(P, "L", .4, .1, 1.6); P.UpperTorso.y = -.5 * k; leg(P, "L", .3 * k, .2, 0); return P; },
  scared(t) { const P = emptyPose(), u = sm(t / .12), sh = S(t * 60) * .03 * u; arm(P, "R", 1.6 * u, .35 * u, 1.9 * u); arm(P, "L", 1.6 * u, .35 * u, 1.9 * u);
    leg(P, "R", .3 * u, .7 * u, 0); leg(P, "L", .3 * u, .7 * u, 0); P.root.y = -.25 * u + sh; P.root.x = sh; P.Head.x = .25 * u; P.UpperTorso.x = -.15 * u; return P; },
  sit(t) { const P = emptyPose(); leg(P, "R", 1.55, 1.55, .1, .1); leg(P, "L", 1.55, 1.55, .1, .1); arm(P, "R", .7, .1, .7); arm(P, "L", .7, .1, .7);
    P.root.y = -1.1; P.UpperTorso.x = -.15 + S(t * 1.6) * .02; P.Head.x = .1; return P; },
  wave(t) { const P = emptyPose(); arm(P, "R", .3, 2.5, 1.2 + S(t * 9) * .45); arm(P, "L", .05, .07, .15); P.Head.z = .08; return P; },
  cheer(t) { const P = emptyPose(), b = Math.abs(S(t * 7)); arm(P, "R", .2, 2.7 - b * .25, .4 + b * .3); arm(P, "L", .2, 2.7 - b * .25, .4 + b * .3); P.root.y = b * .25; leg(P, "R", .15 * b, .3 * b, 0); leg(P, "L", .15 * b, .3 * b, 0); P.Head.x = -.2; return P; },
  point(t) { const P = emptyPose(); arm(P, "R", 1.5, .15, 0, 0, 0); arm(P, "L", .05, .07, .2); P.UpperTorso.y = -.2; P.Head.y = -.1; return P; },
  dance(t) { const P = emptyPose(), b = t * 8.4, s = S(b); P.root.y = Math.abs(s) * .12 - .06; P.root.x = s * .1; P.UpperTorso.z = s * .12; P.Head.z = -s * .1;
    arm(P, "R", .5 + S(b * .5) * .6, .5 + s * .3, 1.3); arm(P, "L", .5 - S(b * .5) * .6, .5 - s * .3, 1.3); leg(P, "R", .1 * s, .25 + .2 * s, 0); leg(P, "L", -.1 * s, .25 - .2 * s, 0); return P; },
  lookBack(t) { const P = emptyPose(), k = sm(t / .3); P.Head.y = 1.1 * k; P.UpperTorso.y = .35 * k; return P; },
  flex(t) { const P = emptyPose(); arm(P, "R", .1, 1.5, 2.2 + S(t * 5) * .1); arm(P, "L", .1, 1.5, 2.2 - S(t * 5) * .1); P.UpperTorso.x = .08; P.Head.x = -.1; return P; },
  hang(t) { const P = emptyPose(); arm(P, "R", 3.0, .2, .2); arm(P, "L", 3.0, .2, .2); leg(P, "R", .2 + S(t * 3) * .2, .3, .2); leg(P, "L", .2 - S(t * 3) * .2, .3, .2); return P; },
};
/* blend actions: list of [name, t, weight, extra] */
export function pose(J, list, tweak) {
  const P = emptyPose(); let tw = 0;
  for (const [name, t, w, a] of list) { if (!w) continue; addPose(P, ACT[name](t, a), w); tw += w; }
  if (tw > 1) for (const k in P) { const q = P[k]; for (const c in q) q[c] /= tw; }
  if (tweak) tweak(P);
  applyPose(J, P);
}
export const AV_ORDER = ORDER;
