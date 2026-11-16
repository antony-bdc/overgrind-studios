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
    root.lang = l; document.dispatchEvent(new CustomEvent("og-lang", { detail: l }));
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
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 }); window.__lenis = lenis;
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
  var ldBar = loader.querySelector(".ld-foot"), ldRun = loader.querySelector(".ld-run i");
  /* crew lines while loading */
  var QUOTES = [
    ["FreshStatue", "First version? We don't ship that.", "Erste Version? Die veröffentlichen wir nicht."],
    ["Andrin", "Remember the crown.", "Merk dir die Krone."],
    ["Tip", "There are 10 golden studs hidden on this site.", "Auf dieser Seite sind 10 goldene Noppen versteckt."],
    ["FreshStatue", "Statues don't sleep. Neither do we.", "Statuen schlafen nicht. Wir auch nicht."],
    ["Andrin", "Click us. We react.", "Klick uns an. Wir reagieren."],
    ["FreshStatue", "Build your own grinder further down.", "Weiter unten kannst du deinen eigenen Grinder bauen."]
  ], qWho = loader.querySelector(".ld-who"), qTxt = loader.querySelector(".ld-q"), qi = Math.floor(Math.random() * QUOTES.length);
  function showQuote(){ var q = QUOTES[qi % QUOTES.length], de = startLang === "de"; qWho.textContent = q[0] === "Tip" ? (de ? "Tipp" : "Tip") : q[0]; qTxt.textContent = de ? q[2] : q[1]; qi++;
    gsap.fromTo([qWho, qTxt], { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .45, stagger: .05, ease: "power3.out" }); }
  showQuote(); var qTimer = setInterval(showQuote, 1300);
  load.to(".loader .tile i", { scaleX: 1, duration: .7, ease: "power3.inOut" }, 0)
      .to(counter, { v: 100, duration: reduce || seen ? 0 : 1.5, ease: "power1.inOut", onUpdate: function(){ var v = Math.round(counter.v); count.textContent = v; ldBar.style.setProperty("--p", counter.v.toFixed(2)); } }, 0);
  ready.then(function(){
    load.then(function(){
      var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      var fast = reduce || seen, T = fast ? 0 : .45;
      if (!fast){
        loader.classList.add("jump");
        tl.to(ldRun, { y: -70, x: 40, rotation: 12, duration: .32, ease: "power2.out" }, 0)
          .to(ldRun, { y: 260, x: 90, rotation: 40, duration: .45, ease: "power2.in" }, .32)
          .to(".ld-in", { scale: .9, autoAlpha: 0, duration: .4, ease: "power2.in" }, .12);
        gsap.set(".hero .wrap, #hero-gl", { scale: 1.12, transformOrigin: "50% 45%" });
        tl.to(".hero .wrap, #hero-gl", { scale: 1, duration: 1.6, ease: "expo.out", clearProps: "transform" }, T + .15);
      }
      tl.to(loader, { scale: fast ? 1 : 2.4, autoAlpha: 0, duration: fast ? 0 : .7, ease: "expo.in" }, T)
        .set(loader, { display: "none", onComplete: function(){ clearInterval(qTimer); } }, T + (fast ? 0 : .7))
        .add(function(){ if (window.__bricksIntro) window.__bricksIntro(); }, T + .1);
      if (chars) tl.to(chars, { yPercent: 0, duration: 1.1, stagger: .045 }, T + .25);
      tl.to(".mark .bar", { scaleX: 1, duration: .75, ease: "power4.inOut" }, T + .9)
        .to([".eyebrow", ".studios", ".lede", ".hero .cta", ".facts > div", ".scroll-cue"], { autoAlpha: 1, y: 0, duration: 1, stagger: .07 }, "-=.6");
    });
  });

  /* hero scroll-out */
  gsap.to(".mark, .studios", { yPercent: -40, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---------- section colours outside the worlds ---------- */
  [".hero", ".manifesto", ".lineup", ".road", ".devlog", ".studio", ".builder", ".apply", ".join"].forEach(function(sel){
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


  /* ---------- titles, lab, roadmap, ranks, join ---------- */
  if (!reduce){
    // titles rise line by line out of a clean mask
    var splits = [];
    var buildTitles = function(){
      gsap.utils.toArray(".sec-title, .worlds-head h2, .tt-head h3").forEach(function(h){
        if (!window.SplitText){ gsap.from(h, { yPercent: 30, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 85%" } }); return; }
        var st = SplitText.create(h, { type: "lines", mask: "lines", linesClass: "tl" });
        var tw = gsap.from(st.lines, { yPercent: 108, duration: 1.15, stagger: .09, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 86%", once: true } });
        splits.push({ st: st, tw: tw });
      });
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(buildTitles);
    // a language switch rewrites the titles: drop the splits, the new text is simply visible
    document.addEventListener("og-lang", function(){ splits.forEach(function(o){ if (o.tw.scrollTrigger) o.tw.scrollTrigger.kill(); o.tw.kill(); }); splits = []; });
    gsap.to(".steps .rule i", { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".steps", start: "top 75%", end: "bottom 55%", scrub: .6 } });
    gsap.from(".step", { y: 40, autoAlpha: 0, duration: .9, stagger: .15, ease: "power3.out", scrollTrigger: { trigger: ".steps", start: "top 75%" } });
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
  }


  /* ---------- crew cards ---------- */
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
  var form = document.getElementById("apply-form"), stage = document.querySelector(".ap-stage");
  if (stage && "IntersectionObserver" in window){ new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) stage.classList.add("seen"); }); }, { threshold: .35 }).observe(stage); }
  document.querySelectorAll(".pk").forEach(function(p){ p.addEventListener("click", function(){ p.classList.remove("hop"); void p.offsetWidth; p.classList.add("hop"); }); });
  if (form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var f = form.elements, bad = false;
      ["name", "roblox"].forEach(function(n){ var ok = f[n].value.trim().length > 1; f[n].classList.toggle("bad", !ok); if (!ok) bad = true; });
      if (bad){ gsap.fromTo(form, { x: -8 }, { x: 0, duration: .5, ease: "elastic.out(1,.3)" }); stage && (stage.classList.remove("nope"), void stage.offsetWidth, stage.classList.add("nope")); return; }
      stage && stage.classList.add("sent");
      var body = "Name: " + f.name.value.trim() + "\nRoblox: " + f.roblox.value.trim() + "\nRole: " + f.role.value + "\nPortfolio: " + f.link.value.trim() + "\n\n" + f.msg.value.trim();
      location.href = "mailto:overgrindstudios@outlook.com?subject=" + encodeURIComponent("Dev application: " + f.name.value.trim() + " (" + f.role.value + ")") + "&body=" + encodeURIComponent(body);
    });
    if (!reduce) gsap.from(".ap-form > *", { y: 24, autoAlpha: 0, duration: .8, stagger: .05, ease: "power3.out", scrollTrigger: { trigger: ".ap-form", start: "top 80%" } });
  }

  /* re-measure once images settle */
  addEventListener("load", function(){ ScrollTrigger.refresh(); });
  if (window.ResizeObserver){ var t; new ResizeObserver(function(){ clearTimeout(t); t = setTimeout(function(){ ScrollTrigger.refresh(); }, 200); }).observe(document.querySelector("main")); }
})();
