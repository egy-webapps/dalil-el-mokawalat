(function(){
  try {
    var prevShow = window.show, all = [], uid = null;
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function inp(type, ph, req){ var i = document.createElement("input"); i.type = type; i.placeholder = ph || ""; if (req) i.required = true; i.style.marginBottom = "8px"; return i; }

    var sec = el("section", null, "card hide");
    sec.id = "subs";
    var search = inp("search", "ابحث بالتخصص أو المحافظة");
    var list = el("div");
    var addBtn = el("button", "سجّل نفسك كمقاول باطن", "sec");
    addBtn.style.marginBottom = "8px";
    var form = el("form");
    form.style.display = "none";
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });

    var nm = inp("text", "الاسم", true);
    var sp = inp("text", "التخصص (مثال: سباك، كهربائي)", true);
    var go;
    if (typeof GOVS !== "undefined") {
      go = el("select"); go.style.marginBottom = "8px";
      var f0 = el("option", "اختار المحافظة"); f0.value = ""; go.appendChild(f0);
      GOVS.forEach(function(g){ var o = el("option", g); o.value = g; go.appendChild(o); });
    } else { go = inp("text", "المحافظة"); }
    var ph = inp("tel", "رقم التليفون", true);
    var de = document.createElement("textarea");
    de.rows = 3; de.placeholder = "نبذة عن خبرتك (اختياري)"; de.style.marginBottom = "8px";
    var sb = el("button", "نشر"); sb.type = "submit";
    [nm, sp, go, ph, de, sb].forEach(function(x){ form.appendChild(x); });

    sec.appendChild(el("h2", "المقاولين من الباطن"));
    sec.appendChild(search);
    sec.appendChild(addBtn);
    sec.appendChild(form);
    sec.appendChild(list);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "subs") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var pb = el("button", "المقاولين من الباطن", "sec");
    pb.addEventListener("click", openSubs);
    if (prof && lb) prof.insertBefore(pb, lb); else if (prof) prof.appendChild(pb);

    function render(){
      list.textContent = "";
      var q = search.value.trim().toLowerCase();
      var rows = all.filter(function(s){
        return ((s.name || "") + " " + (s.specialty || "") + " " + (s.governorate || "")).toLowerCase().indexOf(q) > -1;
      });
      if (!rows.length) { emptyNote(list, "مفيش مقاولين باطن دلوقتي."); return; }
      rows.forEach(function(s){
        var d = el("div", null, "co");
        d.appendChild(el("b", s.name));
        line(d, "التخصص: " + s.specialty);
        line(d, "المحافظة: " + (s.governorate || "-"));
        line(d, "التليفون: " + (s.phone || "-"));
        if (s.description) { var x = el("p", s.description); x.style.whiteSpace = "pre-wrap"; d.appendChild(x); }
        if (uid && s.owner_id === uid) {
          var del = el("button", "حذف إعلاني", "sec");
          del.style.marginTop = "8px";
          del.addEventListener("click", async function(){
            if (!confirm("تحذف إعلانك؟")) return;
            var r = await db.from("subcontractors").delete().eq("id", s.id);
            if (r.error) { msg(arabicError(r.error), "err"); return; }
            load();
          });
          d.appendChild(del);
        }
        list.appendChild(d);
      });
    }

    async function load(){
      list.textContent = "";
      list.appendChild(el("p", "جاري التحميل...", "muted"));
      var r = await db.from("subcontractors").select("id,owner_id,name,specialty,governorate,phone,description").order("created_at", { ascending: false });
      if (r.error) { list.textContent = ""; msg(arabicError(r.error), "err"); return; }
      all = r.data || [];
      render();
    }

    async function openSubs(){
      prevShow("subs");
      sec.classList.remove("hide");
      form.style.display = "none";
      search.value = "";
      var u = await db.auth.getUser();
      uid = (u.data && u.data.user) ? u.data.user.id : null;
      load();
    }

    search.addEventListener("input", render);

    addBtn.addEventListener("click", function(){
      if (!uid) { msg("لازم تسجل دخول الاول.", "err"); return; }
      form.style.display = (form.style.display === "block") ? "none" : "block";
    });

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      sb.disabled = true;
      var r = await db.from("subcontractors").insert({ owner_id: uid, name: nm.value.trim(), specialty: sp.value.trim(), governorate: go.value.trim() || null, phone: ph.value.trim(), description: de.value.trim() || null });
      sb.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      form.reset();
      form.style.display = "none";
      msg("تم نشر إعلانك.", "ok");
      load();
    });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في المقاولين الباطن: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
