(function(){
  try {
    var prevShow = window.show, tk = 0;
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function hd(x){ var b = el("b", x); b.style.cssText = "display:block;margin:14px 0 6px;"; return b; }
    function fmt(ts){ return new Date(ts).toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" }); }
    function today(){ return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); }
    function getPos(){
      return new Promise(function(res){
        if (!navigator.geolocation) { res(null); return; }
        navigator.geolocation.getCurrentPosition(function(p){ res(p.coords); }, function(){ res(null); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      });
    }

    var sec = el("section", null, "card hide");
    sec.id = "clockmgr";
    var cs = el("select");
    cs.style.marginBottom = "8px";
    var dt = document.createElement("input");
    dt.type = "date";
    dt.value = today();
    dt.style.marginBottom = "8px";
    var body = el("div");
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "بصمة العمال"));
    sec.appendChild(cs);
    sec.appendChild(dt);
    sec.appendChild(body);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "clockmgr") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var mb = el("button", "بصمة العمال", "sec");
    mb.addEventListener("click", openMgr);
    if (prof && lb) prof.insertBefore(mb, lb); else if (prof) prof.appendChild(mb);

    cs.addEventListener("change", draw);
    dt.addEventListener("change", draw);

    async function openMgr(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { msg("لازم تسجل دخول الاول.", "err"); return; }
      prevShow("clockmgr");
      sec.classList.remove("hide");
      hideMsg();
      cs.textContent = "";
      body.textContent = "";
      dt.value = today();
      var r = await db.from("companies").select("id,name").eq("owner_id", u.data.user.id);
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (!r.data || !r.data.length) { emptyNote(body, "مفيش عندك شركة. ضيف شركة الأول."); return; }
      r.data.forEach(function(c){ var o = el("option", c.name); o.value = c.id; cs.appendChild(o); });
      draw();
    }

    async function draw(){
      var cid = cs.value;
      if (!cid || !dt.value) return;
      var my = ++tk, date = dt.value;
      body.textContent = "";
      body.appendChild(el("p", "جاري التحميل...", "muted"));
      var w = await db.from("workers").select("id,name,user_id").eq("company_id", cid).order("created_at", { ascending: true });
      var a = await db.from("attendance").select("worker_id,check_in,check_out,in_dist_m,out_dist_m").eq("company_id", cid).eq("work_date", date);
      var s = await db.from("work_sites").select("id,name,radius_m").eq("company_id", cid).order("created_at", { ascending: true });
      if (my !== tk) return;
      body.textContent = "";
      var err = w.error || a.error || s.error;
      if (err) { msg(arabicError(err), "err"); return; }

      body.appendChild(hd("مواقع الشغل"));
      if (!s.data.length) body.appendChild(el("p", "مفيش موقع متحدد دلوقتي، فالبصمة بتشتغل من أي مكان.", "muted"));
      s.data.forEach(function(x){
        var d = el("div", null, "co");
        d.appendChild(el("b", x.name));
        line(d, "النطاق: " + x.radius_m + " متر");
        var del = el("button", "حذف الموقع", "sec");
        del.style.marginTop = "8px";
        del.addEventListener("click", async function(){
          if (!confirm("تحذف الموقع ده؟")) return;
          var r = await db.from("work_sites").delete().eq("id", x.id);
          if (r.error) { msg(arabicError(r.error), "err"); return; }
          draw();
        });
        d.appendChild(del);
        body.appendChild(d);
      });
      var nm = document.createElement("input");
      nm.type = "text";
      nm.placeholder = "اسم الموقع (مثال: مشروع المنيا)";
      nm.style.marginBottom = "8px";
      var ab = el("button", "حدد موقع الشغل هنا (وإنت واقف فيه)");
      ab.addEventListener("click", async function(){
        ab.disabled = true;
        msg("جاري تحديد موقعك...", "ok");
        var c = await getPos();
        if (!c) { ab.disabled = false; msg("مقدرتش أحدد موقعك. فعّل الموقع (GPS) واسمح للموقع بالوصول.", "err"); return; }
        if (c.accuracy > 100) { ab.disabled = false; msg("دقة الموقع ضعيفة (" + Math.round(c.accuracy) + " متر). اطلع مكان مفتوح وجرّب تاني.", "err"); return; }
        var r = await db.from("work_sites").insert({ company_id: cid, name: nm.value.trim() || "الموقع", lat: c.latitude, lng: c.longitude, radius_m: 150 });
        ab.disabled = false;
        if (r.error) { msg(arabicError(r.error), "err"); return; }
        msg("تم تحديد موقع الشغل.", "ok");
        draw();
      });
      body.appendChild(nm);
      body.appendChild(ab);

      body.appendChild(hd("حضور وانصراف العمال - " + date));
      if (!w.data.length) { emptyNote(body, "لسه مفيش عمال. ضيفهم من إدارة الشركة."); return; }
      var map = {};
      (a.data || []).forEach(function(r){ map[r.worker_id] = r; });
      w.data.forEach(function(x){
        var r = map[x.id], c = el("div", null, "co");
        c.appendChild(el("b", x.name));
        if (r && r.check_in) line(c, "دخل: " + fmt(r.check_in) + (r.in_dist_m != null ? " (على بعد " + r.in_dist_m + " متر)" : ""));
        else line(c, "لسه ما دخلش");
        if (r && r.check_out) line(c, "خرج: " + fmt(r.check_out) + (r.out_dist_m != null ? " (على بعد " + r.out_dist_m + " متر)" : ""));
        else if (r && r.check_in) line(c, "لسه ما خرجش");
        if (x.user_id) {
          line(c, "مربوط بحساب");
        } else {
          var em = document.createElement("input");
          em.type = "email";
          em.placeholder = "إيميل حساب العامل";
          em.dir = "ltr";
          em.style.cssText = "margin-top:8px;margin-bottom:8px;";
          var lbn = el("button", "ربط بالحساب", "sec");
          lbn.addEventListener("click", async function(){
            var v = em.value.trim();
            if (!v) { msg("اكتب إيميل العامل.", "err"); return; }
            lbn.disabled = true;
            var r2 = await db.rpc("link_worker", { p_worker: x.id, p_email: v });
            lbn.disabled = false;
            if (r2.error) { msg(arabicError(r2.error), "err"); return; }
            if (r2.data === "not_found") { msg("الإيميل ده مش مسجل في الموقع. اطلب من العامل يعمل حساب الأول.", "err"); return; }
            if (r2.data === "taken") { msg("الحساب ده مربوط بعامل تاني.", "err"); return; }
            msg("تم ربط العامل بالحساب.", "ok");
            draw();
          });
          c.appendChild(em);
          c.appendChild(lbn);
        }
        body.appendChild(c);
      });
    }
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في بصمة العمال: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
