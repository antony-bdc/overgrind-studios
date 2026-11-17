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
  function onScroll(){ nav.classList.toggle("scrolled", scrollY > 30); paintStatement(); peekHide(); }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis){
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    if (window.gsap){ lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(function(t){ lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0); }
    document.querySelectorAll('a[href^="#"]').forEach(function(a){ a.addEventListener("click", function(e){ var t = document.querySelector(a.getAttribute("href")); if (t){ e.preventDefault(); lenis.scrollTo(t, { offset: -70, duration: 1.3 }); } }); });
  }

  /* ---------- reveals ---------- */
  if (window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    if (!reduce){
      gsap.from(".mark .w", { yPercent: 40, autoAlpha: 0, duration: 1.2, ease: "expo.out", delay: .1 });
      gsap.from(".hero-meta > *, .hero-foot > *", { y: 20, autoAlpha: 0, duration: .9, stagger: .06, ease: "power3.out", delay: .35 });
      gsap.utils.toArray(".sec-head").forEach(function(h){
        gsap.from(h.children, { y: 36, autoAlpha: 0, duration: 1, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: h, start: "top 82%" } });
      });
      gsap.from(".card", { y: 70, autoAlpha: 0, duration: 1.1, stagger: .08, ease: "expo.out", scrollTrigger: { trigger: ".cards", start: "top 80%" } });
      gsap.from(".glist li", { y: 30, autoAlpha: 0, duration: .8, stagger: .06, ease: "power3.out", scrollTrigger: { trigger: ".glist", start: "top 82%" } });
      gsap.from(".steps li", { y: 30, autoAlpha: 0, duration: .9, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".steps", start: "top 82%" } });
      gsap.from(".up", { y: 24, autoAlpha: 0, duration: .8, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: ".up-list", start: "top 85%" } });
      gsap.from(".vid", { y: 60, autoAlpha: 0, duration: 1.2, stagger: .12, ease: "expo.out", scrollTrigger: { trigger: ".dl-grid", start: "top 80%" } });
      gsap.from(".ap-form", { y: 50, autoAlpha: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".ap-form", start: "top 85%" } });
      gsap.from(".join h2", { y: 60, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".join", start: "top 75%" } });
    }
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
