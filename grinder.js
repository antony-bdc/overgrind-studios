/* The Overgrind "grinder": a classic R6 avatar with your colours, face and the OG shirt.
   Used by the avatar builder and, once you've built one, in the hero next to the crew. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/addons/geometries/RoundedBoxGeometry.js";

export const GRINDER_DEFAULT = { skin: "#F5CDA7", shirt: "#FF4D1A", pants: "#1A1A1F", face: "smile", fit: "", name: "Grinder", role: "Builder" };
export function loadGrinder() { try { return { ...GRINDER_DEFAULT, ...JSON.parse(localStorage.getItem("og-avatar") || "{}") }; } catch (e) { return { ...GRINDER_DEFAULT }; } }
export function hasBuilt() { try { return localStorage.getItem("og-built") === "1"; } catch (e) { return false; } }

export function drawFace(g, cx, cy, s, face) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = g.strokeStyle = "#111"; g.lineCap = "round"; g.lineJoin = "round";
  const eye = (x, y, w = 9, h = 15) => { g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); };
  const mouth = (w, d, lw = 7) => { g.lineWidth = lw; g.beginPath(); g.moveTo(-w, 16); g.quadraticCurveTo(0, 16 + d, w, 16); g.stroke(); };
  if (face === "smile") { eye(-22, -12); eye(22, -12); mouth(30, 26); }
  if (face === "grin") { eye(-22, -14); eye(22, -14); g.beginPath(); g.moveTo(-34, 10); g.quadraticCurveTo(0, 56, 34, 10); g.closePath(); g.fill(); g.fillStyle = "#fff"; g.fillRect(-26, 12, 52, 9); }
  if (face === "cool") { g.beginPath(); g.roundRect(-46, -26, 40, 26, 8); g.roundRect(6, -26, 40, 26, 8); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(-8, -18); g.lineTo(8, -18); g.stroke(); g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(-40, -22, 10, 5); g.fillRect(12, -22, 10, 5); g.fillStyle = "#111"; mouth(20, 12); }
  if (face === "wink") { eye(22, -12); g.lineWidth = 7; g.beginPath(); g.moveTo(-32, -10); g.quadraticCurveTo(-22, -20, -12, -10); g.stroke(); mouth(28, 22); }
  if (face === "angry") { eye(-22, -8, 9, 12); eye(22, -8, 9, 12); g.lineWidth = 7; g.beginPath(); g.moveTo(-36, -30); g.lineTo(-10, -20); g.moveTo(36, -30); g.lineTo(10, -20); g.stroke(); g.beginPath(); g.moveTo(-22, 26); g.quadraticCurveTo(0, 12, 22, 26); g.stroke(); }
  if (face === "chill") { g.lineWidth = 7; g.beginPath(); g.moveTo(-32, -10); g.quadraticCurveTo(-22, -2, -12, -10); g.moveTo(12, -10); g.quadraticCurveTo(22, -2, 32, -10); g.stroke(); mouth(18, 14); }
  if (face === "shock") { eye(-22, -14, 10, 17); eye(22, -14, 10, 17); g.beginPath(); g.ellipse(0, 24, 11, 14, 0, 0, 7); g.fill(); }
  g.restore();
}


export function makeGrinder(scene, init = GRINDER_DEFAULT) {
  let S = { ...init };
  const phys = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .42, clearcoat: .45, clearcoatRoughness: .35 });
  const M = { skin: phys("#F5CDA7"), shirt: phys("#FF4D1A"), pants: phys("#1A1A1F"), shoe: phys("#121214") };
  const fc = document.createElement("canvas"); fc.width = 1024; fc.height = 256; const fg = fc.getContext("2d"); const faceTex = new THREE.CanvasTexture(fc); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: .42, clearcoat: .45, clearcoatRoughness: .35 });
  const tc = document.createElement("canvas"); tc.width = tc.height = 256; const tg = tc.getContext("2d"); const torsoTex = new THREE.CanvasTexture(tc); torsoTex.colorSpace = THREE.SRGBColorSpace;
  const torsoFront = new THREE.MeshPhysicalMaterial({ map: torsoTex, roughness: .42, clearcoat: .45, clearcoatRoughness: .35 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); if (scene) scene.add(root);
  const J = { key: "box", root, body, meshes: [], mat: M.skin };
  const grp = (nm, piv) => { const g = new THREE.Group(); g.position.set(...piv); body.add(g); J[nm] = g; return g; };
  const mesh = (g, geo, mat, off) => { const m = new THREE.Mesh(geo, mat); m.position.set(...off); g.add(m); J.meshes.push(m); return m; };
  const RB = (w, h, d, r = .045) => new RoundedBoxGeometry(w, h, d, 3, r);
  mesh(grp("torso", [0, 0, 0]), RB(.78, .78, .4), [M.shirt, M.shirt, M.shirt, M.shirt, torsoFront, M.shirt], [0, 1.16, 0]);
  const headG = new THREE.CylinderGeometry(.245, .245, .42, 40, 1, false, -Math.PI, Math.PI * 2);
  mesh(grp("head", [0, 1.55, 0]), headG, [faceMat, M.skin, M.skin], [0, .21, 0]);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.11, .12, .06, 20), M.skin); neck.position.set(0, 1.57, 0); body.add(neck);
  for (const [nm, x] of [["armL", .58], ["armR", -.58]]) { const g = grp(nm, [x, 1.41, 0]); mesh(g, RB(.36, .5, .38), M.shirt, [0, -.13, 0]); mesh(g, RB(.34, .27, .36), M.skin, [0, -.5, 0]); }
  for (const [nm, x] of [["legL", .195], ["legR", -.195]]) { const g = grp(nm, [x, .78, 0]); mesh(g, RB(.38, .66, .39), M.pants, [0, -.33, 0]); mesh(g, RB(.4, .14, .43, .04), M.shoe, [0, -.71, .015]); }
  root.position.y = .0;
  function paintFace() { fg.fillStyle = S.skin; fg.fillRect(0, 0, 1024, 256); fg.save(); fg.translate(512, 120); fg.scale(1.1, 1); drawFace(fg, 0, 0, 2.05, S.face); fg.restore(); faceTex.needsUpdate = true; }
  function paintTorso() {
    tg.fillStyle = S.shirt; tg.fillRect(0, 0, 256, 256);
    const dark = new THREE.Color(S.shirt).getHSL({}).l > .6; // logo colour that reads on the shirt
    tg.save(); tg.translate(128, 120); tg.fillStyle = dark ? "#0b0b0d" : "#F2EFE9"; tg.beginPath(); tg.roundRect(-44, -44, 88, 88, 18); tg.fill();
    tg.fillStyle = dark ? "#F2EFE9" : "#0b0b0d"; tg.font = "900 40px Unbounded, system-ui"; tg.textAlign = "center"; tg.textBaseline = "middle"; tg.fillText("OG", 0, 3);
    tg.fillStyle = "#FF4D1A"; tg.rotate(-.24); tg.fillRect(-60, 8, 120, 7); tg.restore(); torsoTex.needsUpdate = true;
  }
  function set(next) { S = { ...S, ...next }; M.skin.color.set(S.skin); M.shirt.color.set(S.shirt); M.pants.color.set(S.pants); paintFace(); paintTorso(); }
  set({});
  return { J, M, set, get state() { return S; } };
}
