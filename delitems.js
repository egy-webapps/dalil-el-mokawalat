(function(){
  try {
    var CFG = [
      { sec: "tenders", table: "tenders", cols: "id,title,governorate,deadline,companies(name)", label: "حذف المناقصة" },
      { sec: "jobs", table: "jobs", cols: "id,title,governorate,deadline,companies(name)", label: "حذف الوظيفة" },
      { sec: "projects", table: "projects", cols: "id,title,governorate,status,companies(name)", label: "حذف المشروع" }
    ];
    var busy = false, timers = {};
    function cardInfo(c){
      var info = { title: "", company: "", gov: "", status: null };
      var b = c.querySelector("b");
      if (b) info.title = b.textContent.trim();
      Array.prototype.forEach.call(c.querySelectorAll("div"), function(d){
        var t = d.textContent.trim();
        if (t.indexOf("الشركة: ") === 0) info.company = t.slice(8).trim();
        else if (t.indexOf("المحافظة: ") === 0) info.gov = t.slice(10).trim();
        else if (t.indexOf("الحالة: ") === 0) info.status = t.slice(8).trim();
      });
      return info;
    }
    function schedule(cfg){
      clearTimeout(timers[cfg.sec]);
      timers[cfg.sec] = setTimeout(function(){ enhance(cfg); }, 200);
    }
    function addBtn(cfg, c, row){
      var b = document.createElement("button");
      b.textContent = cfg.label;
      b.className = "sec";
      b.style.marginTop = "8px";
      var armed = false, t = null;
      b.addEventListener("click", async function(e){
        e.stopPropagation();
        if (!armed) {
          armed = true;
          b.textContent = "اضغط تاني للتأكيد (هيتمسح نهائي)";
          clearTimeout(t);
          t = setTimeout(function(){ armed = false; b.textContent = cfg.label; }, 8000);
          return;
        }
        clearTimeout(t);
        b.disabled = true;
        var d = await db.from(cfg.table).delete().eq("id", row.id).select("id");
        b.disabled = false;
        armed = false;
        b.textContent = cfg.label;
        if (d.error) { msg(arabicError(d.error), "err"); return; }
        if (!d.data || !d.data.length) { msg("ما اتحذفش. مفيش عندك صلاحية على العنصر ده.", "err"); return; }
        c.remove();
        msg("تم الحذف.", "ok");
      });
      c.appendChild(b);
    }
    async function enhance(cfg){
      var root = document.getElementById(cfg.sec);
      if (!root) return;
      var cards = Array.prototype.filter.call(root.querySelectorAll(".co"), function(c){
        return !c.getAttribute("data-del") && c.querySelector("b");
      });
      if (!cards.length) return;
      cards.forEach(function(c){ c.setAttribute("data-del", "1"); });
      busy = true;
      try {
        var u = await db.auth.getUser();
        if (u.error || !u.data.user) return;
        var oc = await db.from("companies").select("id,name,owner_id").eq("owner_id", u.data.user.id);
        if (oc.error || !oc.data || !oc.data.length) return;
        var ids = oc.data.map(function(x){ return x.id; });
        var r = await db.from(cfg.table).select(cfg.cols).in("company_id", ids).order("created_at", { ascending: false });
        if (r.error || !r.data || !r.data.length) return;
        var used = {};
        cards.forEach(function(c){
          var info = cardInfo(c);
          for (var i = 0; i < r.data.length; i++) {
            var row = r.data[i];
            if (used[row.id]) continue;
            var cn = (row.companies && row.companies.name) || "-";
            if (row.title !== info.title) continue;
            if (cn !== info.company) continue;
            if ((row.governorate || "-") !== info.gov) continue;
            if (info.status !== null && row.status !== info.status) continue;
            used[row.id] = true;
            addBtn(cfg, c, row);
            break;
          }
        });
      } catch (e) {
      } finally {
        busy = false;
      }
    }
    CFG.forEach(function(cfg){
      var root = document.getElementById(cfg.sec);
      if (!root) return;
      new MutationObserver(function(){ if (!busy) schedule(cfg); }).observe(root, { childList: true, subtree: true });
    });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في الحذف: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
