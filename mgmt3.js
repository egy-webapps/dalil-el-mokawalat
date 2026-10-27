(function(){
  try {
    var prevShow = window.show;
    var cid = null, tk = 0;

    function el(tag, text, cls){
      var e = document.createElement(tag);
      if (text != null) e.textContent = text;
      if (cls) e.className = cls;
      return e;
    }
    function pad(n){ return String(n).padStart(2, "0"); }
    function today(){
      var d = new Date();
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }
    function money(n){ return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }

    var sec = el("section", null, "card hide");
    sec.id = "mgmt_report";
    var sel = el("select");
    var m = document.createElement("input");
    m.type = "month";
    m.value = today().slice(0, 7);
    m.style.margin = "8px 0";
    var out = el("div");
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "تقرير الشهر"));
    sec.appendChild(sel);
    sec.appendChild(m);
    sec.appendChild(out);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){
      prevShow(id);
      if (id !== "mgmt_report") sec.classList.add("hide");
    };

    var prof = document.getElementById("profile");
    var lb = document.getElementById("logoutBtn");
    var rb = el("button", "تقرير الشهر", "sec");
    rb.addEventListener("click", openReport);
    if (prof && lb) prof.insertBefore(rb, lb);
    else if (prof) prof.appendChild(rb);

    sel.addEventListener("change", function(){ cid = sel.value; draw(); });
    m.addEventListener("change", draw);

    async function openReport(){
      prevShow("mgmt_report");
      sec.classList.remove("hide");
      sel.textContent = "";
      out.textContent = "";
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) {
        window.show("home");
        msg("لازم تسجل دخول الاول.", "err");
        return;
      }
      var r = await db.from("companies").select("id,name").eq("owner_id", u.data.user.id);
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (!r.data || !r.data.length) {
        emptyNote(out, "مفيش عندك شركة. ضيف شركة الأول من إضافة شركة.");
        return;
      }
      r.data.forEach(function(c){
        var o = el("option", c.name);
        o.value = c.id;
        sel.appendChild(o);
      });
      cid = sel.value;
      draw();
    }

    async function draw(){
      if (!cid || !m.value) return;
      var my = ++tk;
      out.textContent = "";
      out.appendChild(el("p", "جاري التحميل...", "muted"));
      var p = m.value.split("-");
      var y = Number(p[0]), mo = Number(p[1]);
      var ny = y, nm = mo + 1;
      if (nm > 12) { nm = 1; ny++; }
      var start = y + "-" + pad(mo) + "-01";
      var end = ny + "-" + pad(nm) + "-01";
      var company = cid, month = m.value;

      var w = await db.from("workers").select("id,name,job,daily_wage").eq("company_id", company).order("created_at", { ascending: true });
      if (my !== tk) return;
      if (w.error) { out.textContent = ""; msg(arabicError(w.error), "err"); return; }

      var rows = [], from = 0, size = 1000;
      while (true) {
        var r = await db.from("attendance").select("worker_id,status").eq("company_id", company).gte("work_date", start).lt("work_date", end).order("work_date").order("worker_id").range(from, from + size - 1);
        if (my !== tk) return;
        if (r.error) { out.textContent = ""; msg(arabicError(r.error), "err"); return; }
        rows = rows.concat(r.data || []);
        if (!r.data || r.data.length < size) break;
        from += size;
      }

      var stats = {};
      rows.forEach(function(a){
        var s = stats[a.worker_id] || (stats[a.worker_id] = { present: 0, half: 0, absent: 0 });
        if (s[a.status] !== undefined) s[a.status]++;
      });

      out.textContent = "";
      var total = 0, cards = [];
      (w.data || []).forEach(function(x){
        var s = stats[x.id];
        if (!s) return;
        var wage = Number(x.daily_wage);
        var due = s.present * wage + s.half * wage / 2;
        total += due;
        var c = el("div", null, "co");
        c.appendChild(el("b", x.name));
        line(c, "الوظيفة: " + (x.job || "-"));
        line(c, "أيام الحضور: " + s.present);
        line(c, "أيام نص يوم: " + s.half);
        line(c, "أيام الغياب: " + s.absent);
        line(c, "المستحق: " + money(due) + " جنيه");
        cards.push(c);
      });

      if (!cards.length) { emptyNote(out, "مفيش حضور متسجل في الشهر ده."); return; }

      var box = el("div", null, "co");
      box.appendChild(el("b", "إجمالي أجور الشهر"));
      line(box, money(total) + " جنيه");
      line(box, "عدد العمال: " + cards.length);
      if (total > 0) {
        var btn = el("button", "سجّل الأجور كمصروف");
        btn.style.marginTop = "8px";
        btn.addEventListener("click", async function(){
          var note = "أجور شهر " + month;
          var ex = await db.from("finance_entries").select("id").eq("company_id", company).eq("category", "أجور عمال").eq("note", note).limit(1);
          if (ex.error) { msg(arabicError(ex.error), "err"); return; }
          var cur = (month === today().slice(0, 7));
          var q = "تسجّل " + money(total) + " جنيه كمصروف أجور؟";
          if (cur) q += " (الشهر لسه ما خلصش)";
          if (ex.data && ex.data.length) q = "الأجور دي اتسجلت قبل كده للشهر ده. تسجلها تاني؟";
          if (!confirm(q)) return;
          btn.disabled = true;
          var date = cur ? today() : y + "-" + pad(mo) + "-" + pad(new Date(y, mo, 0).getDate());
          var ins = await db.from("finance_entries").insert({ company_id: company, kind: "expense", amount: total, category: "أجور عمال", note: note, entry_date: date });
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
