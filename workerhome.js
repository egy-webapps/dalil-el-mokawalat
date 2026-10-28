(function(){
  try {
    var prevShow = window.show, cacheUid = null, cacheWorker = false, busy = false;
    var prof = document.getElementById("profile");
    var clockSec = document.getElementById("clock");

    var outB = document.createElement("button");
    outB.textContent = "تسجيل الخروج";
    outB.className = "sec";
    outB.style.display = "none";
    outB.addEventListener("click", function(){
      var lb = document.getElementById("logoutBtn");
      if (lb) lb.click();
    });
    if (clockSec) clockSec.appendChild(outB);

    function backBtn(){
      if (!clockSec) return null;
      var bs = clockSec.querySelectorAll("button");
      for (var i = 0; i < bs.length; i++) if (bs[i].textContent.trim() === "رجوع") return bs[i];
      return null;
    }
    function applyMode(worker){
      var b = backBtn();
      if (b) b.style.display = worker ? "none" : "";
      outB.style.display = worker ? "" : "none";
    }
    function clockBtn(){
      if (!prof) return null;
      var bs = prof.querySelectorAll("button");
      for (var i = 0; i < bs.length; i++) if (bs[i].textContent.trim() === "بصمة الحضور") return bs[i];
      return null;
    }
    async function isWorkerOnly(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) return false;
      var uid = u.data.user.id;
      if (uid === cacheUid) return cacheWorker;
      var t = await db.rpc("my_team_companies");
      if (t.error) return false;
      var res = false;
      if (!t.data || !t.data.length) {
        var s = await db.rpc("my_clock_status");
        if (!s.error && s.data && s.data.length) res = true;
      }
      cacheUid = uid;
      cacheWorker = res;
      return res;
    }
    function restoreWhenHidden(){
      var n = 0;
      var iv = setInterval(function(){
        n++;
        if (prof.classList.contains("hide") || n > 30) { prof.style.visibility = ""; clearInterval(iv); }
      }, 100);
    }

    window.show = function(id){
      prevShow(id);
      if (id === "home") cacheUid = null;
      if (id !== "profile" || !prof || busy) return;
      busy = true;
      prof.style.visibility = "hidden";
      (async function(){
        var worker = false;
        try {
          worker = await isWorkerOnly();
          applyMode(worker);
          if (worker) {
            var b = clockBtn();
            if (b) b.click(); else worker = false;
          }
        } catch (e) {
          worker = false;
        }
        if (worker) restoreWhenHidden(); else prof.style.visibility = "";
        busy = false;
      })();
    };
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في شاشة العامل: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
