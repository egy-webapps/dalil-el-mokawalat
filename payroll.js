(function(){
  try {
    var prevShow = window.show, tk = 0;
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function pad(n){ return String(n).padStart(2, "0"); }
    function today(){ return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); }
    function num(n){ return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
    function range(v){
      var p = v.split("-"), y = Number(p[0]), mo = Number(p[1]), ny = y, nm = mo + 1;
      if (nm > 12) { nm = 1; ny++; }
      return { y: y, mo: mo, start: y + "-" + pad(mo) + "-01", end: ny + "-" + pad(nm) + "-01" };
    }

    var sec = el("section", null, "card hide");
    sec.id = "payroll";
    var cs = el("select");
    cs.style.marginBottom = "8px";
    var m = document.createElement("input");
    m.type = "month";
    m.value = today().slice(0, 7);
    m.style.marginBottom = "8px";
    var hl = el("p", "ساعات اليوم الكامل (الأجر بيتحسب بالساعة على أساسها):", "muted");
    var hrs = document.createElement("input");
    hrs.type = "number"; hrs.min = "1"; hrs.max = "24"; hrs.step = "any";
    hrs.style.marginBottom = "8px";
    var sv = el("button", "حفظ ساعات اليوم", "sec");
    sv.style.marginBottom = "8px";
    var dels = el("div");
    var out = el("div");
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "تقرير الشهر"));
    [cs, m, hl, hrs, sv, dels, out, back].forEach(function(x){ sec.appendChild(x); });
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "payroll") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    if (prof) {
      Array.prototype.forEach.call(prof.querySelectorAll("button"), function(b){
        if (b.textContent.trim() === "تقرير الشهر") b.style.display = "none";
      });
    }
    var pb = el("button", "تقرير الشهر", "sec");
    pb.addEventListener("click", openPayroll);
    if (prof && lb) prof.insertBefore(pb, lb); else if (prof) prof.appendChild(pb);

    function makeDel(label, scope){
      var b = el("button", label, "sec");
      b.style.marginBottom = "8px";
      var armed = null, t = null;
      function disarm(){ armed = null; b.textContent = label; clearTimeout(t); }
      b.addEventListener("click", async function(){
        if (!m.value || !cs.value) { msg("اختار الشركة والشهر.", "err"); return; }
        var key = scope + "|" + m.value + "|" + cs.value;
        if (armed !== key) {
          armed = key;
          b.textContent = "اضغط تاني للتأكيد (هيتمسح نهائي)";
          clearTimeout(t);
          t = setTimeout(disarm, 8000);
          return;
        }
        var cid = cs.value, rg = range(m.value);
        disarm();
        b.disabled = true;
        var q = db.from("attendance").delete({ count: "exact" }).eq("company_id", cid);
        q = (scope === "month") ? q.gte("work_date", rg.start).lt("work_date", rg.end) : q.lt("work_date", rg.start);
        var r = await q;
        b.disabled = false;
        if (r.error) { msg(arabicError(r.error), "err"); return; }
        if (!r.count) { msg("ما اتحذفش حاجة. يا إما مفيش حضور متسجل، يا إما مفيش عندك صلاحية.", "err"); return; }
        draw();
        setTimeout(function(){ msg("تم حذف " + r.count + " سجل حضور.", "ok"); }, 400);
      });
      return b;
    }
    dels.appendChild(makeDel("حذف حضور الشهر ده", "month"));
    dels.appendChild(makeDel("حذف الحضور اللي قبل الشهر ده", "before"));

    sv.addEventListener("click", async function(){
      var v = Number(hrs.value);
      if (!(v >= 1 && v <= 24)) { msg("اكتب عدد ساعات من 1 لـ 24.", "err"); return; }
      if (!cs.value) return;
      sv.disabled = true;
      var r = await db.from("company_settings").upsert({ company_id: cs.value, day_hours: v }, { onConflict: "company_id" });
      sv.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      msg("تم حفظ ساعات اليوم.", "ok");
      draw();
    });
    cs.addEventListener("change", draw);
    m.addEventListener("change", draw);

    async function openPayroll(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { msg("لازم تسجل دخول الاول.", "err"); return; }
      prevShow("payroll");
      sec.classList.remove("hide");
      hideMsg();
      cs.textContent = "";
      out.textContent = "";
      var r = await db.rpc("my_team_companies");
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      var list = (r.data || []).filter(function(c){ return c.role === "manager" || c.role === "accountant"; });
      if (!list.length) { emptyNote(out, "التقرير متاح لمدير الشركة والمحاسب بس."); return; }
      list.forEach(function(c){ var o = el("option", c.name); o.value = c.id; cs.appendChild(o); });
      draw();
    }

    async function draw(){
      var cid = cs.value;
      if (!cid || !m.value) return;
      var my = ++tk, month = m.value, rg = range(month);
      out.textContent = "";
      out.appendChild(el("p", "جاري التحميل...", "muted"));

      var st = await db.from("company_settings").select("day_hours").eq("company_id", cid).maybeSingle();
      if (my !== tk) return;
      if (st.error) { out.textContent = ""; msg(arabicError(st.error), "err"); return; }
      var dayHours = st.data ? Number(st.data.day_hours) : 8;
      hrs.value = dayHours;

      var w = await db.from("workers").select("id,name,job,daily_wage").eq("company_id", cid).order("created_at", { ascending: true });
      if (my !== tk) return;
      if (w.error) { out.textContent = ""; msg(arabicError(w.error), "err"); return; }

      var rows = [], from = 0, size = 1000;
      while (true) {
        var r = await db.from("attendance").select("worker_id,work_date,status,check_in,check_out").eq("company_id", cid).gte("work_date", rg.start).lt("work_date", rg.end).order("work_date").order("worker_id").range(from, from + size - 1);
        if (my !== tk) return;
        if (r.error) { out.textContent = ""; msg(arabicError(r.error), "err"); return; }
        rows = rows.concat(r.data || []);
        if (!r.data || r.data.length < size) break;
        from += size;
      }

      var wmap = {}, stats = {};
      (w.data || []).forEach(function(x){ wmap[x.id] = x; });
      rows.forEach(function(a){
        var wk = wmap[a.worker_id];
        if (!wk || a.status === "absent") return;
        var s = stats[a.worker_id] || (stats[a.worker_id] = { days: 0, hours: 0, due: 0, open: 0 });
        var wage = Number(wk.daily_wage);
        if (a.check_in && a.check_out) {
          var h = (new Date(a.check_out) - new Date(a.check_in)) / 3600000;
          if (!(h > 0)) h = 0;
          s.hours += h; s.days += 1; s.due += wage * Math.min(h / dayHours, 1);
        } else if (a.check_in) {
          s.open += 1;
        } else if (a.status === "present") {
          s.days += 1; s.due += wage;
        } else if (a.status === "half") {
          s.days += 0.5; s.due += wage / 2;
        }
      });

      out.textContent = "";
      var total = 0, cards = [], openDays = 0;
      (w.data || []).forEach(function(x){
        var s = stats[x.id];
        if (!s) return;
        total += s.due;
        openDays += s.open;
        var c = el("div", null, "co");
        c.appendChild(el("b", x.name));
        line(c, "الأجر اليومي: " + num(x.daily_wage) + " جنيه");
        line(c, "أيام الشغل: " + num(s.days));
        line(c, "ساعات البصمة: " + num(s.hours));
        if (s.open) {
          var wn = el("div", "⚠ " + s.open + " يوم ناقص انصراف (مش محسوب). عدّله من بصمة العمال.");
          wn.style.cssText = "color:#b00;font-weight:bold;margin:6px 0;";
          c.appendChild(wn);
        }
        line(c, "المستحق: " + num(s.due) + " جنيه");
        cards.push(c);
      });
      if (!cards.length) { emptyNote(out, "مفيش حضور متسجل في الشهر ده."); return; }

      total = Math.round(total * 100) / 100;
      var box = el("div", null, "co");
      box.appendChild(el("b", "إجمالي أجور الشهر"));
      line(box, num(total) + " جنيه");
      line(box, "عدد العمال: " + cards.length + " (اليوم الكامل = " + num(dayHours) + " ساعة)");
      if (openDays) {
        var w2 = el("div", "⚠ فيه " + openDays + " يوم ناقص انصراف مش داخل في الإجمالي.");
        w2.style.cssText = "color:#b00;font-weight:bold;margin:6px 0;";
        box.appendChild(w2);
      }
      if (total > 0) {
        var btn = el("button", "سجّل الأجور كمصروف");
        btn.style.marginTop = "8px";
        btn.addEventListener("click", async function(){
          var note = "أجور شهر " + month;
          var ex = await db.from("finance_entries").select("id").eq("company_id", cid).eq("category", "أجور عمال").eq("note", note).limit(1);
          if (ex.error) { msg(arabicError(ex.error), "err"); return; }
          var cur = (month === today().slice(0, 7));
          var q = "تسجّل " + num(total) + " جنيه كمصروف أجور؟";
          if (cur) q += " (الشهر لسه ما خلصش)";
          if (openDays) q += " (فيه أيام ناقصة انصراف مش محسوبة)";
          if (ex.data && ex.data.length) q = "الأجور دي اتسجلت قبل كده للشهر ده. تسجلها تاني؟";
          if (!confirm(q)) return;
          btn.disabled = true;
          var date = cur ? today() : rg.y + "-" + pad(rg.mo) + "-" + pad(new Date(rg.y, rg.mo, 0).getDate());
          var ins = await db.from("finance_entries").insert({ company_id: cid, kind: "expense", amount: total, category: "أجور عمال", note: note, entry_date: date });
          btn.disabled = false;
          if (ins.error) { msg(arabicError(ins.error), "err"); return; }
          msg("اتسجلت الأجور في مصروفات الشهر.", "ok");
        });
        box.appendChild(btn);
      }
      out.appendChild(box);
      cards.forEach(function(c){ out.appendChild(c); });
    }
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في تقرير الشهر: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
