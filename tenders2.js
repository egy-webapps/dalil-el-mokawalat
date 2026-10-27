(function(){
  function todayStr(){
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }
  function daysLeft(dl){
    var a = new Date(dl + "T00:00:00");
    var n = new Date(); n.setHours(0,0,0,0);
    return Math.round((a - n) / 86400000);
  }

  var ov = document.createElement("div");
  ov.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:999;align-items:center;justify-content:center;padding:16px;";
  var box = document.createElement("div");
  box.style.cssText = "background:#fff;color:#1a2238;border-radius:12px;padding:20px;max-width:480px;width:100%;max-height:85vh;overflow:auto;";
  ov.appendChild(box);
  document.body.appendChild(ov);
  ov.addEventListener("click", function(e){ if (e.target === ov) ov.style.display = "none"; });

  function openDetails(t){
    box.textContent = "";
    var h = document.createElement("h2");
    h.textContent = t.title || "-";
    box.appendChild(h);
    line(box, "الشركة: " + ((t.companies && t.companies.name) || "-"));
    line(box, "المحافظة: " + (t.governorate || "-"));
    var dl = "آخر موعد: " + (t.deadline || "-");
    if (t.deadline) {
      var left = daysLeft(t.deadline);
      dl += left === 0 ? " (آخر يوم النهارده)" : " (فاضل " + left + " يوم)";
    }
    line(box, dl);
    if (t.description) {
      var p = document.createElement("p");
      p.style.marginTop = "12px";
      p.style.whiteSpace = "pre-wrap";
      p.textContent = t.description;
      box.appendChild(p);
    }
    var btn = document.createElement("button");
    btn.className = "sec";
    btn.style.marginTop = "16px";
    btn.textContent = "إغلاق";
    btn.onclick = function(){ ov.style.display = "none"; };
    box.appendChild(btn);
    ov.style.display = "flex";
  }

  window.renderTenders = function(q){
    var list = document.getElementById("t_list");
    list.textContent = "";
    q = (q || "").trim().toLowerCase();
    var today = todayStr();
    var rows = allTenders.filter(function(t){
      if (t.deadline && t.deadline < today) return false;
      var s = ((t.title || "") + " " + (t.governorate || "")).toLowerCase();
      return s.indexOf(q) > -1;
    });
    if (!rows.length) { emptyNote(list, "لا توجد مناقصات مطابقة."); return; }
    rows.forEach(function(t){
      var d = document.createElement("div");
      d.className = "co";
      d.style.cursor = "pointer";
      var b = document.createElement("b");
      b.textContent = t.title || "-";
      d.appendChild(b);
      line(d, "الشركة: " + ((t.companies && t.companies.name) || "-"));
      line(d, "المحافظة: " + (t.governorate || "-"));
      line(d, "آخر موعد: " + (t.deadline || "-"));
      line(d, "اضغط لعرض التفاصيل");
      d.addEventListener("click", function(){ openDetails(t); });
      list.appendChild(d);
    });
  };

  var old = document.getElementById("t_gov");
  if (old && typeof GOVS !== "undefined") {
    var sel = document.createElement("select");
    sel.id = "t_gov";
    var first = document.createElement("option");
    first.value = "";
    first.textContent = "اختار المحافظة (اختياري)";
    sel.appendChild(first);
    GOVS.forEach(function(g){
      var o = document.createElement("option");
      o.value = g;
      o.textContent = g;
      sel.appendChild(o);
    });
    old.parentNode.replaceChild(sel, old);
  }
})();
