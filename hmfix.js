(function(){
  try {
    var sec = document.getElementById("payroll");
    if (!sec) return;
    var P = "ساعات البصمة: ";
    var timer = null;
    function fmt(x){
      var h = Math.floor(x + 1e-9), mi = Math.round((x - h) * 60);
      if (mi >= 60) { h += 1; mi = 0; }
      if (h > 0 && mi > 0) return h + " ساعة و " + mi + " دقيقة";
      if (h > 0) return h + " ساعة";
      if (mi > 0) return mi + " دقيقة";
      return "0";
    }
    function fix(){
      Array.prototype.forEach.call(sec.querySelectorAll("div"), function(d){
        if (d.getAttribute("data-hm")) return;
        var t = d.textContent;
        if (t.indexOf(P) !== 0) return;
        var x = parseFloat(t.slice(P.length).replace(/,/g, ""));
        if (isNaN(x)) return;
        d.setAttribute("data-hm", "1");
        d.textContent = P + fmt(x);
      });
    }
    function schedule(){ clearTimeout(timer); timer = setTimeout(fix, 100); }
    new MutationObserver(schedule).observe(sec, { childList: true, subtree: true });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في عرض الساعات: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
