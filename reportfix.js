(function(){
  try {
    var sec = document.getElementById("mgmt_report");
    if (!sec) return;
    var sel = sec.querySelector("select");
    var m = sec.querySelector('input[type="month"]');
    if (!sel || !m || sec.querySelector("[data-rep]")) return;

    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function pad(n){ return String(n).padStart(2, "0"); }
    function range(v){
      var p = v.split("-"), y = Number(p[0]), mo = Number(p[1]), ny = y, nm = mo + 1;
      if (nm > 12) { nm = 1; ny++; }
      return { start: y + "-" + pad(mo) + "-01", end: ny + "-" + pad(nm) + "-01" };
    }

    function makeBtn(label, scope){
      var b = el("button", label, "sec");
      b.style.marginBottom = "8px";
      var armedKey = null, t = null;
      function disarm(){ armedKey = null; b.textContent = label; clearTimeout(t); }
      b.addEventListener("click", async function(){
        if (!m.value || !sel.value) { msg("اختار الشركة والشهر.", "err"); return; }
        var key = scope + "|" + m.value + "|" + sel.value;
        if (armedKey !== key) {
          armedKey = key;
          b.textContent = "اضغط تاني للتأكيد (هيتمسح نهائي)";
          clearTimeout(t);
          t = setTimeout(disarm, 8000);
          return;
        }
        var cid = sel.value, rg = range(m.value);
        disarm();
        b.disabled = true;
        var q = db.from("attendance").delete({ count: "exact" }).eq("company_id", cid);
        q = (scope === "month") ? q.gte("work_date", rg.start).lt("work_date", rg.end) : q.lt("work_date", rg.start);
        var r = await q;
        b.disabled = false;
        if (r.error) { msg(arabicError(r.error), "err"); return; }
        if (!r.count) { msg("ما اتحذفش حاجة. يا إما مفيش حضور متسجل، يا إما مفيش عندك صلاحية.", "err"); return; }
        m.dispatchEvent(new Event("change"));
        setTimeout(function(){ msg("تم حذف " + r.count + " سجل حضور.", "ok"); }, 400);
      });
      return b;
    }

    var wrap = el("div");
    wrap.setAttribute("data-rep", "1");
    wrap.style.margin = "8px 0";
    wrap.appendChild(makeBtn("حذف حضور الشهر ده", "month"));
    wrap.appendChild(makeBtn("حذف الحضور اللي قبل الشهر ده", "before"));
    m.parentNode.insertBefore(wrap, m.nextSibling);
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في تقرير الشهر: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
