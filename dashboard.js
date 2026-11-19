(function(){
  try {
    var prevShow = window.show, tk = 0;
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
    function monthRange(){
      var t = today(), y = Number(t.slice(0, 4)), mo = Number(t.slice(5, 7)), ny = y, nm = mo + 1;
      if (nm > 12) { nm = 1; ny++; }
      return { start: y + "-" + pad(mo) + "-01", end: ny + "-" + pad(nm) + "-01" };
    }
    async function fetchAll(make){
      var rows = [], from = 0, size = 1000;
      while (true) {
        var r = await make(from, from + size - 1);
        if (r.error) return { error: r.error, data: null };
        rows = rows.concat(r.data || []);
        if (!r.data || r.data.length < size) break;
        from += size;
      }
      return { error: null, data: rows };
    }
    function red(text){
      var d = el("div", text);
      d.style.cssText = "color:#b00;font-weight:bold;margin:6px 0;";
      return d;
    }

    var sec = el("section", null, "card hide");
    sec.id = "dash";
    var cs = el("select");
    cs.style.marginBottom = "8px";
    var rf = el("button", "تحديث", "sec");
    rf.style.marginBottom = "8px";
    var out = el("div");
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "ملخص الشركة"));
    [cs, rf, out, back].forEach(function(x){ sec.appendChild(x); });
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "dash") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var pb = el("button", "ملخص الشركة", "sec");
    pb.addEventListener("click", openDash);
    if (prof && lb) prof.insertBefore(pb, lb); else if (prof) prof.appendChild(pb);

    cs.addEventListener("change", draw);
    rf.addEventListener("click", draw);

    async function openDash(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { msg("لازم تسجل دخول الاول.", "err"); return; }
      prevShow("dash");
      sec.classList.remove("hide");
      hideMsg();
      cs.textContent = "";
      out.textContent = "";
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
      if (!cs.options.length) { emptyNote(out, "الملخص لمدير الشركة والمحاسب بس."); return; }
      draw();
    }

    async function draw(){
      var cid = cs.value;
      if (!cid) return;
      var my = ++tk, rg = monthRange(), td = today();
      out.textContent = "";
      out.appendChild(el("p", "جاري التحميل...", "muted"));
      var res = await Promise.all([
        db.from("workers").select("id,name,daily_wage,active").eq("company_id", cid),
        fetchAll(function(a, b){ return db.from("attendance").select("worker_id,work_date,status,check_in,check_out").eq("company_id", cid).gte("work_date", rg.start).lt("work_date", rg.end).order("work_date").order("worker_id").range(a, b); }),
        fetchAll(function(a, b){ return db.from("finance_entries").select("kind,amount").eq("company_id", cid).gte("entry_date", rg.start).lt("entry_date", rg.end).order("id").range(a, b); }),
        db.from("stock_items").select("id,name,unit,min_qty").eq("company_id", cid),
        fetchAll(function(a, b){ return db.from("stock_moves").select("item_id,kind,qty").eq("company_id", cid).order("id").range(a, b); }),
        db.from("company_settings").select("day_hours,ot_rate").eq("company_id", cid).maybeSingle()
      ]);
      if (my !== tk) return;
      out.textContent = "";
      for (var i = 0; i < res.length; i++) {
        if (res[i].error) { msg(arabicError(res[i].error), "err"); return; }
      }
      var workers = (res[0].data || []).filter(function(w){ return w.active; });
      var att = res[1].data || [], fin = res[2].data || [], items = res[3].data || [], moves = res[4].data || [];
      var dayHours = res[5].data ? Number(res[5].data.day_hours) : 8;
      var otRate = res[5].data ? Number(res[5].data.ot_rate) : 1;

      var wmap = {};
      workers.forEach(function(w){ wmap[w.id] = w; });

      var present = 0, inNow = 0, seenToday = {};
      var dueReg = 0, dueOt = 0, otHours = 0, openDays = 0;
      att.forEach(function(a){
        var wk = wmap[a.worker_id];
        if (a.work_date === td && a.status !== "absent" && (a.check_in || a.status === "present" || a.status === "half")) {
          if (wk && !seenToday[a.worker_id]) { seenToday[a.worker_id] = true; present += 1; }
          if (a.check_in && !a.check_out) inNow += 1;
        }
        if (!wk || a.status === "absent") return;
        var wage = Number(wk.daily_wage);
        if (a.check_in && a.check_out) {
          var h = (new Date(a.check_out) - new Date(a.check_in)) / 3600000;
          if (!(h > 0)) h = 0;
          var reg = Math.min(h, dayHours), ot = Math.max(h - dayHours, 0);
          dueReg += wage * reg / dayHours;
          dueOt += wage / dayHours * ot * otRate;
          otHours += ot;
        } else if (a.check_in) {
          openDays += 1;
        } else if (a.status === "present") {
          dueReg += wage;
        } else if (a.status === "half") {
          dueReg += wage / 2;
        }
      });
      var missing = workers.filter(function(w){ return !seenToday[w.id]; });

      var c1 = el("div", null, "co");
      c1.appendChild(el("b", "حضور النهارده (" + td + ")"));
      line(c1, "عدد العمال: " + workers.length);
      line(c1, "حاضر: " + present);
      line(c1, "لسه ما بصمش: " + missing.length);
      line(c1, "داخل ولسه ما خرجش: " + inNow);
      if (missing.length) {
        var names = missing.slice(0, 8).map(function(w){ return w.name; }).join("، ");
        line(c1, "اللي لسه ما بصمش: " + names + (missing.length > 8 ? " وغيرهم" : ""));
      }
      out.appendChild(c1);

      var inc = 0, exp = 0;
      fin.forEach(function(f){ if (f.kind === "income") inc += Number(f.amount); else exp += Number(f.amount); });
      var c2 = el("div", null, "co");
      c2.appendChild(el("b", "مالية الشهر"));
      line(c2, "الإيرادات: " + num(inc) + " جنيه");
      line(c2, "المصروفات: " + num(exp) + " جنيه");
      var net = el("b", "الصافي: " + num(inc - exp) + " جنيه");
      net.style.display = "block";
      c2.appendChild(net);
      out.appendChild(c2);

      var c3 = el("div", null, "co");
      c3.appendChild(el("b", "أجور الشهر لحد دلوقتي"));
      line(c3, "أجر الدوام: " + num(dueReg) + " جنيه");
      if (otHours > 0) line(c3, "أوفر تايم (مش مضاف): " + hm(otHours) + " بقيمة " + num(dueOt) + " جنيه");
      if (openDays) c3.appendChild(red("⚠ " + openDays + " يوم ناقص انصراف (مش محسوب)."));
      line(c3, "التفاصيل في تقرير الشهر.");
      out.appendChild(c3);

      var bal = {};
      moves.forEach(function(m){ bal[m.item_id] = (bal[m.item_id] || 0) + (m.kind === "in" ? Number(m.qty) : -Number(m.qty)); });
      var low = items.filter(function(it){ return Number(it.min_qty) > 0 && (bal[it.id] || 0) <= Number(it.min_qty); });
      var c4 = el("div", null, "co");
      c4.appendChild(el("b", "المخزن"));
      if (!low.length) {
        line(c4, items.length ? "مفيش أصناف قربت تخلص." : "لسه مفيش أصناف.");
      } else {
        c4.appendChild(red("⚠ " + low.length + " صنف قرب يخلص:"));
        low.slice(0, 8).forEach(function(it){
          line(c4, it.name + ": " + num(bal[it.id] || 0) + " " + it.unit + " (الحد الأدنى " + num(it.min_qty) + ")");
        });
        if (low.length > 8) line(c4, "وغيرهم...");
      }
      out.appendChild(c4);
    }
  } catch (e) {
    var dd = document.createElement("div");
    dd.textContent = "خطأ في الملخص: " + (e && e.message);
    dd.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(dd);
  }
})();
