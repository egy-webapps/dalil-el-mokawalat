(function(){
  try {
    var prevShow = window.show, tk = 0, data = null, addOt = {};
    var KINDS = { advance: "سلفة", deduction: "خصم", bonus: "مكافأة" };
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
      return { start: y + "-" + pad(mo) + "-01", end: ny + "-" + pad(nm) + "-01", last: y + "-" + pad(mo) + "-" + pad(new Date(y, mo, 0).getDate()) };
    }
    function red(text){ var d = el("div", text); d.style.cssText = "color:#b00;font-weight:bold;margin:6px 0;"; return d; }
    function inp(type, ph){ var i = document.createElement("input"); i.type = type; i.placeholder = ph || ""; i.style.marginBottom = "8px"; return i; }
    function twoPress(b, label, action){
      var armed = false, t = null;
      b.textContent = label;
      b.addEventListener("click", async function(){
        if (!armed) {
          armed = true;
          b.textContent = "اضغط تاني للتأكيد";
          clearTimeout(t);
          t = setTimeout(function(){ armed = false; b.textContent = label; }, 8000);
          return;
        }
        clearTimeout(t);
        armed = false;
        b.textContent = label;
        b.disabled = true;
        try { await action(); } finally { b.disabled = false; }
      });
    }

    var sec = el("section", null, "card hide");
    sec.id = "salary";
    var cs = el("select");
    cs.style.marginBottom = "8px";
    var m = inp("month");
    m.value = today().slice(0, 7);
    var out = el("div");
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "الرواتب والسلف"));
    [cs, m, out, back].forEach(function(x){ sec.appendChild(x); });
    (document.querySelector("main") || document.body).appendChild(sec);
    window.show = function(id){ prevShow(id); if (id !== "salary") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var pb = el("button", "الرواتب والسلف", "sec");
    pb.addEventListener("click", openPage);
    if (prof && lb) prof.insertBefore(pb, lb); else if (prof) prof.appendChild(pb);
    cs.addEventListener("change", draw);
    m.addEventListener("change", draw);

    async function openPage(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { msg("لازم تسجل دخول الاول.", "err"); return; }
      prevShow("salary");
      sec.classList.remove("hide");
      hideMsg();
      cs.textContent = "";
      out.textContent = "";
      data = null;
      addOt = {};
      var r = await db.rpc("my_team_companies");
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      var seen = {};
      (r.data || []).forEach(function(c){
        if ((c.role === "manager" || c.role === "accountant") && !seen[c.id]) {
          seen[c.id] = true;
          var o = el("option", c.name);
          o.value = c.id;
          cs.appendChild(o);
        }
      });
      if (!cs.options.length) { emptyNote(out, "الصفحة دي لمدير الشركة والمحاسب بس."); return; }
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
      var w = await db.from("workers").select("id,name,job,daily_wage,active").eq("company_id", cid).order("created_at", { ascending: true });
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
      var ad = await db.from("worker_adjustments").select("id,worker_id,kind,amount,note,adj_date").eq("company_id", cid).gte("adj_date", rg.start).lt("adj_date", rg.end).order("adj_date").order("created_at");
      if (my !== tk) return;
      if (ad.error) { out.textContent = ""; msg(arabicError(ad.error), "err"); return; }
      var adj = {};
      (ad.data || []).forEach(function(a){ (adj[a.worker_id] || (adj[a.worker_id] = [])).push(a); });
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
      data = { cid: cid, month: month, rg: rg, dayHours: dayHours, workers: w.data || [], stats: stats, adj: adj };
      render();
    }

    function adjRow(a){
      var r = el("div");
      r.style.margin = "6px 0";
      r.appendChild(document.createTextNode(KINDS[a.kind] + ": " + num(a.amount) + " جنيه (" + a.adj_date + ")" + (a.note ? " - " + a.note : "")));
      var b = el("button", null, "sec");
      b.style.cssText = "display:block;width:auto;padding:4px 12px;margin-top:4px;font-size:13px;";
      twoPress(b, "حذف", async function(){
        var d = await db.from("worker_adjustments").delete().eq("id", a.id).select("id");
        if (d.error) { msg(arabicError(d.error), "err"); return; }
        if (!d.data || !d.data.length) { msg("ما اتحذفش. مفيش عندك صلاحية.", "err"); return; }
        draw();
        setTimeout(function(){ msg("تم الحذف.", "ok"); }, 400);
      });
      r.appendChild(b);
      return r;
    }

    function adjForm(x, d){
      var wrap = el("div");
      wrap.style.cssText = "display:none;margin-top:8px;";
      var k = el("select");
      k.style.marginBottom = "8px";
      Object.keys(KINDS).forEach(function(key){ var o = el("option", KINDS[key]); o.value = key; k.appendChild(o); });
      var a = inp("number", "المبلغ بالجنيه");
      a.min = "0.01"; a.step = "any";
      var n = inp("text", "ملاحظة (اختياري)");
      var dt = inp("date");
      dt.min = d.rg.start; dt.max = d.rg.last;
      dt.value = (d.month === today().slice(0, 7)) ? today() : d.rg.start;
      var b = el("button", "تسجيل");
      b.addEventListener("click", async function(){
        var amt = Number(a.value);
        if (!(amt > 0)) { msg("اكتب مبلغ أكبر من صفر.", "err"); return; }
        if (!dt.value || dt.value < d.rg.start || dt.value > d.rg.last) { msg("اختار تاريخ جوه الشهر ده.", "err"); return; }
        b.disabled = true;
        var r = await db.from("worker_adjustments").insert({ company_id: d.cid, worker_id: x.id, kind: k.value, amount: amt, note: n.value.trim() || null, adj_date: dt.value });
        b.disabled = false;
        if (r.error) { msg(arabicError(r.error), "err"); return; }
        draw();
        setTimeout(function(){ msg("تم التسجيل.", "ok"); }, 400);
      });
      [k, a, dt, n, b].forEach(function(e){ wrap.appendChild(e); });
      var tg = el("button", "إضافة سلفة / خصم / مكافأة", "sec");
      tg.style.marginTop = "8px";
      tg.addEventListener("click", function(){ wrap.style.display = (wrap.style.display === "none") ? "block" : "none"; });
      var box = el("div");
      box.appendChild(tg);
      box.appendChild(wrap);
      return box;
    }

    function render(){
      out.textContent = "";
      if (!data) return;
      var d = data, totReg = 0, totOtAll = 0, totOtAdded = 0, totAdv = 0, totDed = 0, totBon = 0, totNet = 0, totDebt = 0, openDays = 0, cards = [];
      d.workers.forEach(function(x){
        var s = d.stats[x.id] || { days: 0, reg: 0, ot: 0, dueReg: 0, dueOt: 0, open: 0 };
        var list = d.adj[x.id] || [];
        if (!x.active && !d.stats[x.id] && !list.length) return;
        var key = d.cid + "|" + d.month + "|" + x.id;
        var added = !!addOt[key] && s.dueOt > 0;
        var adv = 0, ded = 0, bon = 0;
        list.forEach(function(a){
          if (a.kind === "advance") adv += Number(a.amount);
          else if (a.kind === "deduction") ded += Number(a.amount);
          else bon += Number(a.amount);
        });
        var net = s.dueReg + (added ? s.dueOt : 0) + bon - adv - ded;
        totReg += s.dueReg; totOtAll += s.dueOt; openDays += s.open;
        if (added) totOtAdded += s.dueOt;
        totAdv += adv; totDed += ded; totBon += bon;
        if (net > 0) totNet += net; else totDebt += -net;
        var c = el("div", null, "co");
        c.appendChild(el("b", x.name + (x.active ? "" : " (موقوف)")));
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
        if (list.length) {
          var ab = el("div");
          ab.style.marginTop = "8px";
          ab.appendChild(el("b", "السلف والخصومات والمكافآت"));
          list.forEach(function(a){ ab.appendChild(adjRow(a)); });
          c.appendChild(ab);
        }
        c.appendChild(adjForm(x, d));
        if (adv) line(c, "إجمالي السلف: " + num(adv) + " جنيه");
        if (ded) line(c, "إجمالي الخصومات: " + num(ded) + " جنيه");
        if (bon) line(c, "إجمالي المكافآت: " + num(bon) + " جنيه");
        if (net < 0) {
          c.appendChild(red("عليه مديونية " + num(-net) + " جنيه (السلف والخصومات أكتر من المستحق)"));
        } else {
          var tb = el("b", "الصافي للصرف: " + num(net) + " جنيه");
          tb.style.cssText = "display:block;margin-top:8px;";
          c.appendChild(tb);
        }
        cards.push(c);
      });
      if (!cards.length) { emptyNote(out, "لسه مفيش عمال. ضيفهم من إدارة الشركة."); return; }
      var total = Math.round(totNet * 100) / 100;
      var box = el("div", null, "co");
      box.appendChild(el("b", "إجمالي الصافي للصرف"));
      line(box, num(total) + " جنيه");
      line(box, "أجر الدوام: " + num(totReg) + " جنيه");
      if (totOtAll > 0) {
        line(box, "الأوفر تايم المضاف: " + num(totOtAdded) + " جنيه");
        line(box, "الأوفر تايم اللي لسه مش مضاف: " + num(totOtAll - totOtAdded) + " جنيه");
      }
      if (totBon) line(box, "المكافآت: " + num(totBon) + " جنيه");
      if (totAdv) line(box, "السلف: " + num(totAdv) + " جنيه");
      if (totDed) line(box, "الخصومات: " + num(totDed) + " جنيه");
      if (totDebt > 0) line(box, "مديونيات على عمال (مش داخلة في الإجمالي): " + num(totDebt) + " جنيه");
      line(box, "عدد العمال: " + cards.length + " (اليوم الكامل = " + hm(d.dayHours) + ")");
      if (openDays) box.appendChild(red("⚠ فيه " + openDays + " يوم ناقص انصراف مش داخل في الإجمالي."));
      if (totOtAll > 0) {
        var allAdded = totOtAdded >= totOtAll - 0.005;
        var ab2 = el("button", allAdded ? "شيل كل الأوفر تايم من المستحق" : "أضف كل الأوفر تايم للمستحق", "sec");
        ab2.style.cssText = "margin-top:8px;margin-bottom:8px;";
        ab2.addEventListener("click", function(){
          d.workers.forEach(function(x){
            var s2 = d.stats[x.id];
            if (s2 && s2.dueOt > 0) addOt[d.cid + "|" + d.month + "|" + x.id] = !allAdded;
          });
          render();
        });
        box.appendChild(ab2);
      }
      if (total > 0) {
        var btn = el("button", "سجّل الأجور كمصروف");
        btn.style.marginTop = "8px";
        btn.addEventListener("click", async function(){
          var note = "أجور شهر " + d.month;
          var ex = await db.from("finance_entries").select("id").eq("company_id", d.cid).eq("category", "أجور عمال").eq("note", note).limit(1);
          if (ex.error) { msg(arabicError(ex.error), "err"); return; }
          var cur = (d.month === today().slice(0, 7));
          var q = "تسجّل " + num(total) + " جنيه كمصروف أجور (بعد السلف والخصومات)؟";
          if (cur) q += " (الشهر لسه ما خلصش)";
          if (openDays) q += " (فيه أيام ناقصة انصراف مش محسوبة)";
          if (ex.data && ex.data.length) q = "الأجور دي اتسجلت قبل كده للشهر ده. تسجلها تاني؟";
          if (!confirm(q)) return;
          btn.disabled = true;
          var ins = await db.from("finance_entries").insert({ company_id: d.cid, kind: "expense", amount: total, category: "أجور عمال", note: note, entry_date: cur ? today() : d.rg.last });
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
    dd.textContent = "خطأ في الرواتب: " + (e && e.message);
    dd.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(dd);
  }
})();
