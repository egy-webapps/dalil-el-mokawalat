(function(){
  try {
    var prevShow = window.show;
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function fmt(ts){ return ts ? new Date(ts).toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" }) : null; }
    function getPos(){
      return new Promise(function(res){
        if (!navigator.geolocation) { res(null); return; }
        navigator.geolocation.getCurrentPosition(function(p){ res(p.coords); }, function(){ res(null); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      });
    }
    var MSG = {
      already_in: "سجلت حضورك النهارده قبل كده.",
      already_out: "سجلت انصرافك النهارده قبل كده.",
      not_in: "لازم تسجل حضور الأول.",
      no_worker: "حسابك مش مربوط بعامل.",
      need_location: "لازم تفعّل الموقع (GPS) وتسمح للموقع بالوصول لمكانك.",
      low_accuracy: "دقة الموقع ضعيفة. اطلع مكان مفتوح وجرّب تاني.",
      too_far: "إنت مش في مكان الشغل. البصمة بتتسجل من الموقع بس.",
      bad_action: "حصل خطأ."
    };

    var sec = el("section", null, "card hide");
    sec.id = "clock";
    var info = el("div");
    var inB = el("button", "بصمة حضور");
    var outB = el("button", "بصمة انصراف", "sec");
    inB.style.marginBottom = "8px";
    outB.style.marginBottom = "8px";
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "بصمة الحضور والانصراف"));
    sec.appendChild(info);
    sec.appendChild(inB);
    sec.appendChild(outB);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "clock") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var cb = el("button", "بصمة الحضور", "sec");
    cb.addEventListener("click", openClock);
    if (prof && lb) prof.insertBefore(cb, lb); else if (prof) prof.appendChild(cb);

    async function load(){
      info.textContent = "";
      inB.style.display = "none";
      outB.style.display = "none";
      var r = await db.rpc("my_clock_status");
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (!r.data || !r.data.length) { emptyNote(info, "حسابك مش مربوط بعامل. اطلب من المدير يربطك بإيميلك."); return; }
      var s = r.data[0];
      info.appendChild(el("b", s.worker_name));
      line(info, "الشركة: " + s.company_name);
      line(info, "حضور النهارده: " + (fmt(s.check_in) || "لسه"));
      line(info, "انصراف النهارده: " + (fmt(s.check_out) || "لسه"));
      inB.style.display = s.check_in ? "none" : "";
      outB.style.display = (s.check_in && !s.check_out) ? "" : "none";
    }

    async function openClock(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) { msg("لازم تسجل دخول الاول.", "err"); return; }
      prevShow("clock");
      sec.classList.remove("hide");
      hideMsg();
      load();
    }

    async function punch(action, btn){
      hideMsg();
      btn.disabled = true;
      msg("جاري تحديد موقعك...", "ok");
      var c = await getPos();
      var r = await db.rpc("clock_action", { p_action: action, p_lat: c ? c.latitude : null, p_lng: c ? c.longitude : null, p_acc: c ? c.accuracy : null });
      btn.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (r.data !== "ok") { msg(MSG[r.data] || "حصل خطأ.", "err"); load(); return; }
      msg(action === "in" ? "تم تسجيل حضورك." : "تم تسجيل انصرافك.", "ok");
      load();
    }

    inB.addEventListener("click", function(){ punch("in", inB); });
    outB.addEventListener("click", function(){ punch("out", outB); });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في البصمة: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
