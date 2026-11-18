/* Overgrind portal transitions: the page breaks into studded bricks in the colour of where you're going,
   and the next page builds itself back out of them. Works between the home page and every game page. */
(function(){
  "use strict";
  if (!window.gsap) return;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, CREW = ["#E2202E", "#E8A400", "#2450FF", "#7B45F5"];
  var el = document.createElement("div"); el.className = "portal"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el);
  var grid = null;
  function build(color){
    var cols = innerWidth < 700 ? 6 : 12, size = innerWidth / cols, rows = Math.ceil(innerHeight / size), html = "";
    el.style.gridTemplateColumns = "repeat(" + cols + ",1fr)"; el.style.gridAutoRows = size + "px";
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++){ var c = color ? color : CREW[(i * 7 + j * 3) % 4], dark = color && (i + j) % 2;
      html += '<b style="--c:' + c + '"' + (dark ? ' class="dk"' : "") + "></b>"; }
    el.innerHTML = html; grid = { cols: cols, rows: rows, size: size, cells: el.children }; return grid;
  }
  function cellAt(x, y){ return Math.min(grid.rows - 1, Math.floor(y / grid.size)) * grid.cols + Math.min(grid.cols - 1, Math.floor(x / grid.size)); }
  /* arriving */
  var arr = null; try { arr = JSON.parse(sessionStorage.getItem("og-portal") || "null"); sessionStorage.removeItem("og-portal"); } catch(e){}
  if (arr && !reduce){
    build(arr.c); el.classList.add("on"); gsap.set(grid.cells, { scale: 1.02, rotationY: 0 });
    gsap.to(grid.cells, { scale: 0, rotationY: 90, duration: .5, ease: "power3.in", delay: .12, stagger: { grid: [grid.rows, grid.cols], from: "center", amount: .45 }, onComplete: function(){ el.classList.remove("on"); el.innerHTML = ""; } });
  }
  /* leaving */
  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest("a"); if (!a || e.defaultPrevented) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.hasAttribute("download") || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname)) return;
    e.preventDefault();
    var col = (getComputedStyle(a).getPropertyValue("--a") || getComputedStyle(a).getPropertyValue("--next") || "").trim() || null;
    try { sessionStorage.setItem("og-portal", JSON.stringify({ c: col })); } catch(err){}
    if (reduce){ location.href = a.href; return; }
    build(col); el.classList.add("on");
    var idx = cellAt(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
    window.ogSfx && window.ogSfx("portal");
    gsap.fromTo(grid.cells, { scale: 0, rotationY: -90 }, { scale: 1.02, rotationY: 0, duration: .42, ease: "back.out(1.4)", stagger: { grid: [grid.rows, grid.cols], from: idx, amount: .45 }, onComplete: function(){ location.href = a.href; } });
  });
  addEventListener("pageshow", function(e){ if (e.persisted){ el.classList.remove("on"); el.innerHTML = ""; } });
})();
