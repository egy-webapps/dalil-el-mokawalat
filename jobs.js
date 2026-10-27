(function(){
  try {
    var prevShow = window.show, all = [];
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function inp(type, ph, req){ var i = document.createElement("input"); i.type = type; i.placeholder = ph || ""; if (req) i.required = true; i.style.marginBottom = "8px"; return i; }
    function pad(n){ return String(n).padStart(2, "0"); }
    function today(){ var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

    var sec = el("section", null, "card hide");
    sec.id = "jobs";
    var search = inp("search", "ابحث بالوظيفة أو المحافظة");
    var list = el("div");
    var addBtn = el("button", "نشر وظيفة", "sec");
    addBtn.style.marginBottom = "8px";
    var form = el("form");
    form.style.display = "none";
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });

    var cs = el("select"); cs.style.marginBottom = "8px";
    var ti = inp("text", "عنوان الوظيفة", true);
    var de = document.createElement("textarea");
    de.rows = 4; de.placeholder = "تفاصيل الوظيفة"; de.style.marginBottom = "8px";
    var go;
    if (typeof GOVS !== "undefined") {
      go = el("select"); go.style.marginBottom = "8px";
      var f0 = el("option", "اختار المحافظة"); f0.value = ""; go.appendChild(f0);
      GOVS.forEach(function(g){ var o = el("option", g); o.value = g; go.appendChild(o); });
    } else { go = inp("text", "المحافظة"); }
    var sa = inp("text", "المرتب (مثال: 6000 جنيه)");
    var dl = inp("date", "آخر موعد");
    var sb = el("button", "نشر"); sb.type = "submit";
    [cs, ti, de, go, sa, dl, sb].forEach(function(x){ form.appendChild(x); });

    sec.appendChild(el("h2", "الوظايف"));
    sec.appendChild(search);
    sec.appendChild(addBtn);
    sec.appendChild(form);
    sec.appendChild(list);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "jobs") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var jb = el("button", "الوظايف", "sec");
    jb.addEventListener("click", openJobs);
    if (prof && lb) prof.insertBefore(jb, lb); else if (prof) prof.appendChild(jb);

    function render(){
      list.textContent = "";
      var q = search.value.trim().toLowerCase(), t = today();
      var rows = all.filter(function(j){
        if (j.deadline && j.deadline < t) return false;
        return ((j.title || "") + " " + (j.governorate || "")).toLowerCase().indexOf(q) > -1;
      });
      if (!rows.length) { emptyNote(list, "مفيش وظايف دلوقتي."); return; }
      rows.forEach(function(j){
        var d = el("div", null, "co");
        d.appendChild(el("b", j.title));
        line(d, "الشركة: " + ((j.companies && j.companies.name) || "-"));
        line(d, "المحافظة: " + (j.governorate || "-"));
        if (j.salary_text) line(d, "المرتب: " + j.salary_text);
        if (j.deadline) line(d, "آخر موعد: " + j.deadline);
        if (j.description) { var p = el("p", j.description); p.style.whiteSpace = "pre-wrap"; d.appendChild(p); }
        list.appendChild(d);
      });
    }

    async function load(){
      list.textContent = "";
      list.appendChild(el("p", "جاري التحميل...", "muted"));
      var r = await db.from("jobs").select("id,title,description,governorate,salary_text,deadline,companies(name)").order("created_at", { ascending: false });
      if (r.error) { list.textContent = ""; msg(arabicError(r.error), "err"); return; }
      all = r.data || [];
      render();
    }

    async function openJobs(){
      prevShow("jobs");
      sec.classList.remove("hide");
      form.style.display = "none";
      search.value = "";
      load();
    }

    search.addEventListener("input", render);

    addBtn.addEventListener("click", async function(){
      if (form.style.display === "block") { form.style.display = "none"; return; }
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { msg("لازم تسجل دخول الاول.", "err"); return; }
      var r = await db.from("companies").select("id,name").eq("owner_id", u.data.user.id).eq("verification_status", "verified");
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (!r.data || !r.data.length) { msg("لازم يكون عندك شركة موثّقة عشان تنشر وظيفة.", "err"); return; }
      cs.textContent = "";
      r.data.forEach(function(c){ var o = el("option", c.name); o.value = c.id; cs.appendChild(o); });
      form.style.display = "block";
    });

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      sb.disabled = true;
      var r = await db.from("jobs").insert({ company_id: cs.value, title: ti.value.trim(), description: de.value.trim() || null, governorate: go.value.trim() || null, salary_text: sa.value.trim() || null, deadline: dl.value || null });
      sb.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      form.reset();
      form.style.display = "none";
      msg("تم نشر الوظيفة.", "ok");
      load();
    });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في الوظايف: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
