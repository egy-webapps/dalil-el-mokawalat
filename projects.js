(function(){
  try {
    var prevShow = window.show, all = [];
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function inp(type, ph, req){ var i = document.createElement("input"); i.type = type; i.placeholder = ph || ""; if (req) i.required = true; i.style.marginBottom = "8px"; return i; }

    var sec = el("section", null, "card hide");
    sec.id = "projects";
    var search = inp("search", "ابحث بالمشروع أو المحافظة");
    var list = el("div");
    var addBtn = el("button", "إضافة مشروع", "sec");
    addBtn.style.marginBottom = "8px";
    var form = el("form");
    form.style.display = "none";
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });

    var cs = el("select"); cs.style.marginBottom = "8px";
    var ti = inp("text", "اسم المشروع", true);
    var de = document.createElement("textarea");
    de.rows = 4; de.placeholder = "تفاصيل المشروع"; de.style.marginBottom = "8px";
    var go;
    if (typeof GOVS !== "undefined") {
      go = el("select"); go.style.marginBottom = "8px";
      var f0 = el("option", "اختار المحافظة"); f0.value = ""; go.appendChild(f0);
      GOVS.forEach(function(g){ var o = el("option", g); o.value = g; go.appendChild(o); });
    } else { go = inp("text", "المحافظة"); }
    var st = el("select"); st.style.marginBottom = "8px";
    ["جاري", "منتهي", "متوقف"].forEach(function(s){ var o = el("option", s); o.value = s; st.appendChild(o); });
    var sb = el("button", "نشر"); sb.type = "submit";
    [cs, ti, de, go, st, sb].forEach(function(x){ form.appendChild(x); });

    sec.appendChild(el("h2", "المشاريع"));
    sec.appendChild(search);
    sec.appendChild(addBtn);
    sec.appendChild(form);
    sec.appendChild(list);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "projects") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var pb = el("button", "المشاريع", "sec");
    pb.addEventListener("click", openProjects);
    if (prof && lb) prof.insertBefore(pb, lb); else if (prof) prof.appendChild(pb);

    function render(){
      list.textContent = "";
      var q = search.value.trim().toLowerCase();
      var rows = all.filter(function(p){
        return ((p.title || "") + " " + (p.governorate || "")).toLowerCase().indexOf(q) > -1;
      });
      if (!rows.length) { emptyNote(list, "مفيش مشاريع دلوقتي."); return; }
      rows.forEach(function(p){
        var d = el("div", null, "co");
        d.appendChild(el("b", p.title));
        line(d, "الشركة: " + ((p.companies && p.companies.name) || "-"));
        line(d, "المحافظة: " + (p.governorate || "-"));
        line(d, "الحالة: " + p.status);
        if (p.description) { var x = el("p", p.description); x.style.whiteSpace = "pre-wrap"; d.appendChild(x); }
        list.appendChild(d);
      });
    }

    async function load(){
      list.textContent = "";
      list.appendChild(el("p", "جاري التحميل...", "muted"));
      var r = await db.from("projects").select("id,title,description,governorate,status,companies(name)").order("created_at", { ascending: false });
      if (r.error) { list.textContent = ""; msg(arabicError(r.error), "err"); return; }
      all = r.data || [];
      render();
    }

    async function openProjects(){
      prevShow("projects");
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
      if (!r.data || !r.data.length) { msg("لازم يكون عندك شركة موثّقة عشان تضيف مشروع.", "err"); return; }
      cs.textContent = "";
      r.data.forEach(function(c){ var o = el("option", c.name); o.value = c.id; cs.appendChild(o); });
      form.style.display = "block";
    });

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      sb.disabled = true;
      var r = await db.from("projects").insert({ company_id: cs.value, title: ti.value.trim(), description: de.value.trim() || null, governorate: go.value.trim() || null, status: st.value });
      sb.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      form.reset();
      form.style.display = "none";
      msg("تمت إضافة المشروع.", "ok");
      load();
    });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في المشاريع: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
