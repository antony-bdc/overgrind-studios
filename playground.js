/* Join section playground: studded bricks in the crew colours rain down and pile up. Grab one and throw it. */
(function(){
  "use strict";
  var sec = document.querySelector(".join"); if (!sec || !window.Matter) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var M = Matter, E = M.Engine.create({ gravity: { y: 1.1 } }), W = M.World, B = M.Bodies, Bo = M.Body;
  var cv = document.createElement("canvas"); cv.className = "play"; cv.setAttribute("aria-hidden", "true"); sec.insertBefore(cv, sec.firstChild);
  var g = cv.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2), w = 0, h = 0, U = 34, walls = [], bricks = [], started = false, visible = false;
  var COL = ["#E2202E", "#E8A400", "#2450FF", "#7B45F5"];
  function size(){ var r = sec.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px"; U = w < 700 ? 24 : 34;
    walls.forEach(function(b){ W.remove(E.world, b); }); var t = 200;
    walls = [B.rectangle(w / 2, h + t / 2, w * 3, t, { isStatic: true }), B.rectangle(-t / 2, h / 2, t, h * 3, { isStatic: true }), B.rectangle(w + t / 2, h / 2, t, h * 3, { isStatic: true })]; W.add(E.world, walls); }
  size(); addEventListener("resize", size);
  function drop(n){ for (var i = 0; i < n; i++) (function(i){ setTimeout(function(){
    var wide = Math.random() < .6 ? 2 : 1, bw = U * wide, bh = U * .8, x = w * (.08 + Math.random() * .84);
    var b = B.rectangle(x, -60 - Math.random() * 200, bw, bh, { restitution: .25, friction: .6, chamfer: { radius: 3 }, angle: (Math.random() - .5) * .8 });
    b.og = { c: COL[(Math.random() * 4) | 0], studs: wide * 2, bw: bw, bh: bh }; bricks.push(b); W.add(E.world, b);
    if (bricks.length > 70){ var o = bricks.shift(); W.remove(E.world, o); }
  }, i * 70); })(i); }
  new IntersectionObserver(function(es){ es.forEach(function(e){ visible = e.isIntersecting; if (visible && !started){ started = true; drop(w < 700 ? 22 : 40); } }); }, { threshold: .25 }).observe(sec);
  /* grab and throw (only when you press on a brick, so buttons keep working) */
  var drag = null, mp = { x: 0, y: 0 }, prev = { x: 0, y: 0 };
  function local(e){ var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  sec.addEventListener("pointerdown", function(e){ if (e.target.closest("a,button,input")) return; var p = local(e), hit = M.Query.point(bricks, p)[0]; if (!hit) return;
    e.preventDefault(); drag = M.Constraint.create({ pointA: p, bodyB: hit, pointB: { x: p.x - hit.position.x, y: p.y - hit.position.y }, stiffness: .2, damping: .1 }); W.add(E.world, drag); mp = p; prev = p; sec.classList.add("grabbing"); window.ogSfx && window.ogSfx("clack"); });
  addEventListener("pointermove", function(e){ var p = local(e); prev = mp; mp = p; if (drag) drag.pointA = p; else sec.classList.toggle("grab", !!M.Query.point(bricks, p)[0]); }, { passive: true });
  addEventListener("pointerup", function(){ if (!drag) return; var b = drag.bodyB; W.remove(E.world, drag); drag = null; Bo.setVelocity(b, { x: (mp.x - prev.x) * .9, y: (mp.y - prev.y) * .9 }); sec.classList.remove("grabbing"); });
  M.Events.on(E, "collisionStart", function(ev){ ev.pairs.forEach(function(p){ var s = Math.abs(p.bodyA.velocity.y - p.bodyB.velocity.y) + Math.abs(p.bodyA.velocity.x - p.bodyB.velocity.x); if (s > 6 && visible) window.ogSfx && window.ogSfx("clack"); }); });
  function shade(hex, k){ var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255; return "rgb(" + Math.round(r * k) + "," + Math.round(gg * k) + "," + Math.round(b * k) + ")"; }
  var lastT = performance.now();
  (function loop(t){ requestAnimationFrame(loop); if (!visible) { lastT = t; return; }
    M.Engine.update(E, Math.min(32, t - lastT)); lastT = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    bricks.forEach(function(b){ var o = b.og; g.save(); g.translate(b.position.x, b.position.y); g.rotate(b.angle);
      var x = -o.bw / 2, y = -o.bh / 2, sw = o.bw / o.studs;
      for (var i = 0; i < o.studs; i++){ g.fillStyle = shade(o.c, .82); g.fillRect(x + i * sw + sw * .22, y - o.bh * .22, sw * .56, o.bh * .26); g.fillStyle = shade(o.c, 1.12); g.fillRect(x + i * sw + sw * .22, y - o.bh * .22, sw * .56, o.bh * .07); }
      g.fillStyle = o.c; g.beginPath(); g.roundRect(x, y, o.bw, o.bh, 3); g.fill();
      g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(x + 2, y + 2, o.bw - 4, o.bh * .18);
      g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x + 2, y + o.bh * .78, o.bw - 4, o.bh * .2);
      g.restore(); });
  })(performance.now());
})();
