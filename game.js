/* Overgrind game pages: language, smooth scroll and reveals */
(function(){
  "use strict";
  var root = document.documentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  var EN = {}; document.querySelectorAll("[data-i18n]").forEach(function(el){ EN[el.dataset.i18n] = el.innerHTML; });
  var pitch = document.getElementById("pitch"), pitchST = null;
  function buildPitch(text){
    pitch.innerHTML = text.split(" ").map(function(w){ return '<span class="word">' + w + "</span>"; }).join(" ");
    if (!window.gsap) return;
    if (pitchST){ pitchST.scrollTrigger && pitchST.scrollTrigger.kill(); pitchST.kill(); }
    pitchST = gsap.to(pitch.querySelectorAll(".word"), { color: "#F2EFE9", stagger: .1, ease: "none", scrollTrigger: { trigger: pitch, start: "top 80%", end: "bottom 45%", scrub: reduce ? false : .6 } });
  }
  function setLang(l){
    var d = l === "de" ? DE : EN;
    document.querySelectorAll("[data-i18n]").forEach(function(el){
      var v = d[el.dataset.i18n]; if (v == null) v = EN[el.dataset.i18n];
      if (el === pitch) buildPitch(v); else el.innerHTML = v;
    });
    root.lang = l;
    document.querySelectorAll(".lang button").forEach(function(b){ b.classList.toggle("on", b.dataset.lang === l); });
    try { localStorage.setItem("og-lang", l); } catch(e){}
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  document.querySelectorAll(".lang button").forEach(function(b){ b.addEventListener("click", function(){ setLang(b.dataset.lang); }); });
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger); if (window.SplitText) gsap.registerPlugin(SplitText);

  var lenis = null;
  if (!reduce && window.Lenis){ lenis = new Lenis({ lerp: .1 }); lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(function(t){ lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }

  var nav = document.querySelector(".nav"), lastY = 0;
  function onNav(y){ nav.classList.toggle("solid", y > 40); nav.classList.toggle("hide", y > 400 && y > lastY + 2); if (y < lastY - 2) nav.classList.remove("hide"); lastY = y; }
  if (lenis) lenis.on("scroll", function(e){ onNav(e.scroll); }); else addEventListener("scroll", function(){ onNav(scrollY); }, { passive: true });

  var start = "en"; try { start = localStorage.getItem("og-lang") || ((navigator.language || "").slice(0, 2) === "de" ? "de" : "en"); } catch(e){}
  buildPitch(start === "de" && DE["g." + document.body.dataset.key + ".desc"] || pitch.textContent);
  if (start === "de") setLang("de");

  /* hero title: fit the longest line to the width */
  var h1 = document.querySelector(".gp-hero h1");
  function fitTitle(){
    var wrap = h1.parentElement, cs = getComputedStyle(wrap), avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    h1.style.fontSize = "100px"; var w = 0;
    h1.querySelectorAll(".ln > span").forEach(function(s){ s.style.display = "inline-block"; w = Math.max(w, s.getBoundingClientRect().width); });
    h1.style.fontSize = Math.min(170, 100 * avail / w * .98) + "px";
  }
  fitTitle(); addEventListener("resize", fitTitle); if (document.fonts) document.fonts.ready.then(fitTitle);

  /* hero */
  gsap.set(".gp-hero .bgimg", { scale: 1.18 });
  var lines = document.querySelectorAll(".gp-hero h1 .ln > span");
  var tl = gsap.timeline({ delay: .45, defaults: { ease: "expo.out" } });
  tl.to(".gp-hero .bgimg", { scale: 1, duration: 2.4 }, 0)
    .from(lines, { yPercent: 110, duration: 1.2, stagger: .1 }, .1)
    .from(".crumb, .gp-hero .gen, .gp-hero .tg, .gp-hero .row", { y: 30, autoAlpha: 0, duration: 1, stagger: .08 }, .35);
  gsap.to(".gp-hero .bgimg", { yPercent: 14, ease: "none", scrollTrigger: { trigger: ".gp-hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".gp-hero .wrap", { yPercent: -30, autoAlpha: .2, ease: "none", scrollTrigger: { trigger: ".gp-hero", start: "top top", end: "bottom top", scrub: true } });

  if (!reduce){
    gsap.from(".feat", { y: 60, autoAlpha: 0, duration: 1, stagger: .1, ease: "expo.out", scrollTrigger: { trigger: ".feat-grid", start: "top 82%" } });
    gsap.from(".facts-strip > div", { y: 24, autoAlpha: 0, duration: .8, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: ".facts-strip", start: "top 88%" } });
    gsap.utils.toArray(".gal figure").forEach(function(f, i){
      gsap.fromTo(f, { clipPath: "inset(16% 12% 16% 12% round 22px)" }, { clipPath: "inset(0% 0% 0% 0% round 22px)", duration: 1.4, delay: i * .12, ease: "expo.out", scrollTrigger: { trigger: ".gal", start: "top 78%" } });
    });
    gsap.from(".next b", { yPercent: 40, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".next", start: "top 80%" } });
  }

  /* cursor, magnetic buttons, liquid hover */
  if (finePointer && !reduce){
    var cur = document.querySelector(".cur"), dot = cur.querySelector(".dot"), ring = cur.querySelector(".ring");
    var dx = gsap.quickTo(dot, "x", { duration: .08 }), dy = gsap.quickTo(dot, "y", { duration: .08 }), rx = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
    addEventListener("mousemove", function(e){ dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.querySelectorAll("[data-cursor], .next").forEach(function(el){ el.addEventListener("mouseenter", function(){ cur.classList.add("view"); }); el.addEventListener("mouseleave", function(){ cur.classList.remove("view"); }); });
    document.querySelectorAll(".mag").forEach(function(b){
      var bx = gsap.quickTo(b, "x", { duration: .5, ease: "power3" }), by = gsap.quickTo(b, "y", { duration: .5, ease: "power3" });
      b.addEventListener("mousemove", function(e){ var r = b.getBoundingClientRect(); bx((e.clientX - r.left - r.width / 2) * .3); by((e.clientY - r.top - r.height / 2) * .4); });
      b.addEventListener("mouseleave", function(){ bx(0); by(0); });
    });
    var turb = document.getElementById("liquid-t"), disp = document.getElementById("liquid-d"), lq = { s: 0, f: .012 }, lt = null;
    document.querySelectorAll(".gal figure img").forEach(function(img){
      img.parentElement.addEventListener("mouseenter", function(){
        img.style.filter = "url(#liquid)"; if (lt) lt.kill();
        lt = gsap.timeline({ onUpdate: function(){ disp.setAttribute("scale", lq.s); turb.setAttribute("baseFrequency", lq.f + " " + (lq.f * 2.4)); }, onComplete: function(){ img.style.filter = ""; } })
          .fromTo(lq, { s: 0, f: .02 }, { s: 46, f: .008, duration: .35, ease: "power2.out" }).to(lq, { s: 0, f: .012, duration: .9, ease: "expo.out" });
      });
    });
  }
  addEventListener("load", function(){ ScrollTrigger.refresh(); });
})();
