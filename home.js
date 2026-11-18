/* Overgrind homepage: language switch, smooth scroll, reveals, game peek, videos and the team application. */
(function(){
  "use strict";
  var doc = document.documentElement; doc.classList.add("js");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- EN / DE ---------- */
  var EN = {};
  document.querySelectorAll("[data-i18n]").forEach(function(el){ EN[el.dataset.i18n] = el.innerHTML; });
  function setLang(l){
    var dict = l === "de" ? (window.DE || {}) : EN;
    document.querySelectorAll("[data-i18n]").forEach(function(el){ var v = dict[el.dataset.i18n]; if (v == null) v = EN[el.dataset.i18n]; if (v != null && el.innerHTML !== v) el.innerHTML = v; });
    doc.lang = l; document.querySelectorAll(".lang button").forEach(function(b){ b.classList.toggle("on", b.dataset.lang === l); });
    try { localStorage.setItem("og-lang", l); } catch(e){}
    splitStatement();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  document.querySelectorAll(".lang button").forEach(function(b){ b.addEventListener("click", function(){ setLang(b.dataset.lang); }); });

  /* ---------- statement: words light up as you read ---------- */
  var st = document.querySelector(".statement > span");
  function splitStatement(){
    if (!st) return;
    var txt = st.textContent; st.innerHTML = txt.split(/(\s+)/).map(function(w){ return /\s+/.test(w) ? w : '<span class="w">' + w + "</span>"; }).join("");
    paintStatement();
  }
  function paintStatement(){
    if (!st) return; var ws = st.querySelectorAll(".w"), r = st.getBoundingClientRect(), vh = innerHeight;
    var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    var n = Math.round(p * ws.length); ws.forEach(function(w, i){ w.classList.toggle("on", reduce || i < n); });
  }

  var start = "en"; try { start = localStorage.getItem("og-lang") || ((navigator.language || "").slice(0, 2) === "de" ? "de" : "en"); } catch(e){}
  setLang(start);

  /* ---------- nav ---------- */
  var nav = document.querySelector(".nav");
  var prog = document.querySelector(".progress"), ftm = document.querySelector(".ft-mark span");
  function onScroll(){ nav.classList.toggle("scrolled", scrollY > 30); paintStatement(); peekHide(); var mx = document.documentElement.scrollHeight - innerHeight; if (prog) prog.style.setProperty("--sp", mx > 0 ? (scrollY / mx).toFixed(4) : 0); if (ftm){ var r = ftm.getBoundingClientRect(); ftm.style.setProperty("--fx", Math.max(0, Math.min(100, (r.top / innerHeight) * 140)) + "%"); } }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis){
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    if (window.gsap){ lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(function(t){ lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0); }
    document.querySelectorAll('a[href^="#"]').forEach(function(a){ a.addEventListener("click", function(e){ var t = document.querySelector(a.getAttribute("href")); if (t){ e.preventDefault(); lenis.scrollTo(t, { offset: -70, duration: 1.3 }); } }); });
  }

  /* ---------- intro: the brick wall in the crew colours drops away once per visit ---------- */
  function introDelay(){
    var el = document.querySelector(".intro"), go; window.ogIntro = new Promise(function(r){ go = r; });
    addEventListener("og:intro-done", function(){ go(); }); setTimeout(function(){ go(); var it = document.querySelector(".intro"); if (it && !it.classList.contains("done")) it.classList.add("done"); }, 7000);
    if (!el){ go(); return .1; }
    var seen = false; try { seen = sessionStorage.getItem("og-intro") === "1"; sessionStorage.setItem("og-intro", "1"); } catch(e){}
    if (seen || reduce || !window.gsap){ el.classList.add("done"); return .1; }
    window.__ogIntro3d = true; return 2.15;
  }

  /* ---------- motion pass: reel, tilt, roadmap line, shutters, magnetic buttons, ticker speed ---------- */
  function motionPass(){
    var mm = gsap.matchMedia();
    /* the seven games on a 3D ring: scroll turns the carousel, the front game is lit */
    mm.add("(min-width: 901px)", function(){
      var track = document.querySelector(".reel-track"), cards = gsap.utils.toArray(".rc"), cnt = document.querySelector(".reel-count b"), bar = document.querySelector(".reel-bar"), reelEl = document.querySelector(".reel");
      if (!track) return;
      var N = cards.length, step = 360 / N, R = 0, ring = { a: 0 };
      reelEl.classList.add("ring");
      function place(){ var w = cards[0].offsetWidth; R = (w / 2) / Math.tan(Math.PI / N) + 40;
        cards.forEach(function(c, i){ c.style.transform = "rotateY(" + (i * step) + "deg) translateZ(" + R + "px)"; }); paint(); }
      function paint(){ track.style.transform = "translateZ(" + (-R) + "px) rotateY(" + (-ring.a) + "deg)";
        var f = ((ring.a % 360) + 360) % 360 / step, i = Math.round(f) % N;
        cards.forEach(function(c, j){ var d = Math.abs(((j - f) % N + N + N / 2) % N - N / 2); c.style.setProperty("--d", Math.min(1, d).toFixed(3)); c.classList.toggle("front", j === i); });
        var s = String(i + 1).padStart(2, "0"); if (cnt.textContent !== s){ cnt.textContent = s; reelEl.style.setProperty("--glow", getComputedStyle(cards[i]).getPropertyValue("--a")); window.ogSfx && window.ogSfx("lock"); } }
      place(); addEventListener("resize", place);
      var st = ScrollTrigger.create({ trigger: ".reel", start: "top top", end: function(){ return "+=" + innerHeight * 4.2; }, pin: ".reel-pin", scrub: 1.2, anticipatePin: 1,
        onUpdate: function(self){ bar.style.setProperty("--p", self.progress.toFixed(4)); gsap.to(ring, { a: self.progress * step * (N - 1), duration: .5, ease: "power3", overwrite: true, onUpdate: paint }); } });
      /* liquid hover on the key art */
      var disp = document.querySelector("#og-liquid feDisplacementMap"), lq = { s: 0 };
      cards.forEach(function(c){ var img = c.querySelector(".rc-img");
        c.addEventListener("pointerenter", function(){ if (!disp) return; img.style.filter = "url(#og-liquid)"; gsap.fromTo(lq, { s: 60 }, { s: 0, duration: 1.1, ease: "power3.out", onUpdate: function(){ disp.setAttribute("scale", lq.s.toFixed(1)); }, onComplete: function(){ img.style.filter = ""; } }); }); });
      gsap.from(".reel-track", { y: 80, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".reel", start: "top 80%" } });
      return function(){ reelEl.classList.remove("ring"); track.style.transform = ""; cards.forEach(function(c){ c.style.transform = ""; }); removeEventListener("resize", place); };
    });
    /* crew cards: tilt towards the pointer with a soft glare */
    if (matchMedia("(hover: hover)").matches) document.querySelectorAll(".card:not(.you)").forEach(function(c){
      var g = document.createElement("i"); g.className = "glare"; c.appendChild(g);
      var rx = gsap.quickTo(c, "rotationX", { duration: .6, ease: "power3" }), ry = gsap.quickTo(c, "rotationY", { duration: .6, ease: "power3" });
      gsap.set(c, { transformPerspective: 900 });
      c.addEventListener("pointermove", function(e){ var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; ry((x - .5) * 12); rx((.5 - y) * 10); c.style.setProperty("--gx", x * 100 + "%"); c.style.setProperty("--gy", y * 100 + "%"); });
      c.addEventListener("pointerleave", function(){ rx(0); ry(0); });
    });
    /* roadmap: the line is drawn as you scroll and every stop lights up */
    var steps = document.querySelector(".steps");
    if (steps){ var ln = document.createElement("span"); ln.className = "s-line"; steps.appendChild(ln); var lis = steps.querySelectorAll("li");
      ScrollTrigger.create({ trigger: steps, start: "top 80%", end: "bottom 55%", scrub: .6, onUpdate: function(self){ ln.style.setProperty("--p", self.progress); lis.forEach(function(li, i){ li.classList.toggle("lit", self.progress >= i / lis.length); }); } });
      ln.style.setProperty("--p", 0); }
    /* videos open like a shutter */
    gsap.utils.toArray(".vid").forEach(function(v){ gsap.fromTo(v, { "--ci": "14%" }, { "--ci": "0%", ease: "none", scrollTrigger: { trigger: v, start: "top 95%", end: "top 45%", scrub: .5 } }); });
    /* ticker: leans and speeds up with your scroll */
    var tk = document.querySelector(".tk"), tkx = { sk: 0 };
    if (tk) ScrollTrigger.create({ onUpdate: function(self){ var v = gsap.utils.clamp(-14, 14, self.getVelocity() / 260); gsap.to(tkx, { sk: v, duration: .5, ease: "power3", overwrite: true, onUpdate: function(){ tk.parentNode.style.setProperty("--sk", -tkx.sk + "deg"); } }); } });
    /* magnetic buttons */
    if (matchMedia("(hover: hover)").matches) document.querySelectorAll(".btn, .rc-go").forEach(function(b){
      var qx = gsap.quickTo(b, "x", { duration: .5, ease: "power3" }), qy = gsap.quickTo(b, "y", { duration: .5, ease: "power3" });
      b.addEventListener("pointermove", function(e){ var r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .25); qy((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener("pointerleave", function(){ qx(0); qy(0); });
    });
  }

  /* ---------- reveals ---------- */
  if (window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    if (!reduce){ var D0 = introDelay(); (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function(){
      /* hero wordmark: letters rise out of the floor one after another */
      var markW = document.querySelector(".mark .w");
      if (window.SplitText && markW){ var ms = SplitText.create(markW, { type: "chars", charsClass: "og-c" });
        gsap.from(ms.chars, { yPercent: 105, rotateX: -70, autoAlpha: 0, transformOrigin: "50% 100%", duration: 1.1, stagger: .045, ease: "expo.out", delay: D0 }); }
      else gsap.from(".mark .w", { yPercent: 40, autoAlpha: 0, duration: 1.2, ease: "expo.out", delay: D0 });
      gsap.from(".stage", { y: 80, autoAlpha: 0, duration: 1.4, ease: "expo.out", delay: D0 + .25 });
      gsap.from(".hero-meta > *, .hero-foot > *", { y: 20, autoAlpha: 0, duration: .9, stagger: .06, ease: "power3.out", delay: D0 + .45 });
      document.querySelectorAll(".facts dd").forEach(function(dd){ var n = +dd.textContent, o = { v: 0 }; if (!n) return; dd.textContent = "0"; gsap.to(o, { v: n, duration: 1.6, ease: "power2.out", delay: D0 + .7, onUpdate: function(){ dd.textContent = Math.round(o.v); } }); });
      /* scroll: the wordmark sinks back, the crew stays in front */
      /* scroll: the wordmark breaks apart letter by letter, like bricks knocked off a wall */
      var chars = document.querySelectorAll(".mark .og-c");
      if (chars.length){ gsap.set(".mark", { perspective: 900 });
        gsap.to(chars, { x: function(i){ return (i - 4) * 38 + gsap.utils.random(-60, 60); }, y: function(){ return gsap.utils.random(-160, 120); }, z: function(){ return gsap.utils.random(-300, 260); }, rotationX: function(){ return gsap.utils.random(-120, 120); }, rotationY: function(){ return gsap.utils.random(-140, 140); }, rotationZ: function(){ return gsap.utils.random(-50, 50); }, ease: "power1.in", stagger: { each: .02, from: "center" }, scrollTrigger: { trigger: ".hero", start: "top top", end: "70% top", scrub: .6 } });
        gsap.to(".mark", { autoAlpha: 0, ease: "power2.in", scrollTrigger: { trigger: ".hero", start: "35% top", end: "75% top", scrub: true } }); }
      else gsap.to(".mark", { yPercent: 18, scale: .86, autoAlpha: .12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".stage", { yPercent: -8, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.utils.toArray(".sec-head").forEach(function(h){ gsap.fromTo(h, { "--hl": 0 }, { "--hl": 1, duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: h, start: "top 88%" } });
        gsap.from(h.querySelectorAll(":scope > :not(.h2)"), { y: 36, autoAlpha: 0, duration: 1, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: h, start: "top 82%" } });
      });
      /* headlines: every word rises out of its own mask */
      if (window.SplitText) gsap.utils.toArray(".h2, .join h2").forEach(function(h){
        var s = SplitText.create(h, { type: "words", mask: "words", wordsClass: "og-w" });
        gsap.from(s.words, { yPercent: 115, rotate: 4, duration: 1.15, stagger: .07, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 85%" } });
      });
      gsap.from(".card", { y: 70, autoAlpha: 0, duration: 1.1, stagger: .08, ease: "expo.out", scrollTrigger: { trigger: ".cards", start: "top 80%" } });
      gsap.from(".steps li", { y: 30, autoAlpha: 0, duration: .9, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".steps", start: "top 82%" } });
      gsap.from(".up", { y: 24, autoAlpha: 0, duration: .8, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: ".up-list", start: "top 85%" } });
      gsap.from(".vid", { y: 60, autoAlpha: 0, duration: 1.2, stagger: .12, ease: "expo.out", scrollTrigger: { trigger: ".dl-grid", start: "top 80%" } });
      gsap.from(".ap-form", { y: 50, autoAlpha: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".ap-form", start: "top 85%" } });
      motionPass();
      // the gear logo turns as you scroll into the last section, like it drives the page
    ScrollTrigger.refresh(); }); }
    addEventListener("load", function(){ ScrollTrigger.refresh(); });
    if (window.ResizeObserver){ var rt; new ResizeObserver(function(){ clearTimeout(rt); rt = setTimeout(function(){ ScrollTrigger.refresh(); }, 200); }).observe(document.querySelector("main")); }
  }

  /* ---------- game rows: key art follows the cursor ---------- */
  var peek = document.querySelector(".gpeek"), pimg = peek && peek.querySelector("img"), px = 0, py = 0, tx = 0, ty = 0, live = false;
  function peekHide(){ if (peek && live && !document.querySelector(".grow:hover")){ peek.classList.remove("on"); live = false; } }
  if (peek && matchMedia("(hover: hover)").matches){
    document.querySelectorAll(".grow").forEach(function(a){
      a.addEventListener("mouseenter", function(){ if (pimg.getAttribute("src") !== a.dataset.img) pimg.src = a.dataset.img; peek.classList.add("on"); live = true; });
      a.addEventListener("mouseleave", function(){ peek.classList.remove("on"); live = false; });
    });
    addEventListener("mousemove", function(e){ tx = e.clientX + 28; ty = e.clientY - 120; }, { passive: true });
    (function loop(){ px += (tx - px) * .16; py += (ty - py) * .16; var w = peek.offsetWidth; peek.style.transform = "translate(" + Math.min(px, innerWidth - w - 16) + "px," + py + "px) rotate(" + ((tx - px) * .02) + "deg)"; requestAnimationFrame(loop); })();
  }

  /* ---------- videos ---------- */
  document.querySelectorAll(".vid").forEach(function(fig){
    var v = fig.querySelector("video"), b = fig.querySelector(".play");
    b.addEventListener("click", function(){ document.querySelectorAll(".vid video").forEach(function(o){ if (o !== v) o.pause(); }); v.controls = true; v.play(); });
    v.addEventListener("play", function(){ fig.classList.add("playing"); });
    v.addEventListener("ended", function(){ fig.classList.remove("playing"); v.controls = false; });
  });

  /* ---------- team application (mailto, nothing stored) ---------- */
  var form = document.getElementById("apply-form");
  if (form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var f = form.elements, bad = false;
      ["name", "roblox"].forEach(function(n){ var ok = f[n].value.trim().length > 1; f[n].classList.toggle("bad", !ok); if (!ok) bad = true; });
      if (bad){ if (window.gsap) gsap.fromTo(form, { x: -8 }, { x: 0, duration: .5, ease: "elastic.out(1,.3)" }); return; }
      var body = "Name: " + f.name.value.trim() + "\nRoblox: " + f.roblox.value.trim() + "\nRole: " + f.role.value + "\nPortfolio: " + f.link.value.trim() + "\n\n" + f.msg.value.trim();
      location.href = "mailto:overgrindstudios@outlook.com?subject=" + encodeURIComponent("Dev application: " + f.name.value.trim() + " (" + f.role.value + ")") + "&body=" + encodeURIComponent(body);
    });
  }
})();
