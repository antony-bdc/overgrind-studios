/* Overgrind character animation: one pose model for every R6 avatar on the site.
   An Actor blends a base loop (idle, sit, run, float…) with one-shot emotes and plays
   random idle moves on its own, so the crew always looks alive. */
import { setArm, clamp, sm, hash, say, blip } from "./crew3d.js";

const P0 = () => ({ y: 0, x: 0, ry: 0, rx: 0, rz: 0, sx: 1, sy: 1, hx: 0, hy: 0, hz: 0, rf: 4, rs: 4, lf: 4, ls: 4, ll: 0, lr: 0, tint: 1 });
const KEYS = Object.keys(P0());
const pulse = (t, a, b) => sm(clamp((t - a) / (b - a), 0, 1));
const bump = (x) => Math.sin(clamp(x, 0, 1) * Math.PI);

/* every emote: d = duration (s), f(t, p, A) writes absolute channel values onto p */
export const EMOTES = {
  wave: { d: 1.8, f(t, p) { p.rs = 150 + 20 * Math.sin(t * 12); p.rf = 10; p.hz = .1 * Math.sin(t * 6); p.hy += .15; } },
  hello: { d: 1.6, f(t, p) { p.rs = 150 + 20 * Math.sin(t * 12); p.ls = 150 + 20 * Math.sin(t * 12 + 1); p.rf = p.lf = 10; p.y = Math.abs(Math.sin(t * 6)) * .05; } },
  point: { d: 1.6, f(t, p) { p.rf = 86; p.rs = 6; p.rx = .05; p.hy = -.08; } },
  pointUp: { d: 1.6, f(t, p) { p.rf = 160; p.rs = 10; p.hx = -.25; } },
  jump: { d: 1.0, f(t, p) { const x = clamp((t - .12) / .6, 0, 1), u = bump(x); p.y = u * .55; p.rs = p.ls = 4 + 140 * u; p.sy = t < .12 ? 1 - .09 * bump(t / .12) : x >= 1 ? 1 - .07 * bump((t - .72) / .2) : 1 + .04 * u; p.sx = 2 - p.sy; p.ll = -.35 * u; p.lr = .2 * u; } },
  dance: { d: 2.6, f(t, p) { const b = Math.sin(t * 9); p.rs = 70 + 70 * b; p.ls = 70 - 70 * b; p.rf = p.lf = 30; p.y = Math.abs(Math.sin(t * 9)) * .1; p.ry = Math.sin(t * 4.5) * .5; p.hz = .15 * Math.sin(t * 9); p.ll = Math.sin(t * 9) * .2; p.lr = -p.ll; } },
  spin: { d: 1.1, f(t, p) { const x = clamp(t / .9, 0, 1); p.ry = sm(x) * Math.PI * 2; p.y = bump(x) * .3; p.rs = p.ls = 4 + 70 * bump(x); } },
  clap: { d: 1.6, f(t, p) { p.rf = p.lf = 72; p.rs = p.ls = 6 - 16 * Math.abs(Math.sin(t * 10)); p.y = Math.abs(Math.sin(t * 10)) * .015; p.hx = .06; } },
  cheer: { d: 2.0, f(t, p) { p.rs = p.ls = 162 + 10 * Math.sin(t * 10); p.rf = p.lf = 12; p.y = Math.abs(Math.sin(t * 7)) * .16; p.hx = -.2; } },
  stretch: { d: 2.6, f(t, p) { const up = pulse(t, 0, .6) * (1 - pulse(t, 2.1, 2.6)); p.rs = p.ls = 4 + 168 * up; p.rf = p.lf = 4 + 8 * up; p.sy = 1 + .035 * up; p.rz = Math.sin(clamp((t - .7) / 1.3, 0, 1) * Math.PI * 2) * .13 * up; p.hx = -.2 * up; } },
  yawn: { d: 2.4, f(t, p) { const u = pulse(t, 0, .4) * (1 - pulse(t, 1.9, 2.4)); p.rf = 4 + 118 * u; p.rs = 4 - 6 * u; p.hx = -.32 * u; p.sy = 1 + .02 * u; p.rx = -.05 * u; } },
  phone: { d: 3.2, f(t, p) { const u = pulse(t, 0, .35) * (1 - pulse(t, 2.8, 3.2)); p.rf = 4 + 72 * u; p.rs = 4 - 14 * u; p.hx = .36 * u; p.hy = -.08 * u; if (t > 1.4 && t < 1.8) p.y = bump((t - 1.4) / .4) * .05; } },
  shrug: { d: 1.5, f(t, p) { const u = pulse(t, 0, .25) * (1 - pulse(t, 1.1, 1.5)); p.rs = p.ls = 4 + 32 * u; p.rf = p.lf = 4 + 24 * u; p.hz = .16 * u; p.sy = 1 + .02 * u; } },
  lookaround: { d: 3.0, f(t, p) { p.hy = Math.sin(t * 2.1) * .85 * (1 - pulse(t, 2.5, 3)); p.hx = -.08; p.ry = Math.sin(t * 2.1) * .12; } },
  tapfoot: { d: 2.4, f(t, p) { p.lr = -.22 * Math.max(0, Math.sin(t * 13)); p.rs = p.ls = 34; p.rf = p.lf = -14; p.hz = .06; } },
  crown: { d: 1.8, f(t, p) { const u = pulse(t, 0, .3) * (1 - pulse(t, 1.4, 1.8)); p.rs = p.ls = 4 + 150 * u; p.rf = p.lf = 4 + 40 * u; p.hz = Math.sin(t * 8) * .06 * u; } },
  dab: { d: 1.4, f(t, p) { const u = pulse(t, 0, .15) * (1 - pulse(t, 1.1, 1.4)); p.rf = 4 + 64 * u; p.rs = 4 - 40 * u; p.lf = 4 + 26 * u; p.ls = 4 + 128 * u; p.hx = .45 * u; p.hy = -.55 * u; p.hz = .2 * u; p.rz = -.06 * u; } },
  bow: { d: 1.6, f(t, p) { const u = pulse(t, 0, .35) * (1 - pulse(t, 1.1, 1.6)); p.rx = .5 * u; p.hx = .2 * u; p.rf = p.lf = 4 + 10 * u; } },
  facepalm: { d: 1.8, f(t, p) { const u = pulse(t, 0, .25) * (1 - pulse(t, 1.4, 1.8)); p.rf = 4 + 140 * u; p.rs = 4 - 22 * u; p.hx = .28 * u; p.sy = 1 - .02 * u; } },
  think: { d: 2.2, f(t, p) { const u = pulse(t, 0, .3) * (1 - pulse(t, 1.8, 2.2)); p.rf = 4 + 108 * u; p.rs = 4 - 26 * u; p.hy = .25 * u; p.hx = -.12 * u; p.hz = .08 * u; } },
  scared: { d: 1.4, f(t, p) { const u = pulse(t, 0, .08) * (1 - pulse(t, 1.1, 1.4)); p.x = Math.sin(t * 70) * .02 * u; p.rf = p.lf = 4 + 80 * u; p.rs = p.ls = 4 - 16 * u; p.hx = -.12 * u; p.y = bump(t / .25) * .18; p.sy = 1 - .04 * u; } },
  freeze: { d: 1.6, f(t, p) { const u = pulse(t, 0, .2) * (1 - pulse(t, 1.3, 1.6)); p.tint = 1 - .55 * clamp(t / .25, 0, 1) * (t < 1 ? 1 : 1 - clamp((t - 1) / .15, 0, 1)); p.ls = p.rs = 4 + 66 * u; p.lf = p.rf = 4 + 26 * u; if (t > 1) p.rz = Math.exp(-(t - 1) * 9) * Math.sin((t - 1) * 60) * .05; } },
  highfiveL: { d: 1.4, f(t, p) { const u = pulse(t, 0, .4) * (1 - pulse(t, 1, 1.4)); p.ls = 4 + 160 * u; p.lf = 4 + 12 * u; p.ry = .45 * u; p.x = .1 * u; } },
  highfiveR: { d: 1.4, f(t, p) { const u = pulse(t, 0, .4) * (1 - pulse(t, 1, 1.4)); p.rs = 4 + 160 * u; p.rf = 4 + 12 * u; p.ry = -.45 * u; p.x = -.1 * u; } },
  land: { d: .7, f(t, p) { const u = bump(t / .45); p.sy = 1 - .16 * u; p.sx = 1 + .1 * u; p.rs = p.ls = 4 + 40 * u; p.rx = .1 * u; } },
  hop: { d: .55, f(t, p) { const u = bump(t / .45); p.y = u * .22; p.rs = p.ls = 4 + 30 * u; } },
  victory: { d: 2.2, f(t, p) { const x = clamp(t / .7, 0, 1); p.y = bump(x) * .6; p.ry = sm(x) * Math.PI * 2; p.rs = p.ls = 165; p.rf = p.lf = 10; if (t > .7) p.y = Math.abs(Math.sin((t - .7) * 8)) * .1; } },
  punch: { d: 1.2, f(t, p) { const k = Math.floor(t / .3), f = (t % .3) / .3, u = bump(f); if (k % 2) { p.rf = 4 + 88 * u; p.rs = 6; } else { p.lf = 4 + 88 * u; p.ls = 6; } p.ry = (k % 2 ? -.2 : .2) * u; p.rx = .08; } },
};

/* looping base states */
export const LOOPS = {
  idle(t, p) { p.sy = 1 + Math.sin(t * 2.1) * .008; p.rf = 3 + Math.sin(t * 1.6) * 2; p.lf = 3 - Math.sin(t * 1.6) * 2; p.hz = Math.sin(t * .9) * .02; },
  sit(t, p) { p.ll = p.lr = -1.45; p.rf = p.lf = 30; p.rs = p.ls = 8; p.sy = 1 + Math.sin(t * 2.1) * .008; p.lr += Math.sin(t * 3) * .12; p.ll -= Math.sin(t * 3 + 1.4) * .12; },
  run(t, p) { const s = Math.sin(t * 13); p.ll = s * .75; p.lr = -s * .75; p.rf = s * 50 + 4; p.lf = -s * 50 + 4; p.rs = p.ls = 5; p.y = Math.abs(Math.cos(t * 13)) * .07; p.rx = .12; },
  walk(t, p) { const s = Math.sin(t * 6.5); p.ll = s * .45; p.lr = -s * .45; p.rf = s * 26 + 4; p.lf = -s * 26 + 4; p.y = Math.abs(Math.cos(t * 6.5)) * .03; },
  fly(t, p) { p.rx = .95; p.rs = p.ls = 84 + Math.sin(t * 5) * 8; p.rf = p.lf = 0; p.ll = .25 + Math.sin(t * 3) * .1; p.lr = .25 - Math.sin(t * 3) * .1; p.hx = -.75; p.y = Math.sin(t * 1.8) * .12; p.rz = Math.sin(t * .9) * .18; },
  float(t, p) { p.y = .2 + Math.sin(t * 1.4) * .08; p.rs = p.ls = 22 + Math.sin(t * 1.4) * 5; p.rf = p.lf = 8; p.ll = -.12; p.lr = .06; p.ry = Math.sin(t * .4) * .3; },
  fight(t, p) { p.rf = p.lf = 62; p.rs = p.ls = -6; p.ll = -.3; p.lr = .25; p.y = -.04 + Math.abs(Math.sin(t * 4)) * .03; p.rx = .1; p.ry = -.25; },
  sneak(t, p) { const s = Math.sin(t * 3.2); p.ll = s * .3; p.lr = -s * .3; p.rx = .18; p.y = -.05 + Math.abs(Math.cos(t * 3.2)) * .02; p.lf = 70; p.ls = 4; p.rf = 6 + s * 10; p.hy = Math.sin(t * .8) * .55; },
  lean(t, p) { p.rz = .28; p.rs = 4; p.ls = 18; p.hz = -.12; p.sy = 1 + Math.sin(t * 2.1) * .008; },
  hang(t, p) { p.rs = p.ls = 172; p.rf = p.lf = 6; p.ll = Math.sin(t * 2) * .12; p.lr = -p.ll; p.rz = Math.sin(t * 1.3) * .05; },
};

/* time-of-day mood (visitor's clock): sleepy at night, stretchy in the morning, party in the evening */
export function mood() { let h = new Date().getHours(); try { const q = new URLSearchParams(location.search).get("hour"); if (q) h = +q; } catch (e) {} return h >= 22 || h < 6 ? "night" : h < 11 ? "morning" : h >= 18 ? "evening" : "day"; }
const MOOD_EXTRA = { night: ["yawn", "yawn", "stretch", "lookaround"], morning: ["stretch", "stretch", "yawn"], evening: ["dance", "cheer", "dance"], day: [] };
LOOPS.sleepy = (t, p) => { p.sy = 1 + Math.sin(t * 1.2) * .012; p.hx = .16 + Math.sin(t * 1.2) * .04; p.hz = Math.sin(t * .5) * .05; p.rf = p.lf = 2; p.rs = p.ls = 2; p.rx = .03; };
const IDLE = { fs: ["lookaround", "stretch", "phone", "tapfoot", "yawn", "shrug", "think"], an: ["lookaround", "crown", "tapfoot", "stretch", "dab", "shrug", "phone"], box: ["lookaround", "stretch", "tapfoot", "shrug"] };
const VOICE = { fs: { wave: "hi", hello: "hi", freeze: "touch", jump: "grind", point: "founder", dance: "built", victory: "built", cheer: "five" }, an: { wave: "hi", hello: "hi", spin: "spin", jump: "go", point: "crown", dance: "go", crown: "crown", victory: "go", cheer: "five" } };

export class Actor {
  constructor(J, o = {}) {
    this.J = J; this.who = J.key; this.loop = o.loop || "idle"; this.idle = o.idle !== false; this.voice = o.voice !== false;
    this.t = Math.random() * 10; this.em = null; this.et = 0; this.next = 3 + Math.random() * 5; this.look = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
    this.p = P0(); this.prevLoop = null; this.loopW = 1; this.mood = mood();
  }
  setLoop(name) { if (name === this.loop) return; this.prevLoop = this.loop; this.loop = name; this.loopW = 0; }
  play(name, { voice = true, sound = true } = {}) {
    if (!EMOTES[name]) return 0; this.em = name; this.et = 0; this.next = this.t + 6 + Math.random() * 5;
    if (voice && this.voice && VOICE[this.who] && VOICE[this.who][name]) say(this.who, VOICE[this.who][name]);
    if (sound) blip(name === "jump" || name === "victory" ? "jump" : name === "land" ? "land" : name === "freeze" || name === "cheer" ? "spark" : "pop");
    return EMOTES[name].d;
  }
  busy() { return !!this.em; }
  lookAt(yaw, pitch) { this.look.ty = clamp(yaw, -1, 1); this.look.tp = clamp(pitch, -.45, .4); }
  update(dt) {
    this.t += dt; const t = this.t, J = this.J;
    // base loop (cross-fades when the loop changes)
    const p = P0(); (LOOPS[this.loop === "idle" && this.mood === "night" ? "sleepy" : this.loop] || LOOPS.idle)(t, p);
    if (this.prevLoop && this.loopW < 1) { this.loopW = Math.min(1, this.loopW + dt * 4); const q = P0(); (LOOPS[this.prevLoop] || LOOPS.idle)(t, q); for (const k of KEYS) p[k] = q[k] + (p[k] - q[k]) * sm(this.loopW); }
    // head follows the look target
    this.look.yaw += (this.look.ty - this.look.yaw) * Math.min(1, dt * 6); this.look.pitch += (this.look.tp - this.look.pitch) * Math.min(1, dt * 6);
    p.hy += this.look.yaw * .75; p.hx += this.look.pitch; p.ry += this.look.yaw * .2;
    // emote on top
    if (!this.em && this.idle && (this.loop === "idle" || this.loop === "sit") && t > this.next) { const pool = this.idlePool || (IDLE[this.who] || IDLE.box).concat(MOOD_EXTRA[this.mood] || []); this.play(pool[(hash(Math.floor(t * 7)) * pool.length) | 0], { voice: false, sound: false }); }
    if (this.em) {
      const E = EMOTES[this.em]; this.et += dt; const f = this.et, w = Math.min(clamp(f / .18, 0, 1), 1 - clamp((f - (E.d - .2)) / .2, 0, 1));
      const q = { ...p }; E.f(f, q, this);
      for (const k of KEYS) p[k] = p[k] + (q[k] - p[k]) * (k === "ry" || k === "y" || k === "tint" ? Math.max(w, f < E.d ? 1 : 0) : w);
      if (f >= E.d) this.em = null;
    }
    this.p = p;
    // apply
    J.body.position.set(p.x, p.y, 0); J.body.rotation.set(p.rx, p.ry, p.rz); J.body.scale.set(p.sx, p.sy, p.sx);
    J.head.rotation.set(p.hx, p.hy, p.hz);
    setArm(J.armR, p.rf, p.rs, -1); setArm(J.armL, p.lf, p.ls, 1);
    J.legL.rotation.x = p.ll; J.legR.rotation.x = p.lr;
    if (J.mat && J.mat.color && J.key !== "box") J.mat.color.setScalar(p.tint);
    if (J.extraMat) J.extraMat.color.setRGB(.81 * p.tint, .8 * p.tint, .78 * p.tint);
  }
}
export const EMOTE_SETS = { fs: ["wave", "freeze", "jump", "point", "dance", "spin", "dab", "victory", "cheer"], an: ["wave", "spin", "crown", "jump", "point", "dance", "dab", "victory", "cheer"] };
