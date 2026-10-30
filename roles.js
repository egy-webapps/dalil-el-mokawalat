(function(){
  try {
    var prof = document.getElementById("profile");
    if (!prof) return;
    var prevShow = window.show, last = null, running = false;
    var LABELS = ["إدارة الشركة", "تقرير الشهر", "المخزن", "الفريق", "بصمة العمال", "بصمة الحضور", "إضافة مناقصة"];

    var origFrom3 = db.from.bind(db);
    db.from = function(t){
      var b = origFrom3(t);
      if (t !== "companies") return b;
      var origSelect = b.select.bind(b);
      b.select = function(cols){
        var q = origSelect.apply(null, arguments);
        if (cols !== "id,name,owner_id") return q;
        var origEq = q.eq.bind(q);
        q.eq = function(col){
          if (col === "owner_id") {
            return {
              then: function(res, rej){
                return (async function(){
                  var t2 = await db.rpc("my_team_companies");
                  if (t2.error) return { data: null, error: t2.error };
                  var rows = (t2.data || []).filter(function(c){ return c.role === "manager" || c.role === "accountant"; }).map(function(c){ return { id: c.id, name: c.name, owner_id: null }; });
                  return { data: rows, error: null };
                })().then(res, rej);
              }
            };
          }
          return origEq.apply(null, arguments);
        };
        return q;
      };
      return b;
    };

    function lastBtn(label){
      var bs = prof.querySelectorAll("button"), found = null;
      for (var i = 0; i < bs.length; i++) if (bs[i].textContent.trim() === label) found = bs[i];
      return found;
    }
    function apply(allow){
      LABELS.forEach(function(l){
        var b = lastBtn(l);
        if (!b) return;
        b.style.display = (allow === null || allow[l]) ? "" : "none";
      });
    }
    async function compute(){
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) return undefined;
      var uid = u.data.user.id;
      var t = await db.rpc("my_team_companies");
      if (t.error) return null;
      var roles = {};
      (t.data || []).forEach(function(c){ roles[c.role] = true; });
      var own = await db.from("companies").select("id").eq("owner_id", uid).limit(1);
      var owner = !own.error && !!own.data && own.data.length > 0;
      var ck = await db.rpc("my_clock_status");
      var worker = !ck.error && !!ck.data && ck.data.length > 0;
      var mgr = !!roles.manager, acc = !!roles.accountant, sk = !!roles.storekeeper, att = !!roles.attendance;
      var allow = {};
      allow["إدارة الشركة"] = mgr || acc || att;
      allow["تقرير الشهر"] = mgr || acc;
      allow["المخزن"] = mgr || acc || sk;
      allow["الفريق"] = owner;
      allow["بصمة العمال"] = mgr || acc;
      allow["بصمة الحضور"] = worker;
      allow["إضافة مناقصة"] = mgr || acc;
      return { allow: allow };
    }

    window.show = function(id){
      prevShow(id);
      if (id === "home") last = null;
      if (id !== "profile" || running) return;
      running = true;
      apply(last ? last.allow : {});
      (async function(){
        var r = null;
        try { r = await compute(); } catch (e) { r = null; }
        if (r === null) { apply(null); last = null; }
        else if (r) { last = r; apply(r.allow); }
        running = false;
      })();
    };
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في الأزرار: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
