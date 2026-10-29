(function(){
  try {
    var sec = document.getElementById("clockmgr");
    if (!sec) return;
    var timer = null, busy = false;
    var MSG = {
      not_in: "العامل ما سجلش دخول اليوم ده. سجّل ساعة الدخول الأول.",
      before_in: "ساعة الانصراف لازم تكون بعد ساعة الدخول.",
      after_out: "ساعة الدخول لازم تكون قبل ساعة الانصراف."
    };
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function workerCards(){
      var out = [];
      Array.prototype.forEach.call(sec.querySelectorAll(".co"), function(c){
        var t = c.textContent;
        if (t.indexOf("لسه ما دخلش") > -1 || t.indexOf("دخل:") > -1) out.push(c);
      });
      return out;
    }
    function decorate(c, w, dt){
      c.setAttribute("data-ed", "1");
      var tg = el("button", "تعديل الساعة", "sec");
      tg.style.marginTop = "8px";
      var box = el("div");
      box.style.cssText = "display:none;margin-top:8px;";
      var f = el("select");
      f.style.marginBottom = "8px";
      [["in", "ساعة الدخول"], ["out", "ساعة الانصراف"]].forEach(function(o){ var op = el("option", o[1]); op.value = o[0]; f.appendChild(op); });
      var t = document.createElement("input");
      t.type = "time";
      t.style.marginBottom = "8px";
      var sv = el("button", "حفظ الساعة");
      box.appendChild(f); box.appendChild(t); box.appendChild(sv);
      tg.addEventListener("click", function(){ box.style.display = (box.style.display === "none") ? "block" : "none"; });
      sv.addEventListener("click", async function(){
        if (!t.value) { msg("اختار الساعة.", "err"); return; }
        if (!dt.value) { msg("اختار اليوم.", "err"); return; }
        sv.disabled = true;
        var r = await db.rpc("set_attendance_time", { p_worker: w.id, p_date: dt.value, p_field: f.value, p_time: t.value });
        sv.disabled = false;
        if (r.error) { msg(arabicError(r.error), "err"); return; }
        if (r.data !== "ok") { msg(MSG[r.data] || "حصل خطأ.", "err"); return; }
        dt.dispatchEvent(new Event("change"));
        setTimeout(function(){ msg("تم حفظ الساعة.", "ok"); }, 400);
      });
      c.appendChild(tg);
      c.appendChild(box);
    }
    async function enhance(){
      var all = workerCards();
      var fresh = all.filter(function(c){ return !c.getAttribute("data-ed"); });
      if (!fresh.length) return;
      var sel = sec.querySelector("select");
      var dt = sec.querySelector('input[type="date"]');
      if (!sel || !dt || !sel.value) return;
      busy = true;
      try {
        var r = await db.from("workers").select("id,name").eq("company_id", sel.value).order("created_at", { ascending: true });
        if (r.error || !r.data || r.data.length !== all.length) return;
        all.forEach(function(c, i){ if (!c.getAttribute("data-ed")) decorate(c, r.data[i], dt); });
      } catch (e) {
      } finally {
        busy = false;
      }
    }
    function schedule(){ clearTimeout(timer); timer = setTimeout(enhance, 200); }
    new MutationObserver(function(){ if (!busy) schedule(); }).observe(sec, { childList: true, subtree: true });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في تعديل الساعة: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
