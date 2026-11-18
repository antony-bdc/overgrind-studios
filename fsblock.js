/* FreshStatue as a clean R15 block statue: the sculpted marble head stays from the scan, every body part is a real
   rounded block (like Roblox R15 parts), polished Carrara marble with fine veins and thin gold kintsugi seams,
   black glossy shirt panel, gloves and shoes. No torn triangles, no gaps, sharp at 4K. */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/addons/geometries/RoundedBoxGeometry.js";

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function marbleCanvas(size, seed, gold = true) {
  const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d"), r = rng(seed);
  // warm white base with soft cloudy variation
  g.fillStyle = "#f3f1ec"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) { const x = r() * size, y = r() * size, rad = (0.04 + r() * 0.18) * size; const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const v = 228 + (r() * 22) | 0; gr.addColorStop(0, `rgba(${v},${v - 2},${v - 6},.10)`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // veins: wandering polylines, a few strong, many hair-thin
  const vein = (w, a, col) => { g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); let x = r() * size, y = r() * size, ang = r() * Math.PI * 2; g.moveTo(x, y);
    const n = 40 + r() * 90; for (let k = 0; k < n; k++) { ang += (r() - .5) * .7; const st = size * (0.006 + r() * 0.012); x += Math.cos(ang) * st; y += Math.sin(ang) * st; g.lineTo(x, y);
      if (r() < .04) { g.stroke(); g.lineWidth = Math.max(.6, g.lineWidth * (.6 + r() * .6)); g.beginPath(); g.moveTo(x, y); } } g.stroke(); g.globalAlpha = 1; };
  g.filter = "blur(3px)"; for (let i = 0; i < 10; i++) vein(size * .005 * (1 + r() * 2), .22, "#a4a4ad"); g.filter = "blur(.8px)"; for (let i = 0; i < 14; i++) vein(size * .0025 * (1 + r()), .55, "#7e7f89");
  g.filter = "none"; for (let i = 0; i < 80; i++) vein(size * .0011 * (1 + r()), .5, "#868791");
  g.filter = "none"; for (let i = 0; i < 40; i++) vein(size * .0007, .35, "#6f707a");
  if (gold) { for (let i = 0; i < 3; i++) { g.shadowColor = "rgba(255,190,60,.6)"; g.shadowBlur = size * .004; vein(size * .0022, .95, "#d8a53a"); } g.shadowBlur = 0; }
  return c;
}
function tex(canvas, rep = 1) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t; }

export function fsBlockify(J, seed = 7) {
  // 1) keep only the sculpted head of the scan (rigid mesh: every triangle belongs to one bone)
  const headIdx = Object.keys(J.B).indexOf("Head");
  for (const m of J.meshes) {
    if (!m.isSkinnedMesh) continue; const g = m.geometry, si = g.attributes.skinIndex, ix = g.index.array, keep = [];
    const ORDER = ["LowerTorso", "UpperTorso", "Head"]; const hb = 2; // bone index 2 = Head in the export order
    for (let i = 0; i < ix.length; i += 3) { if (si.getX(ix[i]) === hb && si.getX(ix[i + 1]) === hb && si.getX(ix[i + 2]) === hb) keep.push(ix[i], ix[i + 1], ix[i + 2]); }
    g.setIndex(keep);
  }
  // 2) materials
  const M = marbleCanvas(2048, seed), M2 = marbleCanvas(2048, seed + 11);
  const marble = new THREE.MeshPhysicalMaterial({ map: tex(M), color: 0xcfccc6, roughness: .2, metalness: 0, clearcoat: .8, clearcoatRoughness: .08, envMapIntensity: .8, sheen: 0 });
  const marbleB = marble.clone(); marbleB.map = tex(M2);
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: .28, metalness: 0, clearcoat: .7, clearcoatRoughness: .15, envMapIntensity: 1.0 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe0ac3c, roughness: .22, metalness: 1, envMapIntensity: 1.4, emissive: 0xffa21a, emissiveIntensity: 0 });
  J.fsMat = { marble, marbleB, black, gold };
  // 3) rest positions of the bones in mesh space
  const abs = (b) => { const p = new THREE.Vector3(); while (b && b.isBone) { p.add(b.userData.rest || b.position); b = b.parent; } return p; };
  const add = (bone, geo, mat, center, rotZ = 0, pivot = null) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
    const hb = abs(J.B[bone]); const p = center.clone();
    if (rotZ && pivot) { p.sub(pivot).applyAxisAngle(new THREE.Vector3(0, 0, 1), rotZ).add(pivot); m.rotation.z = rotZ; }
    m.position.copy(p.sub(hb)); J.B[bone].add(m); J.meshes.push(m); return m; };
  const RB = (w, h, d, r = .07) => new RoundedBoxGeometry(w, h, d, 4, r);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // torso (mesh space: R side +x, front = -z)
  add("UpperTorso", RB(2.0, 1.62, 1.0, .08), marble, V(0, 2.91, 0));
  add("LowerTorso", RB(2.0, .44, 1.0, .06), marbleB, V(0, 1.9, 0));
  // black shirt panel + lapels on the front (-z)
  const shirt = new THREE.Shape(); shirt.moveTo(-.42, 1.62); shirt.lineTo(.42, 1.62); shirt.lineTo(.3, 0); shirt.lineTo(-.3, 0); shirt.closePath();
  const sg = new THREE.ExtrudeGeometry(shirt, { depth: .03, bevelEnabled: false }); const s1 = add("UpperTorso", sg, black, V(0, 2.1, -.53)); s1.rotation.y = Math.PI;
  const tie = new THREE.Shape(); tie.moveTo(-.09, 1.5); tie.lineTo(.09, 1.5); tie.lineTo(.14, .25); tie.lineTo(0, .05); tie.lineTo(-.14, .25); tie.closePath();
  const tg = new THREE.ExtrudeGeometry(tie, { depth: .02, bevelEnabled: false }); const t1 = add("UpperTorso", tg, new THREE.MeshPhysicalMaterial({ color: 0x1b1b20, roughness: .18, clearcoat: 1 }), V(0, 2.12, -.565)); t1.rotation.y = Math.PI;
  for (const s of [-1, 1]) { const lap = new THREE.Shape(); lap.moveTo(s * .3, 0); lap.lineTo(s * .44, 0); lap.lineTo(s * .66, 1.62); lap.lineTo(s * .43, 1.62); lap.closePath();
    const lg = new THREE.ExtrudeGeometry(lap, { depth: .045, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 2 }); add("UpperTorso", lg, marble, V(0, 2.1, -.58)); }
  const pin = add("UpperTorso", RB(.12, .26, .06, .025), gold, V(-.6, 3.25, -.55)); // gold pin on his left chest
  // arms: rounded blocks hanging from a pivot at the top, rotated out by armRest like the scan's rest pose
  const ar = J.armRest || 0;
  for (const [s, sg2] of [["R", 1], ["L", -1]]) {
    const piv = abs(J.B[s + "UpperArm"]); const top = 3.72, x0 = sg2 * 1.5; // straight-down block centre x before rotation
    const rot = sg2 * ar;
    add(s + "UpperArm", RB(.98, .92, .98, .08), marble, V(x0, top - .46, 0), rot, piv);
    add(s + "LowerArm", RB(.96, .74, .96, .07), marbleB, V(x0, top - .92 - .37, 0), rot, piv);
    add(s + "Hand", RB(.94, .34, .94, .08), black, V(x0, top - 1.66 - .17, 0), rot, piv);
    // gold cuff seam
    add(s + "LowerArm", RB(.99, .05, .99, .02), gold, V(x0, top - 1.63, 0), rot, piv);
  }
  // legs
  for (const [s, sg2] of [["R", 1], ["L", -1]]) {
    const x = sg2 * .5;
    add(s + "UpperLeg", RB(.98, .78, .98, .07), marble, V(x, 1.29, 0));
    add(s + "LowerLeg", RB(.96, .6, .96, .07), marbleB, V(x, .62, 0));
    add(s + "Foot", RB(.98, .32, 1.02, .08), black, V(x, .16, -.02));
  }
  // marble neck ring under the head
  add("UpperTorso", new THREE.CylinderGeometry(.42, .46, .14, 32), marble, V(0, 3.77, 0));
  return J;
}
