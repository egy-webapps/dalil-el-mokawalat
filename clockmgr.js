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
    function toNum(v){
      var s = String(v == null ? "" : v).trim()
        .replace(/[\u0660-\u0669]/g, function(d){ return String(d.charCodeAt(0) - 1632); })
        .replace(/[\u06F0-\u06F9]/g, function(d){ return String(d.charCodeAt(0) - 1776); })
        .replace(/[\u066B\u060C,]/g, ".")
        .replace(/\s/g, "");
      if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
      return Number(s);
    }
    function dist(a1, o1, a2, o2){
      var R = 6371000, t = Math.PI / 180;
      var dA = (a2 - a1) * t, dO = (o2 - o1) * t;
      var h = Math.sin(dA / 2) * Math.sin(dA / 2) + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dO / 2) * Math.sin(dO / 2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }
    function inp(type, ph){
      var i = document.createElement("input");
      i.type = type; i.placeholder = ph || "";
      i.style.marginBottom = "8px";
      return i;
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
      var a = await db.from("attendance").select("worker_id,check_in,check_out,in_dist_m,out_dist_m,in_site,out_site").eq("company_id", cid).eq("work_date", date);
      if (a.error) a = await db.from("attendance").select("worker_id,check_in,check_out,in_dist_m,out_dist_m").eq("company_id", cid).eq("work_date", date);
      var s = await db.from("work_sites").select("id,name,radius_m,lat,lng").eq("company_id", cid).order("created_at", { ascending: true });
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
        if (x.lat != null && x.lng != null) {
          var mp = el("a", "\u{1F4CD} عرض على الخريطة");
          mp.href = "https://www.google.com/maps?q=" + x.lat + "," + x.lng;
          mp.target = "_blank";
          mp.rel = "noopener";
          mp.style.cssText = "display:inline-block;margin:4px 0;";
          d.appendChild(mp);
        }

        var eb = el("button", "تعديل الموقع", "sec");
        eb.type = "button";
        eb.style.marginTop = "8px";
        var ef = el("div");
        ef.style.cssText = "display:none;margin-top:8px;";
        var en = inp("text", "اسم الموقع");
        en.value = x.name;
        var er = inp("text", "النطاق بالمتر (مثال: 150)");
        er.setAttribute("inputmode", "decimal");
        er.value = String(x.radius_m);
        var es = el("button", "حفظ التعديل");
        es.type = "button";
        var rl = el("button", "نقل الموقع لمكاني الحالي", "sec");
        rl.type = "button";
        ef.appendChild(en); ef.appendChild(er); ef.appendChild(es); ef.appendChild(rl);
        eb.addEventListener("click", function(){ ef.style.display = ef.style.display === "none" ? "block" : "none"; });

        es.addEventListener("click", async function(){
          var nmv = en.value.trim();
          var rv = toNum(er.value);
          if (!nmv) { msg("اكتب اسم الموقع.", "err"); return; }
          if (isNaN(rv) || rv < 20 || rv > 2000) { msg("النطاق لازم يكون رقم بين 20 و2000 متر.", "err"); return; }
          es.disabled = true;
          var r = await db.from("work_sites").update({ name: nmv, radius_m: Math.round(rv) }).eq("id", x.id).select("id");
          es.disabled = false;
          if (r.error) { msg(arabicError(r.error), "err"); return; }
          if (!r.data || !r.data.length) { msg("التعديل ما اتحفظش. غالباً مفيش صلاحية تعديل على جدول المواقع في Supabase.", "err"); return; }
          msg("تم تعديل الموقع.", "ok");
          draw();
        });

        rl.addEventListener("click", async function(){
          if (!confirm("تنقل موقع \"" + x.name + "\" لمكانك الحالي؟")) return;
          rl.disabled = true;
          msg("جاري تحديد موقعك...", "ok");
          var c = await getPos();
          if (!c) { rl.disabled = false; msg("مقدرتش أحدد موقعك. فعّل الموقع (GPS) واسمح للموقع بالوصول.", "err"); return; }
          if (c.accuracy > 100) { rl.disabled = false; msg("دقة الموقع ضعيفة (" + Math.round(c.accuracy) + " متر). اطلع مكان مفتوح وجرّب تاني.", "err"); return; }
          var r = await db.from("work_sites").update({ lat: c.latitude, lng: c.longitude }).eq("id", x.id).select("id");
          rl.disabled = false;
          if (r.error) { msg(arabicError(r.error), "err"); return; }
          if (!r.data || !r.data.length) { msg("التعديل ما اتحفظش. غالباً مفيش صلاحية تعديل على جدول المواقع في Supabase.", "err"); return; }
          msg("تم نقل الموقع لمكانك الحالي.", "ok");
          draw();
        });

        var del = el("button", "حذف الموقع", "sec");
        del.style.marginTop = "8px";
        del.addEventListener("click", async function(){
          if (!confirm("تحذف الموقع ده؟")) return;
          var r = await db.from("work_sites").delete().eq("id", x.id);
          if (r.error) { msg(arabicError(r.error), "err"); return; }
          draw();
        });
        d.appendChild(eb);
        d.appendChild(ef);
        d.appendChild(del);
        body.appendChild(d);
      });

      var nm = document.createElement("input");
      nm.type = "text";
      nm.placeholder = "اسم الموقع (مثال: الادارة)";
      nm.style.marginBottom = "8px";
      var ab = el("button", "حدد موقع الشغل هنا (وإنت واقف فيه)");
      ab.addEventListener("click", async function(){
        var nmv = nm.value.trim();
        if (!nmv) { msg("اكتب اسم الموقع الأول (مثال: الادارة).", "err"); return; }
        ab.disabled = true;
        msg("جاري تحديد موقعك...", "ok");
        var c = await getPos();
        if (!c) { ab.disabled = false; msg("مقدرتش أحدد موقعك. فعّل الموقع (GPS) واسمح للموقع بالوصول.", "err"); return; }
        if (c.accuracy > 100) { ab.disabled = false; msg("دقة الموقع ضعيفة (" + Math.round(c.accuracy) + " متر). اطلع مكان مفتوح وجرّب تاني.", "err"); return; }
        var near = null;
        s.data.forEach(function(x){
          if (x.lat == null || x.lng == null) return;
          var dd = dist(c.latitude, c.longitude, x.lat, x.lng);
          if (dd < 50 && (!near || dd < near.d)) near = { d: dd, name: x.name };
        });
        if (near && !confirm("فيه موقع قريب جداً (\"" + near.name + "\" على بعد " + Math.round(near.d) + " متر). تضيف موقع جديد برضه؟")) {
          ab.disabled = false;
          hideMsg();
          return;
        }
        var r = await db.from("work_sites").insert({ company_id: cid, name: nmv, lat: c.latitude, lng: c.longitude, radius_m: 150 });
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
        if (r && r.check_in) line(c, "دخل: " + fmt(r.check_in) + (r.in_site ? " من " + r.in_site : "") + (r.in_dist_m != null ? " (على بعد " + r.in_dist_m + " متر)" : ""));
        else line(c, "لسه ما دخلش");
        if (r && r.check_out) line(c, "خرج: " + fmt(r.check_out) + (r.out_site ? " من " + r.out_site : "") + (r.out_dist_m != null ? " (على بعد " + r.out_dist_m + " متر)" : ""));
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
