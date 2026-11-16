/* Overgrind Studios: motion + language */
(function(){
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var INK = "#0B0B0D", EMBER = "#FF4D1A";

  /* ---------- language ---------- */
  var EN = {};
  document.querySelectorAll("[data-i18n]").forEach(function(el){ EN[el.dataset.i18n] = el.innerHTML; });
  function setLang(l){
    var dict = l === "de" ? DE : EN;
    document.querySelectorAll("[data-i18n]").forEach(function(el){
      var v = dict[el.dataset.i18n]; if (v == null) v = EN[el.dataset.i18n];
      if (el.id === "mani" && window.__mani) { window.__mani(v); return; }
      el.innerHTML = v;
    });
    root.lang = l;
    document.querySelectorAll(".lang button").forEach(function(b){ b.classList.toggle("on", b.dataset.lang === l); });
    try { localStorage.setItem("og-lang", l); } catch(e){}
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  document.querySelectorAll(".lang button").forEach(function(b){ b.addEventListener("click", function(){ setLang(b.dataset.lang); }); });

  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap){ document.querySelector(".loader").remove(); return; }
  gsap.registerPlugin(ScrollTrigger); if (window.SplitText) gsap.registerPlugin(SplitText);

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis){
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener("click", function(e){
      var id = a.getAttribute("href"); if (id.length < 2) return;
      var t = document.querySelector(id); if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { offset: -10, duration: 1.4 }); else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------- world colours ---------- */
  var current = "";
  function world(bg, accent){
    if (current === bg) return; current = bg;
    gsap.to(root, { "--bg": bg, "--accent": accent || EMBER, duration: reduce ? 0 : 0.9, ease: "power2.out", overwrite: "auto" });
  }

  /* ---------- nav ---------- */
  var nav = document.querySelector(".nav"), lastY = 0;
  function onScrollNav(y){
    nav.classList.toggle("solid", y > 40);
    nav.classList.toggle("hide", y > 400 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove("hide");
    lastY = y;
  }
  if (lenis) lenis.on("scroll", function(e){ onScrollNav(e.scroll); }); else window.addEventListener("scroll", function(){ onScrollNav(scrollY); }, { passive: true });

  /* ---------- sparks ---------- */
  var cv = document.getElementById("sparks"), cx = cv.getContext("2d"), parts = [], dpr = Math.min(2, devicePixelRatio || 1);
  function size(){ var r = cv.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; }
  size(); addEventListener("resize", size);
  function burst(x, y, n, dir, spread, speed){
    for (var i = 0; i < n; i++){
      var a = dir + (Math.random() - .5) * spread, v = speed * (.35 + Math.random() * .9);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .5 + Math.random() * .8, age: 0, w: 1 + Math.random() * 2.2 });
    }
  }
  var lastT = performance.now();
  gsap.ticker.add(function(){
    var now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    if (!parts.length){ cx.clearRect(0, 0, cv.width, cv.height); return; }
    cx.clearRect(0, 0, cv.width, cv.height); cx.lineCap = "round";
    for (var i = parts.length - 1; i >= 0; i--){
      var p = parts[i]; p.age += dt; if (p.age > p.life){ parts.splice(i, 1); continue; }
      p.vy += 1500 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt;
      var k = 1 - p.age / p.life;
      cx.strokeStyle = "rgba(255," + (150 + 100 * k | 0) + "," + (60 * k | 0) + "," + k + ")";
      cx.lineWidth = p.w * dpr; cx.beginPath(); cx.moveTo(p.x * dpr, p.y * dpr); cx.lineTo((p.x - p.vx * .022) * dpr, (p.y - p.vy * .022) * dpr); cx.stroke();
    }
  });
  function barEnd(){
    var b = document.querySelector(".mark .bar").getBoundingClientRect(), h = cv.getBoundingClientRect();
    return { x: Math.min(b.right, innerWidth - 10) - h.left, y: b.top + b.height * .2 - h.top + (b.right - Math.min(b.right, innerWidth - 10)) * Math.tan(-4 * Math.PI / 180) };
  }

  /* ---------- manifesto words ---------- */
  var mani = document.getElementById("mani"), maniTween = null;
  function buildMani(text){
    var hot = /grind|Grind/;
    mani.innerHTML = text.split(" ").map(function(w){ return '<span class="word' + (hot.test(w) ? " hot-w" : "") + '">' + w + "</span>"; }).join(" ");
    if (maniTween) { maniTween.scrollTrigger && maniTween.scrollTrigger.kill(); maniTween.kill(); }
    var words = mani.querySelectorAll(".word");
    maniTween = gsap.to(words, { color: function(i, el){ return el.classList.contains("hot-w") ? EMBER : "#F2EFE9"; }, stagger: .1, ease: "none",
      scrollTrigger: { trigger: mani, start: "top 80%", end: "bottom 40%", scrub: reduce ? false : .6 } });
  }
  window.__mani = buildMani;

  /* ---------- language from storage ---------- */
  var startLang = "en"; try { startLang = localStorage.getItem("og-lang") || (navigator.language || "").slice(0, 2) === "de" && "de" || "en"; } catch(e){}
  buildMani(startLang === "de" ? DE["m.t"] : EN["m.t"]);
  if (startLang === "de") setLang("de");

  /* ---------- loader + hero intro ---------- */
  var loader = document.querySelector(".loader"), count = loader.querySelector(".count");
  var mark = document.querySelector(".mark .w"), markBox = document.querySelector(".mark"), chars = null;
  function fitMark(){
    var wrap = markBox.parentElement, cs = getComputedStyle(wrap);
    var avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    markBox.style.fontSize = "100px"; var w = mark.getBoundingClientRect().width;
    markBox.style.fontSize = Math.min(240, 100 * avail / w * 0.995) + "px";
  }
  fitMark(); addEventListener("resize", fitMark); if (document.fonts) document.fonts.ready.then(fitMark);
  if (window.SplitText && !reduce){ chars = new SplitText(mark, { type: "chars" }).chars; gsap.set(chars, { yPercent: 115 }); }
  gsap.set([".eyebrow", ".studios", ".lede", ".hero .cta", ".facts > div", ".scroll-cue"], { autoAlpha: 0, y: 24 });

  var seen = false; try { seen = sessionStorage.getItem("og-seen") === "1"; sessionStorage.setItem("og-seen", "1"); } catch(e){}
  if (seen){ loader.style.display = "none"; }
  var ready = Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function(r){ setTimeout(r, reduce || seen ? 0 : 900); })]);
  var counter = { v: 0 };
  var load = gsap.timeline();
  load.to(".loader .tile i", { scaleX: 1, duration: .7, ease: "power3.inOut" }, 0)
      .to(counter, { v: 100, duration: reduce || seen ? 0 : 1.1, ease: "power2.inOut", onUpdate: function(){ count.textContent = Math.round(counter.v); } }, 0);
  ready.then(function(){
    load.then(function(){
      var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(loader, { clipPath: "inset(0 0 100% 0)", duration: reduce || seen ? 0 : 1, ease: "expo.inOut" })
        .set(loader, { display: "none" })
        .add(function(){ if (window.__bricksIntro) window.__bricksIntro(); }, "-=.6");
      if (chars) tl.to(chars, { yPercent: 0, duration: 1.1, stagger: .045 }, "-=1.8");
      tl.to(".mark .bar", { scaleX: 1, duration: .75, ease: "power4.inOut", onComplete: function(){ var e = barEnd(); burst(e.x, e.y, 70, -Math.PI * .3, 2.4, 1500); } }, "-=.55")
        .to([".eyebrow", ".studios", ".lede", ".hero .cta", ".facts > div", ".scroll-cue"], { autoAlpha: 1, y: 0, duration: 1, stagger: .07 }, "-=.6");
    });
  });
  loader.style.clipPath = "inset(0 0 0 0)";

  /* hero scroll-out */
  gsap.to(".mark, .studios", { yPercent: -40, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---------- marquee ---------- */
  var track = document.querySelector(".marquee .track"), half = 0, mxPos = 0, dir = -1;
  function measure(){ half = track.scrollWidth / 2; }
  measure(); addEventListener("resize", measure);
  gsap.ticker.add(function(){
    var vel = lenis ? lenis.velocity : 0; if (vel > .5) dir = -1; else if (vel < -.5) dir = 1;
    mxPos += (dir * (reduce ? 0 : 1.1) - vel * .45 * (reduce ? 0 : 1));
    if (mxPos <= -half) mxPos += half; if (mxPos > 0) mxPos -= half;
    track.style.transform = "translate3d(" + mxPos + "px,0,0) skewX(" + gsap.utils.clamp(-10, 10, -vel * .35) + "deg)";
  });

  /* ---------- section colours outside the worlds ---------- */
  [".hero", ".manifesto", ".lab", ".road", ".studio", ".join", ".dives > .wrap"].forEach(function(sel){
    var el = document.querySelector(sel); if (!el) return;
    ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 45%", onEnter: function(){ world(INK); }, onEnterBack: function(){ world(INK); } });
  });

  /* ---------- worlds rail ---------- */
  var mm = gsap.matchMedia();
  mm.add("(min-width: 861px)", function(){
    var rail = document.querySelector(".rail"), sec = document.querySelector(".worlds");
    var dist = function(){ return rail.scrollWidth - innerWidth; };
    var tween = gsap.to(rail, { x: function(){ return -dist(); }, ease: "none",
      scrollTrigger: { trigger: sec, start: "top top", end: function(){ return "+=" + dist(); }, pin: true, scrub: reduce ? true : .8, invalidateOnRefresh: true, anticipatePin: 1 } });
    gsap.utils.toArray(".panel").forEach(function(p){
      gsap.fromTo(p.querySelector("img"), { xPercent: -7 }, { xPercent: 7, ease: "none", scrollTrigger: { trigger: p, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
      gsap.from(p.querySelectorAll(".meta > div > *"), { y: 40, autoAlpha: 0, stagger: .06, ease: "power3.out", duration: .9, scrollTrigger: { trigger: p, containerAnimation: tween, start: "left 75%" } });
      ScrollTrigger.create({ trigger: p, containerAnimation: tween, start: "left 55%", end: "right 45%",
        onEnter: function(){ world(p.dataset.bg, p.dataset.accent); }, onEnterBack: function(){ world(p.dataset.bg, p.dataset.accent); } });
    });
    ScrollTrigger.create({ trigger: sec, start: "top 60%", onEnter: function(){ var p = document.querySelector(".panel"); world(p.dataset.bg, p.dataset.accent); }, onLeaveBack: function(){ world(INK); } });
  });
  mm.add("(max-width: 860px)", function(){
    gsap.utils.toArray(".panel").forEach(function(p){
      ScrollTrigger.create({ trigger: p, start: "top 60%", end: "bottom 40%", onEnter: function(){ world(p.dataset.bg, p.dataset.accent); }, onEnterBack: function(){ world(p.dataset.bg, p.dataset.accent); } });
      gsap.from(p, { y: 60, autoAlpha: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: p, start: "top 88%" } });
    });
  });

  /* ---------- deep dives ---------- */
  gsap.utils.toArray(".dive").forEach(function(d){
    ScrollTrigger.create({ trigger: d, start: "top 55%", end: "bottom 45%",
      onEnter: function(){ world(d.dataset.bg, d.dataset.accent); }, onEnterBack: function(){ world(d.dataset.bg, d.dataset.accent); } });
    if (reduce) return;
    var art = d.querySelector(".art"), img = art.querySelector("img");
    var tl = gsap.timeline({ scrollTrigger: { trigger: d, start: "top 72%" } });
    tl.fromTo(art, { clipPath: "inset(14% 10% 14% 10% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 24px)", duration: 1.4, ease: "expo.out" })
      .from(img, { scale: 1.3, duration: 1.8, ease: "expo.out" }, 0)
      .from(d.querySelectorAll(".idx, h3 .ln, .tag, .desc"), { yPercent: 60, autoAlpha: 0, duration: 1, stagger: .08, ease: "power4.out" }, .1)
      .from(d.querySelectorAll("li"), { x: -24, autoAlpha: 0, duration: .7, stagger: .07, ease: "power3.out" }, .4)
      .from(d.querySelectorAll(".fx > div"), { y: 20, autoAlpha: 0, duration: .7, stagger: .08, ease: "power3.out" }, .6);
    gsap.to(img, { yPercent: 8, ease: "none", scrollTrigger: { trigger: d, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- titles, lab, roadmap, ranks, join ---------- */
  if (!reduce){
    gsap.utils.toArray(".sec-title, .worlds-head h2").forEach(function(h){
      gsap.from(h, { yPercent: 30, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 85%" } });
    });
    gsap.from(".lab-card", { y: 50, autoAlpha: 0, rotate: function(i){ return i ? 2 : -2; }, duration: 1, stagger: .12, ease: "expo.out", scrollTrigger: { trigger: ".lab-grid", start: "top 80%" } });
    gsap.to(".steps .rule i", { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 75%", end: "bottom 55%", scrub: .6 } });
    gsap.from(".step", { y: 40, autoAlpha: 0, duration: .9, stagger: .15, ease: "power3.out", scrollTrigger: { trigger: ".steps", start: "top 75%" } });
    gsap.from(".ledger .row", { x: 40, autoAlpha: 0, duration: .8, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".ledger", start: "top 80%" } });
    document.querySelectorAll(".rank[data-count]").forEach(function(r){
      var o = { v: 0 }, end = +r.dataset.count;
      gsap.to(o, { v: end, duration: 1.6, ease: "power3.out", scrollTrigger: { trigger: r, start: "top 85%" }, onUpdate: function(){ r.textContent = Math.round(o.v); } });
    });
    gsap.from(".join h2 > span", { yPercent: 100, autoAlpha: 0, duration: 1.3, stagger: .12, ease: "expo.out", scrollTrigger: { trigger: ".join", start: "top 70%" } });
    gsap.from(".join p, .join .cta", { y: 30, autoAlpha: 0, duration: 1, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".join", start: "top 60%" } });
    gsap.to(".join .glow", { scale: 1.25, ease: "none", scrollTrigger: { trigger: ".join", start: "top bottom", end: "bottom bottom", scrub: true } });
  }

  /* ---------- cursor + magnetic buttons ---------- */
  if (finePointer && !reduce){
    var cur = document.querySelector(".cur"), dot = cur.querySelector(".dot"), ring = cur.querySelector(".ring");
    var dx = gsap.quickTo(dot, "x", { duration: .08 }), dy = gsap.quickTo(dot, "y", { duration: .08 });
    var rx = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
    addEventListener("mousemove", function(e){ dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.querySelectorAll("[data-cursor]").forEach(function(el){
      el.addEventListener("mouseenter", function(){ cur.classList.add("view"); });
      el.addEventListener("mouseleave", function(){ cur.classList.remove("view"); });
    });
    document.querySelectorAll(".mag").forEach(function(b){
      var bx = gsap.quickTo(b, "x", { duration: .5, ease: "power3" }), by = gsap.quickTo(b, "y", { duration: .5, ease: "power3" });
      b.addEventListener("mousemove", function(e){ var r = b.getBoundingClientRect(); bx((e.clientX - r.left - r.width / 2) * .3); by((e.clientY - r.top - r.height / 2) * .4); });
      b.addEventListener("mouseleave", function(){ bx(0); by(0); });
    });
    var hero = document.querySelector(".hero"), lastBurst = 0;
    hero.addEventListener("mousemove", function(e){
      var b = document.querySelector(".mark .bar").getBoundingClientRect(), h = cv.getBoundingClientRect();
      if (Math.abs(e.clientY - (b.top + b.height / 2)) < 60 && performance.now() - lastBurst > 60){ lastBurst = performance.now(); burst(e.clientX - h.left, e.clientY - h.top, 6, -Math.PI / 2, 2.2, 700); }
    });
  }


  /* ---------- liquid hover on game art ---------- */
  var turb = document.getElementById("liquid-t"), disp = document.getElementById("liquid-d");
  if (finePointer && !reduce && turb){
    var lq = { s: 0, f: .012 }, lqTween = null;
    function lqApply(){ disp.setAttribute("scale", lq.s); turb.setAttribute("baseFrequency", lq.f + " " + (lq.f * 2.4)); }
    document.querySelectorAll(".panel img, .art img").forEach(function(img){
      var host = img.closest(".panel, .art");
      host.addEventListener("mouseenter", function(){
        img.style.filter = "url(#liquid)";
        if (lqTween) lqTween.kill();
        lqTween = gsap.timeline({ onUpdate: lqApply, onComplete: function(){ img.style.filter = ""; } })
          .fromTo(lq, { s: 0, f: .02 }, { s: 46, f: .008, duration: .35, ease: "power2.out" })
          .to(lq, { s: 0, f: .012, duration: .9, ease: "expo.out" });
        gsap.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 1.2, ease: "expo.out", overwrite: "auto" });
      });
    });
  }

  /* ---------- crew cards ---------- */
  if (!reduce){
    gsap.from(".member", { y: 60, autoAlpha: 0, rotateX: -12, duration: 1.1, stagger: .1, ease: "expo.out", scrollTrigger: { trigger: ".crew", start: "top 82%" } });
    gsap.from(".crew-title", { y: 30, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".crew-title", start: "top 85%" } });
  }
  if (finePointer && !reduce){
    document.querySelectorAll("[data-tilt]").forEach(function(c){
      var rx = gsap.quickTo(c, "rotationX", { duration: .6, ease: "power3" }), ry = gsap.quickTo(c, "rotationY", { duration: .6, ease: "power3" });
      c.addEventListener("mousemove", function(e){ var r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 16); rx(-((e.clientY - r.top) / r.height - .5) * 16); });
      c.addEventListener("mouseleave", function(){ rx(0); ry(0); });
    });
  }


  /* ---------- video players ---------- */
  document.querySelectorAll(".vplayer").forEach(function(fig){
    var vid = fig.querySelector("video"), btn = fig.querySelector(".dl-play"); if (!vid || !btn) return;
    vid.removeAttribute("controls");
    btn.addEventListener("click", function(){ document.querySelectorAll(".vplayer video").forEach(function(o){ if (o !== vid) o.pause(); }); vid.controls = true; vid.play(); });
    vid.addEventListener("play", function(){ fig.classList.add("playing"); });
    vid.addEventListener("ended", function(){ fig.classList.remove("playing"); vid.controls = false; });
  });
  if (!reduce){
    var dv = document.querySelector(".dl-video"); if (dv) gsap.from(dv, { y: 80, rotate: -3, autoAlpha: 0, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: ".devlog", start: "top 70%" } });
    var wv = document.querySelector(".vplayer.wide"); if (wv) gsap.fromTo(wv, { clipPath: "inset(12% 10% 12% 10% round 26px)" }, { clipPath: "inset(0% 0% 0% 0% round 26px)", duration: 1.5, ease: "expo.out", scrollTrigger: { trigger: wv, start: "top 80%" } });
  }

  /* ---------- team application (mailto, nothing stored) ---------- */
  var form = document.getElementById("apply-form");
  if (form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var f = form.elements, bad = false;
      ["name", "roblox"].forEach(function(n){ var ok = f[n].value.trim().length > 1; f[n].classList.toggle("bad", !ok); if (!ok) bad = true; });
      if (bad){ gsap.fromTo(form, { x: -8 }, { x: 0, duration: .5, ease: "elastic.out(1,.3)" }); return; }
      var body = "Name: " + f.name.value.trim() + "\nRoblox: " + f.roblox.value.trim() + "\nRole: " + f.role.value + "\nPortfolio: " + f.link.value.trim() + "\n\n" + f.msg.value.trim();
      location.href = "mailto:overgrindstudios@outlook.com?subject=" + encodeURIComponent("Dev application: " + f.name.value.trim() + " (" + f.role.value + ")") + "&body=" + encodeURIComponent(body);
    });
    if (!reduce) gsap.from(".ap-form > *", { y: 24, autoAlpha: 0, duration: .8, stagger: .05, ease: "power3.out", scrollTrigger: { trigger: ".ap-form", start: "top 80%" } });
  }

  /* re-measure once images settle */
  addEventListener("load", function(){ ScrollTrigger.refresh(); measure(); });
  if (window.ResizeObserver){ var t; new ResizeObserver(function(){ clearTimeout(t); t = setTimeout(function(){ ScrollTrigger.refresh(); }, 200); }).observe(document.querySelector("main")); }
})();
