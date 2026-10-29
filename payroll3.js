(function(){
  try {
    var prevShow = window.show, tk = 0, data = null, addOt = {};
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function pad(n){ return String(n).padStart(2, "0"); }
    function today(){ return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); }
    function num(n){ return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
    function hm(x){
      var h = Math.floor(x + 1e-9), mi = Math.round((x - h) * 60);
      if (mi >= 60) { h += 1; mi = 0; }
      if (h > 0 && mi > 0) return h + " ساعة و " + mi + " دقيقة";
      if (h > 0) return h + " ساعة";
      if (mi > 0) return mi + " دقيقة";
      return "0";
    }
    function range(v){
      var p = v.split("-"), y = Number(p[0]), mo = Number(p[1]), ny = y, nm = mo + 1;
      if (nm > 12) { nm = 1; ny++; }
      return { y: y, mo: mo, start: y + "-" + pad(mo) + "-01", end: ny + "-" + pad(nm) + "-01" };
    }
    function red(text){
      var d = el("div", text);
      d.style.cssText = "color:#b00;font-weight:bold;margin:6px 0;";
      return d;
    }

    var sec = el("section", null, "card hide");
    sec.id = "payroll3";
    var cs = el("select");
    cs.style.marginBottom = "8px";
    var m = document.createElement("input");
    m.type = "month";
    m.value = today().slice(0, 7);
    m.style.marginBottom = "8px";
    var hl = el("p", "ساعات اليوم الكامل (الدوام الرسمي):", "muted");
    var hrs = document.createElement("input");
    hrs.type = "number"; hrs.min = "1"; hrs.max = "24"; hrs.step = "any";
    hrs.style.marginBottom = "8px";
    var ol = el("p", "سعر ساعة الأوفر تايم (1 = نفس سعر الساعة العادية، 1.5 = ساعة ونص):", "muted");
    var otIn = document.createElement("input");
    otIn.type = "number"; otIn.min = "0"; otIn.max = "5"; otIn.step = "any";
    otIn.style.marginBottom = "8px";
    var sv = el("button", "حفظ الإعدادات", "sec");
    sv.style.marginBottom = "8px";
    var dels = el("div");
    var out = el("div");
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "تقرير الشهر"));
    [cs, m, hl, hrs, ol, otIn, sv, dels, out, back].forEach(function(x){ sec.appendChild(x); });
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "payroll3") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    if (prof) {
      Array.prototype.forEach.call(prof.querySelectorAll("button"), function(b){
        if (b.textContent.trim() === "تقرير الشهر") b.style.display = "none";
      });
    }
    var pb = el("button", "تقرير الشهر", "sec");
    pb.addEventListener("click", openReport);
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
      var v = Number(hrs.value), o = Number(otIn.value);
      if (!(v >= 1 && v <= 24)) { msg("اكتب عدد ساعات من 1 لـ 24.", "err"); return; }
      if (!(o >= 0 && o <= 5)) { msg("سعر الأوفر تايم لازم يكون من 0 لـ 5.", "err"); return; }
      if (!cs.value) return;
      sv.disabled = true;
      var r = await db.from("company_settings").upsert({ company_id: cs.value, day_hours: v, ot_rate: o }, { onConflict: "company_id" });
      sv.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      msg("تم حفظ الإعدادات.", "ok");
      draw();
    });
    cs.addEventListener("change", draw);
    m.addEventListener("change", draw);

    async function openReport(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { msg("لازم تسجل دخول الاول.", "err"); return; }
      prevShow("payroll3");
      sec.classList.remove("hide");
      hideMsg();
      cs.textContent = "";
      out.textContent = "";
      data = null;
      addOt = {};
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

      var st = await db.from("company_settings").select("day_hours,ot_rate").eq("company_id", cid).maybeSingle();
      if (my !== tk) return;
      if (st.error) { out.textContent = ""; msg(arabicError(st.error), "err"); return; }
      var dayHours = st.data ? Number(st.data.day_hours) : 8;
      var otRate = st.data ? Number(st.data.ot_rate) : 1;
      hrs.value = dayHours;
      otIn.value = otRate;

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
        var s = stats[a.worker_id] || (stats[a.worker_id] = { days: 0, reg: 0, ot: 0, dueReg: 0, dueOt: 0, open: 0 });
        var wage = Number(wk.daily_wage);
        if (a.check_in && a.check_out) {
          var h = (new Date(a.check_out) - new Date(a.check_in)) / 3600000;
          if (!(h > 0)) h = 0;
          var reg = Math.min(h, dayHours), ot = Math.max(h - dayHours, 0);
          s.days += 1; s.reg += reg; s.ot += ot;
          s.dueReg += wage * reg / dayHours;
          s.dueOt += wage / dayHours * ot * otRate;
        } else if (a.check_in) {
          s.open += 1;
        } else if (a.status === "present") {
          s.days += 1; s.dueReg += wage;
        } else if (a.status === "half") {
          s.days += 0.5; s.dueReg += wage / 2;
        }
      });
      data = { cid: cid, month: month, rg: rg, dayHours: dayHours, workers: w.data || [], stats: stats };
      render();
    }

    function render(){
      out.textContent = "";
      if (!data) return;
      var d = data, totReg = 0, totOtAll = 0, totOtAdded = 0, openDays = 0, cards = [];
      d.workers.forEach(function(x){
        var s = d.stats[x.id];
        if (!s) return;
        var key = d.cid + "|" + d.month + "|" + x.id;
        var added = !!addOt[key] && s.dueOt > 0;
        totReg += s.dueReg; totOtAll += s.dueOt; openDays += s.open;
        if (added) totOtAdded += s.dueOt;
        var c = el("div", null, "co");
        c.appendChild(el("b", x.name));
        line(c, "الأجر اليومي: " + num(x.daily_wage) + " جنيه");
        line(c, "أيام الشغل: " + num(s.days));
        line(c, "ساعات الدوام: " + hm(s.reg));
        line(c, "أجر الدوام: " + num(s.dueReg) + " جنيه");
        if (s.open) c.appendChild(red("⚠ " + s.open + " يوم ناقص انصراف (مش محسوب). عدّله من بصمة العمال."));
        if (s.ot > 0) {
          var ob = el("div", null, "co");
          ob.style.marginTop = "8px";
          ob.appendChild(el("b", "الأوفر تايم"));
          line(ob, "الساعات: " + hm(s.ot));
          line(ob, "القيمة: " + num(s.dueOt) + " جنيه " + (added ? "(مضاف للمستحق)" : "(مش مضاف للمستحق)"));
          var tg = el("button", added ? "شيل الأوفر تايم من المستحق" : "أضف الأوفر تايم للمستحق", "sec");
          tg.style.marginTop = "8px";
          tg.addEventListener("click", function(){ addOt[key] = !added; render(); });
          ob.appendChild(tg);
          c.appendChild(ob);
        }
        var tb = el("b", "المستحق: " + num(s.dueReg + (added ? s.dueOt : 0)) + " جنيه");
        tb.style.cssText = "display:block;margin-top:8px;";
        c.appendChild(tb);
        cards.push(c);
      });
      if (!cards.length) { emptyNote(out, "مفيش حضور متسجل في الشهر ده."); return; }

      var total = Math.round((totReg + totOtAdded) * 100) / 100;
      var box = el("div", null, "co");
      box.appendChild(el("b", "إجمالي أجور الشهر"));
      line(box, num(total) + " جنيه");
      line(box, "أجر الدوام: " + num(totReg) + " جنيه");
      if (totOtAll > 0) {
        line(box, "الأوفر تايم المضاف: " + num(totOtAdded) + " جنيه");
        line(box, "الأوفر تايم اللي لسه مش مضاف: " + num(totOtAll - totOtAdded) + " جنيه");
      }
      line(box, "عدد العمال: " + cards.length + " (اليوم الكامل = " + hm(d.dayHours) + ")");
      if (openDays) box.appendChild(red("⚠ فيه " + openDays + " يوم ناقص انصراف مش داخل في الإجمالي."));
      if (totOtAll > 0) {
        var allAdded = totOtAdded >= totOtAll - 0.005;
        var ab = el("button", allAdded ? "شيل كل الأوفر تايم من المستحق" : "أضف كل الأوفر تايم للمستحق", "sec");
        ab.style.cssText = "margin-top:8px;margin-bottom:8px;";
        ab.addEventListener("click", function(){
          d.workers.forEach(function(x){
            var s = d.stats[x.id];
            if (s && s.dueOt > 0) addOt[d.cid + "|" + d.month + "|" + x.id] = !allAdded;
          });
          render();
        });
        box.appendChild(ab);
      }
      if (total > 0) {
        var btn = el("button", "سجّل الأجور كمصروف");
        btn.style.marginTop = "8px";
        btn.addEventListener("click", async function(){
          var note = "أجور شهر " + d.month;
          var ex = await db.from("finance_entries").select("id").eq("company_id", d.cid).eq("category", "أجور عمال").eq("note", note).limit(1);
          if (ex.error) { msg(arabicError(ex.error), "err"); return; }
          var cur = (d.month === today().slice(0, 7));
          var q = "تسجّل " + num(total) + " جنيه كمصروف أجور؟";
          if (totOtAdded > 0) q += " (شامل أوفر تايم " + num(totOtAdded) + ")";
          if (cur) q += " (الشهر لسه ما خلصش)";
          if (openDays) q += " (فيه أيام ناقصة انصراف مش محسوبة)";
          if (ex.data && ex.data.length) q = "الأجور دي اتسجلت قبل كده للشهر ده. تسجلها تاني؟";
          if (!confirm(q)) return;
          btn.disabled = true;
          var date = cur ? today() : d.rg.y + "-" + pad(d.rg.mo) + "-" + pad(new Date(d.rg.y, d.rg.mo, 0).getDate());
          var ins = await db.from("finance_entries").insert({ company_id: d.cid, kind: "expense", amount: total, category: "أجور عمال", note: note, entry_date: date });
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
    var dd = document.createElement("div");
    dd.textContent = "خطأ في تقرير الشهر: " + (e && e.message);
    dd.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(dd);
  }
})();
