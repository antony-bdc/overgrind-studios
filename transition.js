/* Page transitions between the home page and the game pages */
(function(){
  "use strict";
  var pt = document.querySelector(".pt"); if (!pt || !window.gsap) return;
  var bars = pt.querySelectorAll("i"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var arriving = pt.classList.contains("cover") || sessionStorage.getItem("og-pt") === "1";
  sessionStorage.removeItem("og-pt");
  pt.classList.add("on"); pt.classList.remove("cover");
  if (arriving){
    gsap.set(bars, { yPercent: 0 });
    gsap.to(bars, { yPercent: -100, duration: reduce ? 0 : .9, ease: "expo.inOut", stagger: { each: .08, from: "end" }, delay: .05, onComplete: function(){ pt.classList.remove("on"); } });
  } else { gsap.set(bars, { yPercent: 100 }); pt.classList.remove("on"); }
  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest("a"); if (!a || e.defaultPrevented) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    sessionStorage.setItem("og-pt", "1"); pt.classList.add("on");
    gsap.fromTo(bars, { yPercent: 100 }, { yPercent: 0, duration: reduce ? 0 : .65, ease: "expo.inOut", stagger: .08, onComplete: function(){ location.href = a.href; } });
  });
  addEventListener("pageshow", function(e){ if (e.persisted){ gsap.set(bars, { yPercent: 100 }); pt.classList.remove("on"); } });
})();
