(function(){
  try {
    var prevShow = window.show, flag = false, ftimer = null, tk = 0;
    var ROLES = [["manager", "مدير"], ["accountant", "محاسب"], ["storekeeper", "أمين مخزن"], ["attendance", "مسؤول حضور"]];
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function roleName(r){ for (var i = 0; i < ROLES.length; i++) if (ROLES[i][0] === r) return ROLES[i][1]; return r; }

    var origFrom = db.from.bind(db);
    db.from = function(t){
      var b = origFrom(t);
      if (t !== "companies" || !flag) return b;
      var origSelect = b.select.bind(b);
      b.select = function(cols){
        var q = origSelect.apply(null, arguments);
        if (cols === "id,name") {
          var origEq = q.eq.bind(q);
          q.eq = function(col){
            if (col === "owner_id" && flag) { flag = false; return db.rpc("my_team_companies"); }
            return origEq.apply(null, arguments);
          };
        }
        return q;
      };
      return b;
    };

    var prof = document.getElementById("profile");
    if (prof) {
      Array.prototype.forEach.call(prof.querySelectorAll("button"), function(b){
        var t = b.textContent.trim();
        if (t === "إدارة الشركة" || t === "تقرير الشهر" || t === "المخزن") {
          b.addEventListener("click", function(){
            flag = true;
            clearTimeout(ftimer);
            ftimer = setTimeout(function(){ flag = false; }, 10000);
          }, true);
        }
      });
    }

    var sec = el("section", null, "card hide");
    sec.id = "team";
    var cs = el("select");
    cs.style.marginBottom = "8px";
    var form = el("form");
    var em = document.createElement("input");
    em.type = "email"; em.placeholder = "إيميل الشخص"; em.required = true; em.dir = "ltr"; em.style.marginBottom = "8px";
    var rs = el("select");
    rs.style.marginBottom = "8px";
    ROLES.forEach(function(r){ var o = el("option", r[1]); o.value = r[0]; rs.appendChild(o); });
    var ab = el("button", "إضافة للفريق");
    ab.type = "submit";
    form.appendChild(em); form.appendChild(rs); form.appendChild(ab);
    var note = el("p", "الشخص لازم يكون عامل حساب في الموقع بنفس الإيميل الأول.", "muted");
    var list = el("div");
    list.style.marginTop = "12px";
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "فريق الشركة"));
    sec.appendChild(cs); sec.appendChild(form); sec.appendChild(note); sec.appendChild(list); sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "team") sec.classList.add("hide"); };

    var lb = document.getElementById("logoutBtn");
    var tb = el("button", "الفريق", "sec");
    tb.addEventListener("click", openTeam);
    if (prof && lb) prof.insertBefore(tb, lb); else if (prof) prof.appendChild(tb);

    cs.addEventListener("change", draw);

    async function openTeam(){
      prevShow("team");
      sec.classList.remove("hide");
      cs.textContent = "";
      list.textContent = "";
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { window.show("home"); msg("لازم تسجل دخول الاول.", "err"); return; }
      var r = await db.from("companies").select("id,name").eq("owner_id", u.data.user.id);
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (!r.data || !r.data.length) {
        form.style.display = "none";
        emptyNote(list, "الفريق متاح لصاحب الشركة بس. ضيف شركة الأول.");
        return;
      }
      form.style.display = "";
      r.data.forEach(function(c){ var o = el("option", c.name); o.value = c.id; cs.appendChild(o); });
      draw();
    }

    async function draw(){
      var cid = cs.value;
      if (!cid) return;
      var my = ++tk;
      list.textContent = "";
      list.appendChild(el("p", "جاري التحميل...", "muted"));
      var r = await db.rpc("list_team", { p_company: cid });
      if (my !== tk) return;
      list.textContent = "";
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (!r.data || !r.data.length) { emptyNote(list, "لسه مفيش أعضاء في الفريق."); return; }
      r.data.forEach(function(m){
        var d = el("div", null, "co");
        var b = el("b", m.email);
        b.dir = "ltr";
        d.appendChild(b);
        line(d, "الصلاحية: " + roleName(m.role));
        var del = el("button", "إزالة", "sec");
        del.style.marginTop = "8px";
        del.addEventListener("click", async function(){
          if (!confirm("تشيل " + m.email + " من الفريق؟")) return;
          var x = await db.rpc("remove_team_member", { p_company: cid, p_user: m.user_id });
          if (x.error) { msg(arabicError(x.error), "err"); return; }
          draw();
        });
        d.appendChild(del);
        list.appendChild(d);
      });
    }

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      var cid = cs.value;
      if (!cid) return;
      ab.disabled = true;
      var r = await db.rpc("add_team_member", { p_company: cid, p_email: em.value.trim(), p_role: rs.value });
      ab.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (r.data === "not_found") { msg("الإيميل ده مش مسجل في الموقع. اطلب منه يعمل حساب الأول.", "err"); return; }
      em.value = "";
      msg("تمت إضافته للفريق.", "ok");
      draw();
    });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في الفريق: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
