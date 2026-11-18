/* the Overgrind gear logo as a real 3D model: four studded segments in the crew colours around a dark hub */
import * as THREE from "./vendor/three.module.min.js";
export const PAL = [0xE2202E, 0xE8A400, 0x2450FF, 0x7B45F5];
export function makeGear(){
const OUT = 1, ROOT = .78, HOLE = .34, TEETH = 12, DEPTH = .3, GAP = .035;
const tooth = (a) => { const p = (((a * TEETH) / (Math.PI * 2)) % 1 + 1) % 1; const s = (x, e0, e1) => Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  const k = s(p, .02, .1) * (1 - s(p, .5, .58)); const kk = k * k * (3 - 2 * k); return ROOT + (OUT - ROOT) * kk; };
const OFF = .79 * Math.PI * 2 / TEETH; const gear = new THREE.Group(), body = new THREE.Group(); gear.add(body);
const segs = [], studs = [];
const studGeo = new THREE.CylinderGeometry(.075, .075, .07, 28); studGeo.rotateX(Math.PI / 2);
const studTop = new THREE.CylinderGeometry(.06, .075, .012, 28); studTop.rotateX(Math.PI / 2);
for (let q = 0; q < 4; q++) {
  const a0 = q * Math.PI / 2 + GAP + OFF, a1 = (q + 1) * Math.PI / 2 - GAP + OFF, sh = new THREE.Shape(), N = 140;
  for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N, r = tooth(a); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  for (let i = 0; i <= 40; i++) { const a = a1 - (a1 - a0) * i / 40; sh.lineTo(Math.cos(a) * HOLE, Math.sin(a) * HOLE); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: true, bevelThickness: .045, bevelSize: .03, bevelSegments: 5, curveSegments: 8 }); geo.translate(0, 0, -DEPTH / 2);
  const mat = new THREE.MeshPhysicalMaterial({ color: PAL[q], roughness: .3, metalness: 0, clearcoat: 1, clearcoatRoughness: .12 });
  const seg = new THREE.Group(), mesh = new THREE.Mesh(geo, mat); seg.add(mesh);
  const mid = (a0 + a1) / 2; seg.userData = { mid, dir: new THREE.Vector3(Math.cos(mid), Math.sin(mid), 0) };
  for (const [ra, rr] of [[-.26, .6], [0, .6], [.26, .6], [-.13, .9], [.13, .9]]) {
    const a = mid + ra * (rr > .8 ? .8 : 1), r = rr > .8 ? tooth(a) * .88 : rr; if (rr > .8 && tooth(a) < .95) continue;
    const st = new THREE.Group(); st.position.set(Math.cos(a) * r, Math.sin(a) * r, DEPTH / 2 + .045 + .035);
    const m1 = new THREE.Mesh(studGeo, mat), m2 = new THREE.Mesh(studTop, mat); m2.position.z = .04; st.add(m1, m2); seg.add(st); studs.push(st);
  }
  body.add(seg); segs.push(seg);
}
/* dark hub with four little studs, like the logo */
{ const hs = new THREE.Shape(); hs.absarc(0, 0, HOLE - .03, 0, Math.PI * 2, false); const hh = new THREE.Path(); hh.absarc(0, 0, .13, 0, Math.PI * 2, true); hs.holes.push(hh);
  const g = new THREE.ExtrudeGeometry(hs, { depth: DEPTH * .8, bevelEnabled: true, bevelThickness: .03, bevelSize: .02, bevelSegments: 4, curveSegments: 48 }); g.translate(0, 0, -DEPTH * .4);
  const m = new THREE.MeshPhysicalMaterial({ color: 0x2b2b31, roughness: .35, clearcoat: .8, clearcoatRoughness: .2 }); const hub = new THREE.Mesh(g, m); body.add(hub);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, st = new THREE.Mesh(studGeo, m); st.scale.setScalar(.6); st.position.set(Math.cos(a) * .22, Math.sin(a) * .22, DEPTH * .4 + .05); hub.add(st); } }

  return { gear, body, segs, studs };
}
