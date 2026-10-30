(function(){
  try {
    var flag2 = false, ftimer = null;
    var origFrom2 = db.from.bind(db);

    db.from = function(t){
      var b = origFrom2(t);
      if (t !== "companies" || !flag2) return b;
      var origSelect = b.select.bind(b);
      b.select = function(cols){
        var q = origSelect.apply(null, arguments);
        if (cols !== "id,name") return q;
        var origEq = q.eq.bind(q);
        q.eq = function(col){
          if (col === "owner_id" && flag2) {
            flag2 = false;
            var verified = false;
            var obj = {
              eq: function(c2, v2){
                if (c2 === "verification_status" && v2 === "verified") verified = true;
                return obj;
              },
              then: function(res, rej){
                return (async function(){
                  var t2 = await db.rpc("my_team_companies");
                  if (t2.error) return { data: null, error: t2.error };
                  var ids = (t2.data || []).filter(function(c){ return c.role === "manager" || c.role === "accountant"; }).map(function(c){ return c.id; });
                  if (!ids.length) return { data: [], error: null };
                  var qq = origFrom2("companies").select("id,name").in("id", ids);
                  if (verified) qq = qq.eq("verification_status", "verified");
                  return await qq;
                })().then(res, rej);
              }
            };
            return obj;
          }
          return origEq.apply(null, arguments);
        };
        return q;
      };
      return b;
    };

    function arm(){
      flag2 = true;
      clearTimeout(ftimer);
      ftimer = setTimeout(function(){ flag2 = false; }, 10000);
    }
    function hook(root, label){
      if (!root) return;
      Array.prototype.forEach.call(root.querySelectorAll("button"), function(b){
        if (b.textContent.trim() === label) b.addEventListener("click", arm, true);
      });
    }
    hook(document.getElementById("profile"), "بصمة العمال");
    hook(document.getElementById("jobs"), "نشر وظيفة");
    hook(document.getElementById("projects"), "إضافة مشروع");
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في الصلاحيات: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
