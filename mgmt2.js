(function(){
  var sel = document.getElementById("m_company");
  if (!sel) return;
  var tabsBar = sel.nextElementSibling;
  var body = tabsBar && tabsBar.nextElementSibling;
  if (!tabsBar || !body) return;
  var tk = 0;

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

  var mine = el("button", "تقرير الشهر", "sec");
  mine.style.marginBottom = "8px";
  mine.addEventListener("click", view);
  tabsBar.appendChild(mine);

  Array.prototype.forEach.call(tabsBar.children, function(b){
    if (b !== mine) b.addEventListener("click", function(){ mine.className = "sec"; });
  });
  sel.addEventListener("change", function(){ mine.className = "sec"; });
  var prof = document.getElementById("profile");
  if (prof) {
    Array.prototype.forEach.call(prof.querySelectorAll("button"), function(b){
      if (b.textContent.trim() === "إدارة الشركة") {
        b.addEventListener("click", function(){ mine.className = "sec"; });
      }
    });
  }

  async function view(){
    ++tk;
    Array.prototype.forEach.call(tabsBar.children, function(b){
      b.className = (b === mine) ? "" : "sec";
    });
    hideMsg();
    body.textContent = "";
    var cid = sel.value;
    if (!cid) { emptyNote(body, "اختار شركة الأول."); return; }
    var m = document.createElement("input");
    m.type = "month";
    m.value = today().slice(0, 7);
    m.style.marginBottom = "8px";
    body.appendChild(m);
    var out = el("div");
    body.appendChild(out);
    m.addEventListener("change", draw);
    await draw();

    async function draw(){
      if (!m.value) return;
      var my = ++tk;
      out.textContent = "";
      out.appendChild(el("p", "جاري التحميل...", "muted"));
      var p = m.value.split("-");
      var y = Number(p[0]), mo = Number(p[1]);
      var ny = y, nm = mo + 1;
      if (nm > 12) { nm = 1; ny++; }
      var start = y + "-" + pad(mo) + "-01";
      var end = ny + "-" + pad(nm) + "-01";

      var w = await db.from("workers").select("id,name,job,daily_wage").eq("company_id", cid).order("created_at", { ascending: true });
      if (my !== tk) return;
      if (w.error) { out.textContent = ""; msg(arabicError(w.error), "err"); return; }

      var rows = [], from = 0, size = 1000;
      while (true) {
        var r = await db.from("attendance").select("worker_id,status").eq("company_id", cid).gte("work_date", start).lt("work_date", end).order("work_date").order("worker_id").range(from, from + size - 1);
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
          var note = "أجور شهر " + m.value;
          var ex = await db.from("finance_entries").select("id").eq("company_id", cid).eq("category", "أجور عمال").eq("note", note).limit(1);
          if (ex.error) { msg(arabicError(ex.error), "err"); return; }
          var q = "تسجّل " + money(total) + " جنيه كمصروف أجور؟";
          if (m.value === today().slice(0, 7)) q += " (الشهر لسه ما خلصش)";
          if (ex.data && ex.data.length) q = "الأجور دي اتسجلت قبل كده للشهر ده. تسجلها تاني؟";
          if (!confirm(q)) return;
          btn.disabled =
