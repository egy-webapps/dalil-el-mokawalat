(function(){
  var cid = null, tab = "workers", workers = [], token = 0;

  function el(tag, text, cls){
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function field(type, ph, req){
    var i = document.createElement("input");
    i.type = type; i.placeholder = ph || "";
    if (req) i.required = true;
    i.style.marginBottom = "8px";
    return i;
  }
  function today(){
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function money(n){ return Number(n || 0).toLocaleString("en-US"); }

  var origShow = window.show;
  var sec = el("section", null, "card hide");
  sec.id = "mgmt";
  var sel = el("select");
  sel.id = "m_company";
  var tabsBar = el("div");
  tabsBar.style.margin = "12px 0";
  var body = el("div");
  var back = el("button", "رجوع", "link");
  back.addEventListener("click", function(){ window.show("profile"); });
  sec.appendChild(el("h2", "إدارة الشركة"));
  sec.appendChild(sel);
  sec.appendChild(tabsBar);
  sec.appendChild(body);
  sec.appendChild(back);
  (document.querySelector("main") || document.body).appendChild(sec);

  window.show = function(id){
    origShow(id);
    if (id !== "mgmt") sec.classList.add("hide");
  };

  var TABS = [["workers", "العمال"], ["attendance", "الحضور والانصراف"], ["finance", "الحسابات"]];
  var tabBtns = {};
  TABS.forEach(function(t){
    var b = el("button", t[1], "sec");
    b.style.marginBottom = "8px";
    b.addEventListener("click", function(){ tab = t[0]; render(); });
    tabBtns[t[0]] = b;
    tabsBar.appendChild(b);
  });

  function render(){
    TABS.forEach(function(t){ tabBtns[t[0]].className = (t[0] === tab) ? "" : "sec"; });
    hideMsg();
    if (tab === "workers") viewWorkers();
    else if (tab === "attendance") viewAttendance();
    else viewFinance();
  }

  sel.addEventListener("change", function(){ cid = sel.value; render(); });

  async function openMgmt(){
    origShow("mgmt");
    sec.classList.remove("hide");
    sel.textContent = "";
    body.textContent = "";
    var u = await db.auth.getUser();
    if (u.error || !u.data.user) {
      window.show("home");
      msg("لازم تسجل دخول الاول.", "err");
      return;
    }
    var r = await db.from("companies").select("id,name").eq("owner_id", u.data.user.id);
    if (r.error) { msg(arabicError(r.error), "err"); return; }
    if (!r.data || !r.data.length) {
      body.appendChild(el("p", "مفيش عندك شركة. ضيف شركة الأول من إضافة شركة.", "muted"));
      return;
    }
    r.data.forEach(function(c){
      var o = el("option", c.name);
      o.value = c.id;
      sel.appendChild(o);
    });
    cid = sel.value;
    render();
  }

  var prof = document.getElementById("profile");
  var lb = document.getElementById("logoutBtn");
  if (prof && lb) {
    var mb = el("button", "إدارة الشركة", "sec");
    mb.addEventListener("click", openMgmt);
    prof.insertBefore(mb, lb);
  }

  async function loadWorkers(){
    var r = await db.from("workers").select("id,name,job,daily_wage,active").eq("company_id", cid).order("created_at", { ascending: true });
    if (r.error) { msg(arabicError(r.error), "err"); return false; }
    workers = r.data || [];
    return true;
  }

  async function viewWorkers(){
    var tk = ++token;
    body.textContent = "";
    var f = el("form");
    var n = field("text", "اسم العامل", true);
    var j = field("text", "الوظيفة (مثال: نجار)");
    var w = field("number", "الأجر اليومي بالجنيه", true);
    w.min = "0"; w.step = "any";
    var b = el("button", "إضافة عامل");
    b.type = "submit";
    f.appendChild(n); f.appendChild(j); f.appendChild(w); f.appendChild(b);
    f.addEventListener("submit", async function(e){
      e.preventDefault();
      b.disabled = true;
      var r = await db.from("workers").insert({ company_id: cid, name: n.value.trim(), job: j.value.trim() || null, daily_wage: Number(w.value) || 0 });
      b.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      msg("تمت إضافة العامل.", "ok");
      viewWorkers();
    });
    body.appendChild(f);
    var list = el("div");
    list.style.marginTop = "12px";
    body.appendChild(list);
    var ok = await loadWorkers();
    if (!ok || tk !== token) return;
    if (!workers.length) { emptyNote(list, "لسه مفيش عمال."); return; }
    workers.forEach(function(x){
      var d = el("div", null, "co");
      d.appendChild(el("b", x.name));
      line(d, "الوظيفة: " + (x.job || "-"));
      line(d, "الأجر اليومي: " + money(x.daily_wage) + " جنيه");
      var del = el("button", "حذف", "sec");
      del.style.marginTop = "8px";
      del.addEventListener("click", async function(){
        if (!confirm("تحذف " + x.name + " وكل حضوره؟")) return;
        var r = await db.from("workers").delete().eq("id", x.id);
        if (r.error) { msg(arabicError(r.error), "err"); return; }
        viewWorkers();
      });
      d.appendChild(del);
      list.appendChild(d);
    });
  }

  async function viewAttendance(){
    var tk = ++token;
    body.textContent = "";
    var d = field("date", "", true);
    d.value = today();
    body.appendChild(d);
    var sum = el("p", "", "muted");
    body.appendChild(sum);
    var list = el("div");
    body.appendChild(list);
    d.addEventListener("change", draw);
    await draw();

    async function draw(){
      if (!d.value) return;
      list.textContent = "";
      sum.textContent = "";
      var ok = await loadWorkers();
      if (!ok || tk !== token) return;
      var r = await db.from("attendance").select("worker_id,status").eq("company_id", cid).eq("work_date", d.value);
      if (tk !== token) return;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      var map = {};
      (r.data || []).forEach(function(a){ map[a.worker_id] = a.status; });
      var act = workers.filter(function(x){ return x.active; });
      if (!act.length) { emptyNote(list, "ضيف عمال الأول من تبويب العمال."); return; }
      var total = 0;
      act.forEach(function(x){
        var st = map[x.id];
        if (st === "present") total += Number(x.daily_wage);
        if (st === "half") total += Number(x.daily_wage) / 2;
        var c = el("div", null, "co");
        c.appendChild(el("b", x.name));
        line(c, "الأجر اليومي: " + money(x.daily_wage) + " جنيه");
        [["present", "حاضر"], ["half", "نص يوم"], ["absent", "غايب"]].forEach(function(o){
          var bt = el("button", o[1], st === o[0] ? "" : "sec");
          bt.style.marginTop = "6px";
          bt.addEventListener("click", async function(){
            bt.disabled = true;
            var u = await db.from("attendance").upsert({ company_id: cid, worker_id: x.id, work_date: d.value, status: o[0] }, { onConflict: "worker_id,work_date" });
            if (u.error) { bt.disabled = false; msg(arabicError(u.error), "err"); return; }
            draw();
          });
          c.appendChild(bt);
        });
        list.appendChild(c);
      });
      sum.textContent = "إجمالي أجور اليوم: " + money(total) + " جنيه";
    }
  }

  async function viewFinance(){
    var tk = ++token;
    body.textContent = "";
    var f = el("form");
    var k = el("select");
    k.style.marginBottom = "8px";
    [["expense", "مصروف"], ["income", "إيراد"]].forEach(function(o){
      var op = el("option", o[1]);
      op.value = o[0];
      k.appendChild(op);
    });
    var a = field("number", "المبلغ بالجنيه", true);
    a.min = "0.01"; a.step = "any";
    var cat = field("text", "البند (مثال: خامات، مرتبات)");
    var note = field("text", "ملاحظة (اختياري)");
    var b = el("button", "إضافة");
    b.type = "submit";
    f.appendChild(k); f.appendChild(a); f.appendChild(cat); f.appendChild(note); f.appendChild(b);
    f.addEventListener("submit", async function(e){
      e.preventDefault();
      var amt = Number(a.value);
      if (!(amt > 0)) { msg("اكتب مبلغ أكبر من صفر.", "err"); return; }
      b.disabled = true;
      var r = await db.from("finance_entries").insert({ company_id: cid, kind: k.value, amount: amt, category: cat.value.trim() || null, note: note.value.trim() || null, entry_date: today() });
      b.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      msg("تمت الإضافة.", "ok");
      viewFinance();
    });
    body.appendChild(f);
    var m = field("month", "", true);
    m.value = today().slice(0, 7);
    m.style.marginTop = "12px";
    body.appendChild(m);
    var box = el("div", null, "co");
    body.appendChild(box);
    var list = el("div");
    body.appendChild(list);
    m.addEventListener("change", draw);
    await draw();

    async function draw(){
      if (!m.value) return;
      var p = m.value.split("-"), ny = Number(p[0]), nm = Number(p[1]) + 1;
      if (nm > 12) { nm = 1; ny++; }
      var start = m.value + "-01";
      var end = ny + "-" + String(nm).padStart(2, "0") + "-01";
      var r = await db.from("finance_entries").select("id,kind,amount,category,note,entry_date").eq("company_id", cid).gte("entry_date", start).lt("entry_date", end).order("entry_date", { ascending: false }).order("created_at", { ascending: false });
      if (tk !== token) return;
      box.textContent = "";
      list.textContent = "";
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      var rows = r.data || [], inc = 0, exp = 0;
      rows.forEach(function(x){
        if (x.kind === "income") inc += Number(x.amount);
        else exp += Number(x.amount);
      });
      box.appendChild(el("b", "ملخص الشهر"));
      line(box, "الإيرادات: " + money(inc) + " جنيه");
      line(box, "المصروفات: " + money(exp) + " جنيه");
      line(box, "الصافي: " + money(inc - exp) + " جنيه");
      if (!rows.length) { emptyNote(list, "مفيش حركات في الشهر ده."); return; }
      rows.forEach(function(x){
        var c = el("div", null, "co");
        c.appendChild(el("b", (x.kind === "income" ? "إيراد: " : "مصروف: ") + money(x.amount) + " جنيه"));
        if (x.category) line(c, "البند: " + x.category);
        if (x.note) line(c, x.note);
        line(c, "التاريخ: " + x.entry_date);
        var del = el("button", "حذف", "sec");
        del.style.marginTop = "8px";
        del.addEventListener("click", async function(){
          if (!confirm("تحذف الحركة دي؟")) return;
          var d = await db.from("finance_entries").delete().eq("id", x.id);
          if (d.error) { msg(arabicError(d.error), "err"); return; }
          draw();
        });
        c.appendChild(del);
        list.appendChild(c);
      });
    }
  }
})();
