/* Overgrind crew: shared 3D avatars (FreshStatue + Andrin), R6 joints, game outfits and voice lines. */
import * as THREE from "./vendor/three.module.min.js";

export const D2R = Math.PI / 180;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const sm = (x) => x * x * (3 - 2 * x);
export const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

/* ---------- loading ---------- */
async function loadOGM(url) {
  const buf = await (await fetch(url)).arrayBuffer(), dv = new DataView(buf);
  const hl = dv.getUint32(0, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  let o = 4 + hl; const n = H.n;
  const qp = new Uint16Array(buf, o, n * 3); o += n * 6; o += (4 - (o % 4)) % 4;
  const qn = new Int8Array(buf, o, n * 3); o += n * 3; o += (4 - (o % 4)) % 4;
  const qu = new Uint16Array(buf, o, n * 2); o += n * 4;
  const qi = new Uint16Array(buf, o, H.i);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n * 3; i++) { pos[i] = H.lo[i % 3] + qp[i] * H.sc[i % 3]; nor[i] = qn[i] / 127; }
  for (let i = 0; i < n * 2; i++) uv[i] = qu[i] / 65535;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(qi, 1));
  return { g, H };
}
const cache = {};
export function loadCrew(base = "", which = ["fs", "an"]) {
  const key = base + which.join();
  if (cache[key]) return cache[key];
  const tl = new THREE.TextureLoader();
  const tex = (u, srgb) => tl.loadAsync(base + u).then((t) => { t.flipY = false; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; });
  const one = async (k) => {
    const name = k === "fs" ? "freshstatue" : "andrin";
    const [m, map, nrm] = await Promise.all([loadOGM(base + `assets/crew3d/${name}.ogm`), tex(`assets/crew3d/${name}.jpg`, true), tex(`assets/crew3d/${name}_n.jpg`)]);
    return { m, map, nrm };
  };
  return (cache[key] = Promise.all(which.map(one)).then((arr) => Object.fromEntries(which.map((k, i) => [k, arr[i]]))));
}

/* ---------- rigs ---------- */
const PARTS = ["head", "torso", "armL", "armR", "legL", "legR"];
export const META = {
  fs: { name: "FreshStatue", headTop: .47, hand: -.62, eyeY: .2, eyeZ: .26, rough: .42 },
  an: { name: "Andrin", headTop: .5, hand: -.66, eyeY: .2, eyeZ: .27, rough: .62 },
  box: { name: "", headTop: .4, hand: -.62, eyeY: .2, eyeZ: .2 },
};
export function makeAvatar(key, data) {
  const d = data[key];
  const mat = new THREE.MeshStandardMaterial({ map: d.map, normalMap: d.nrm, roughness: META[key].rough, metalness: 0 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const J = { key, root, body, meshes: [], mat, outfit: null };
  for (const nm of PARTS) {
    const [o, n] = d.m.H.parts[nm], piv = d.m.H.pivots[nm];
    const g = d.m.g.clone(); g.setIndex(new THREE.BufferAttribute(d.m.g.index.array.slice(o, o + n), 1));
    const grp = new THREE.Group(); grp.position.set(...piv);
    const m = new THREE.Mesh(g, mat); m.position.set(-piv[0], -piv[1], -piv[2]); grp.add(m); body.add(grp);
    J[nm] = grp; J.meshes.push(m);
  }
  if (key === "fs") { // close the neck and shoulder seams of the marble coat
    const neck = new THREE.MeshStandardMaterial({ color: 0xcfccc6, roughness: .5 }); J.extraMat = neck;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(.16, .17, .14, 24), neck); n.position.set(0, 1.47, 0); body.add(n);
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(.03, .46, .4), neck); f.position.set(sx * .378, 1.17, 0); body.add(f); }
  }
  return J;
}
export function boxRig(mat) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const J = { key: "box", root, body, meshes: [], mat };
  const add = (nm, w, h, dd, piv, off) => { const grp = new THREE.Group(); grp.position.set(...piv); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), mat); m.position.set(...off); grp.add(m); body.add(grp); J[nm] = grp; J.meshes.push(m); };
  add("torso", .76, .76, .38, [0, 0, 0], [0, 1.16, 0]);
  add("head", .38, .38, .38, [0, 1.54, 0], [0, .2, 0]);
  add("armL", .36, .76, .36, [.57, 1.4, 0], [0, -.26, 0]);
  add("armR", .36, .76, .36, [-.57, 1.4, 0], [0, -.26, 0]);
  add("legL", .37, .78, .37, [.19, .78, 0], [0, -.39, 0]);
  add("legR", .37, .78, .37, [-.19, .78, 0], [0, -.39, 0]);
  return J;
}
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AZ = new THREE.Vector3(0, 0, 1);
/* fwd: raise forward (deg), side: raise outward (deg), s: +1 left arm, -1 right arm */
export function setArm(grp, fwd, side, s) { qa.setFromAxisAngle(AZ, s * side * D2R); qb.setFromAxisAngle(AX, -fwd * D2R); grp.quaternion.copy(qa).multiply(qb); }

/* ---------- game outfits ---------- */
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .05, ...o });
const glow = (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i, roughness: 1 });
const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.3, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function sprite(col, s) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.scale.set(s, s, 1); return m; }

export const OUTFIT_KEYS = ["wyrm", "recess", "pirates", "seen", "clash", "lantern", "line"];
const OUTFITS = {
  wyrm(J, M) { // dragon horns + ember wings
    const g = new THREE.Group(), horn = std(0x2b1410, { roughness: .35 }), tip = glow(0xff4d1a, 1.6);
    for (const s of [-1, 1]) {
      const h = new THREE.Group(); h.position.set(s * .17, M.headTop - .1, -.02); h.rotation.set(-.5, 0, -s * .55);
      const c = new THREE.Mesh(new THREE.ConeGeometry(.07, .3, 12), horn); c.position.y = .15; h.add(c);
      const t = new THREE.Mesh(new THREE.ConeGeometry(.035, .1, 10), tip); t.position.y = .3; h.add(t); g.add(h);
    }
    J.head.add(g);
    const w = new THREE.Group(); w.position.set(0, 1.2, -.24); J.body.add(w);
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(.5, .45, .95, .55); shape.lineTo(.8, .3); shape.lineTo(.9, .15); shape.lineTo(.62, .02); shape.lineTo(.7, -.18); shape.quadraticCurveTo(.35, -.08, 0, -.1);
    const wm = new THREE.MeshStandardMaterial({ color: 0x3a120a, emissive: 0xff3d10, emissiveIntensity: .35, roughness: .5, side: THREE.DoubleSide });
    const L = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), wm), R = L.clone(); R.scale.x = -1; w.add(L, R);
    return { parts: [g, w], update(t) { const f = Math.sin(t * 3) * .25; L.rotation.y = -.5 - f; R.rotation.y = .5 + f; } };
  },
  recess(J, M) { // propeller beanie
    const g = new THREE.Group(); g.position.y = M.headTop - .22; J.head.add(g);
    const cols = [0xff4d1a, 0xffc34d, 0x2bd4e0, 0x8be04e];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.29, 16, 10, i * Math.PI / 2, Math.PI / 2, 0, Math.PI / 2), std(cols[i])); g.add(m); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.285, .03, 8, 32), std(0xf2efe9)); rim.rotation.x = Math.PI / 2; g.add(rim);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .12, 8), std(0x222222)); stick.position.y = .33; g.add(stick);
    const prop = new THREE.Group(); prop.position.y = .39; g.add(prop);
    for (const s of [0, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.34, .012, .06), std(s ? 0xff4d1a : 0x2bd4e0)); b.position.x = s ? .17 : -.17; prop.add(b); }
    return { parts: [g], update(t) { prop.rotation.y = t * 14; } };
  },
  pirates(J, M) { // tricorn hat with skull
    const g = new THREE.Group(); g.position.y = M.headTop - .13; J.head.add(g);
    const felt = std(0x1a1414, { roughness: .8 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .05, 3), felt); brim.rotation.y = Math.PI; g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.2, .25, .22, 24), felt); crown.position.y = .12; g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.252, .252, .045, 24), std(0xc9a227, { metalness: .6, roughness: .3 })); band.position.y = .04; g.add(band);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), std(0xf2efe9)); skull.position.set(0, .12, .21); g.add(skull);
    const feather = new THREE.Mesh(new THREE.ConeGeometry(.04, .45, 8), std(0xff4d1a)); feather.position.set(.2, .25, -.05); feather.rotation.z = -.9; g.add(feather);
    return { parts: [g], update(t) { feather.rotation.x = Math.sin(t * 4) * .15; } };
  },
  seen(J, M) { // glowing phone in hand, screen flickers
    const g = new THREE.Group(); g.position.set(0, M.hand, .1); g.rotation.x = -1.1; J.armR.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.18, .32, .025), std(0x0c0c0e, { roughness: .2, metalness: .5 })); g.add(body);
    const scr = new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false }), s = new THREE.Mesh(new THREE.PlaneGeometry(.155, .28), scr); s.position.z = .011; g.add(s);
    const halo = sprite(0xff3030, .9); halo.position.z = .05; g.add(halo);
    const eyes = new THREE.Group(); eyes.position.set(0, M.eyeY + .02, -.6); J.head.add(eyes);
    for (const sx of [-1, 1]) { const e = sprite(0xff2020, .12); e.position.x = sx * .09; eyes.add(e); }
    return { parts: [g, eyes], update(t) { const f = hash(Math.floor(t * 12)) > .85 ? .25 : 1; scr.color.setRGB(f, .16 * f, .16 * f); halo.material.opacity = .7 * f; eyes.children.forEach((e) => (e.material.opacity = (Math.sin(t * 2) * .5 + .5) * .9)); eyes.position.x = Math.sin(t * .7) * .3; } };
  },
  clash(J) { // fire + ice orbs orbiting the fighter
    const g = new THREE.Group(); g.position.y = 1.15; J.root.add(g);
    const orbs = [[0xff5a1a, 0], [0x3fd8ff, Math.PI]].map(([c, ph]) => { const o = new THREE.Group(); const core = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), glow(c, 3)); const h = sprite(c, .75); o.add(core, h); o.userData.ph = ph; g.add(o); return o; });
    const trail = []; for (let i = 0; i < 16; i++) { const s = sprite(i % 2 ? 0x3fd8ff : 0xff5a1a, .16 - i * .007); g.add(s); trail.push(s); }
    return { parts: [g], update(t) { orbs.forEach((o) => { const a = t * 2.4 + o.userData.ph; o.position.set(Math.cos(a) * .62, Math.sin(t * 1.7 + o.userData.ph) * .25, Math.sin(a) * .45); });
      trail.forEach((s, i) => { const o = orbs[i % 2], a = (t - (i >> 1) * .045) * 2.4 + o.userData.ph; s.position.set(Math.cos(a) * .62, Math.sin((t - (i >> 1) * .045) * 1.7 + o.userData.ph) * .25, Math.sin(a) * .45); s.material.opacity = 1 - (i >> 1) / 8; }); } };
  },
  lantern(J, M) { // old oil lantern with a real warm light
    const g = new THREE.Group(); g.position.set(0, M.hand - .12, .04); J.armL.add(g);
    const iron = std(0x1f1a14, { metalness: .6, roughness: .4 });
    const top = new THREE.Mesh(new THREE.ConeGeometry(.1, .08, 8), iron); top.position.y = .16; g.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.04, .01, 6, 16), iron); ring.position.y = .23; g.add(ring);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .04, 8), iron); base.position.y = -.12; g.add(base);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.012, .25, .012), iron); const a = i / 4 * Math.PI * 2 + Math.PI / 4; b.position.set(Math.cos(a) * .085, .01, Math.sin(a) * .085); g.add(b); }
    const flame = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), glow(0xffa040, 4)); flame.scale.y = 1.6; g.add(flame);
    const h = sprite(0xffa040, .9); g.add(h);
    const light = new THREE.PointLight(0xffa040, 2.2, 3.5, 1.6); g.add(light);
    return { parts: [g], update(t) { const f = .85 + .15 * Math.sin(t * 17) * Math.sin(t * 7.3); light.intensity = 2.2 * f; h.material.opacity = f; flame.scale.y = 1.4 + .3 * f; } };
  },
  line(J, M) { // Dubai 2099: gold halo + holo visor
    const g = new THREE.Group(); J.head.add(g);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(.26, .018, 10, 48), glow(0xffc34d, 2.4)); halo.rotation.x = Math.PI / 2; halo.position.y = M.headTop + .12; g.add(halo);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.44, .07, .04), new THREE.MeshBasicMaterial({ color: 0x5ee7ff, transparent: true, opacity: .85, toneMapped: false })); visor.position.set(0, M.eyeY, M.eyeZ + .01); g.add(visor);
    const scan = new THREE.Mesh(new THREE.BoxGeometry(.05, .075, .045), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); scan.position.copy(visor.position); g.add(scan);
    return { parts: [g], update(t) { halo.position.y = M.headTop + .12 + Math.sin(t * 2) * .03; halo.rotation.z = t; scan.position.x = Math.sin(t * 3) * .19; } };
  },
};
export function setOutfit(J, key) {
  if (J.outfit) { J.outfit.parts.forEach((p) => p.removeFromParent()); J.outfit = null; }
  if (!key || !OUTFITS[key]) return;
  J.outfit = OUTFITS[key](J, META[J.key] || META.box); J.outfit.key = key;
}
export function updateOutfit(J, t) { if (J.outfit && J.outfit.update) J.outfit.update(t); }

/* ---------- voice lines + UI sounds ---------- */
export const LINES = {
  fs: { hi: "fs_hi", founder: "fs_founder", touch: "fs_touch", five: "fs_five", grind: "fs_grind", built: "fs_built" },
  an: { hi: "an_hi", crown: "an_crown", video: "an_video", spin: "an_spin", five: "an_five", go: "an_go" },
};
let AC = null, sfxBase = "", muted = false, gest = false;
for (const ev of ["pointerdown", "keydown", "touchstart"]) addEventListener(ev, () => { gest = true; if (AC && AC.state === "suspended") AC.resume(); }, { capture: true, passive: true });
try { muted = localStorage.getItem("og-mute") === "1"; } catch (e) {}
const bufs = {};
export function soundBase(b) { sfxBase = b; }
export function isMuted() { return muted; }
export function setMuted(v) { muted = v; try { localStorage.setItem("og-mute", v ? "1" : "0"); } catch (e) {} document.dispatchEvent(new CustomEvent("og-mute", { detail: v })); }
function ctx() { if (!gest) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (AC.state === "suspended") AC.resume(); return AC; }
async function getBuf(name) {
  if (bufs[name]) return bufs[name];
  const a = ctx(); if (!a) return null;
  return (bufs[name] = fetch(`${sfxBase}assets/sfx/${name}.mp3`).then((r) => r.arrayBuffer()).then((b) => a.decodeAudioData(b)).catch(() => null));
}
let speaking = null;
export async function say(who, line) {
  if (muted) return; const name = LINES[who] && LINES[who][line]; if (!name) return;
  const a = ctx(); if (!a) return; const b = await getBuf(name); if (!b) return;
  if (speaking) try { speaking.stop(); } catch (e) {}
  const s = a.createBufferSource(), g = a.createGain(); g.gain.value = .9; s.buffer = b; s.connect(g).connect(a.destination); s.start(); speaking = s;
  return b.duration;
}
export function blip(kind = "pop") { // tiny synthesized UI sounds, no files
  if (muted) return; const a = ctx(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.connect(g).connect(a.destination);
  const P = { pop: [520, 880, .09, "triangle", .12], whoosh: [180, 60, .25, "sawtooth", .05], spark: [1400, 2400, .12, "square", .04], thud: [140, 50, .18, "sine", .3], glitch: [90, 900, .1, "square", .05] }[kind] || [600, 900, .1, "sine", .1];
  o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
  g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(.0001, t + P[2] + .05); o.start(t); o.stop(t + P[2] + .06);
}
export function preloadVoices(who) { const go = () => Object.values(LINES[who] || {}).forEach((n) => getBuf(n)); if (gest) go(); else addEventListener("pointerdown", go, { once: true }); }
