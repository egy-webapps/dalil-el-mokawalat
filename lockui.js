(function(){
  try {
    var prof = document.getElementById("profile");
    if (!prof) return;
    var st = document.createElement("style");
    st.textContent = ".lk-hidden{display:none !important;}";
    document.head.appendChild(st);
    var note = document.createElement("div");
    note.textContent = "🔒 التطبيق مقفول حالياً. للتفعيل تواصل معنا.";
    note.style.cssText = "display:none;background:#fde8e8;color:#b00;padding:12px;border-radius:8px;margin:12px 0;font-weight:bold;text-align:center;";
    prof.insertBefore(note, prof.children[1] || null);

    var prevShow = window.show, tk = 0;
    function today(){ return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); }
    function setHidden(on){
      Array.prototype.forEach.call(prof.querySelectorAll("button"), function(b){
        if (b.id === "logoutBtn") return;
        b.classList.toggle("lk-hidden", on);
      });
    }
    async function isLocked(){
      var a = await db.rpc("is_admin");
      if (!a.error && a.data === true) return false;
      var s = await db.from("app_settings").select("subscription_required").eq("id", 1).maybeSingle();
      if (s.error || !s.data || !s.data.subscription_required) return false;
      var t = await db.rpc("my_team_companies");
      if (!t.error && t.data && t.data.length) {
        var ids = [];
        t.data.forEach(function(c){ if (ids.indexOf(c.id) === -1) ids.push(c.id); });
        var r = await db.from("company_subscriptions").select("company_id,paid_until").in("company_id", ids);
        if (!r.error) {
          var td = today();
          for (var i = 0; i < (r.data || []).length; i++) {
            if (r.data[i].paid_until && r.data[i].paid_until >= td) return false;
          }
        }
      }
      return true;
    }
    window.show = function(id){
      prevShow(id);
      if (id !== "profile") return;
      var my = ++tk;
      setHidden(true);
      note.style.display = "none";
      (async function(){
        var locked = false;
        try { locked = await isLocked(); } catch (e) { locked = false; }
        if (my !== tk) return;
        setHidden(locked);
        note.style.display = locked ? "" : "none";
      })();
    };
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في القفل: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
