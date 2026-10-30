(function(){
  try {
    var sec = document.getElementById("subadmin");
    var prof = document.getElementById("profile");
    if (!sec || !prof) return;
    var h = sec.querySelector("h2");
    if (!h) return;
    var label = "قفل الكل (مسح كل الاشتراكات وتشغيل القفل)";
    var btn = document.createElement("button");
    btn.className = "sec";
    btn.style.cssText = "margin:8px 0;";
    btn.textContent = label;
    var armed = false, t = null;
    function disarm(){ armed = false; btn.textContent = label; clearTimeout(t); }
    btn.addEventListener("click", async function(){
      if (!armed) {
        armed = true;
        btn.textContent = "اضغط تاني للتأكيد: هيتقفل على كل الشركات حتى شركتك";
        clearTimeout(t);
        t = setTimeout(disarm, 8000);
        return;
      }
      disarm();
      btn.disabled = true;
      var r = await db.rpc("admin_clear_all_subscriptions");
      btn.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      var bs = prof.querySelectorAll("button");
      for (var i = 0; i < bs.length; i++) {
        if (bs[i].textContent.trim() === "الاشتراكات") { bs[i].click(); break; }
      }
      setTimeout(function(){ msg("تم قفل الكل. افتح الشركات اللي عايزها بزرار تفعيل اشتراك.", "ok"); }, 700);
    });
    h.insertAdjacentElement("afterend", btn);
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في قفل الكل: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
