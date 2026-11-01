(function(){
  try {
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
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في الحذف: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
