/* Overgrind UI sound: small synthesized sounds (no files), very quiet, with a mute switch in the nav.
   window.ogSfx(name) plays one: tick, click, whoosh, lock, portal, clack, open. */
(function(){
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) { window.ogSfx = function(){}; return; }
  var ctx = null, master = null, on = true, last = {};
  try { on = localStorage.getItem("og-sound") !== "off"; } catch(e){}
  function boot(){ if (ctx) return; ctx = new AC(); master = ctx.createGain(); master.gain.value = .22; master.connect(ctx.destination); }
  function env(g, t, a, d, peak){ g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function noise(dur){ var b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur | 0), ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; var s = ctx.createBufferSource(); s.buffer = b; return s; }
  function tone(type, f0, f1, dur, peak, at){ var t = ctx.currentTime + (at || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, t, .004, dur, peak); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05); }
  function hiss(f0, f1, dur, peak, q, at){ var t = ctx.currentTime + (at || 0), n = noise(dur + .05), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "bandpass"; f.Q.value = q || 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, t, dur * .3, dur * .7, peak); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .05); }
  var S = {
    tick: function(){ tone("sine", 1800, 1400, .04, .25); },
    click: function(){ tone("triangle", 520, 260, .09, .5); tone("sine", 1560, 900, .05, .18); },
    whoosh: function(){ hiss(300, 2400, .32, .5, .8); },
    lock: function(){ tone("square", 180, 120, .05, .18); tone("square", 240, 160, .05, .16, .07); },
    open: function(){ hiss(400, 3000, .28, .35, .9); tone("sine", 440, 880, .2, .25, .05); tone("sine", 660, 1320, .2, .18, .1); },
    portal: function(){ hiss(200, 4000, .55, .55, .7); tone("sine", 220, 880, .5, .22); },
    clack: function(){ tone("triangle", 900 + Math.random() * 500, 400, .05, .35); hiss(2000, 3000, .04, .2, 4); }
  };
  window.ogSfx = function(name){ if (!on || !S[name]) return; boot(); if (ctx.state === "suspended") ctx.resume(); var now = performance.now(); if (now - (last[name] || 0) < 45) return; last[name] = now; try { S[name](); } catch(e){} };
  /* mute switch */
  var b = document.createElement("button"); b.type = "button"; b.className = "snd"; b.setAttribute("aria-label", "Sound on or off");
  b.innerHTML = '<span class="snd-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  function paint(){ b.classList.toggle("off", !on); b.setAttribute("aria-pressed", on ? "true" : "false"); b.title = on ? "Sound on" : "Sound off"; }
  b.addEventListener("click", function(){ on = !on; try { localStorage.setItem("og-sound", on ? "on" : "off"); } catch(e){} paint(); if (on) window.ogSfx("click"); });
  var slot = document.querySelector(".nav-r"); if (slot) slot.insertBefore(b, slot.firstChild); paint();
  /* wire the page */
  var hoverSel = ".btn, .links a, .rc, .card, .ft-col a, .lang button";
  document.addEventListener("pointerover", function(e){ var el = e.target.closest && e.target.closest(hoverSel); if (el && !el.contains(e.relatedTarget)) window.ogSfx("tick"); });
  document.addEventListener("click", function(e){ if (e.target.closest && e.target.closest(".btn, .links a, .lang button, .ft-col a")) window.ogSfx("click"); }, true);
})();
