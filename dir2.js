(function(){
  try {
    var ov = document.createElement("div");
    ov.style.cssText = "display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:999;align-items:center;justify-content:center;padding:16px;";
    var box = document.createElement("div");
    box.style.cssText = "background:#fff;color:#1a2238;border-radius:12px;padding:20px;max-width:480px;width:100%;max-height:85vh;overflow:auto;";
    ov.appendChild(box);
    document.body.appendChild(ov);
    ov.addEventListener("click", function(e){ if (e.target === ov) ov.style.display = "none"; });

    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }

    async function openCompany(c){
      box.textContent = "";
      box.appendChild(el("h2", c.name || "-"));
      line(box, "النشاط: " + (c.activity || "-"));
      line(box, "المحافظة: " + (c.governorate || "-"));
      var h = el("b", "مشاريع الشركة");
      h.style.display = "block";
      h.style.marginTop = "12px";
      box.appendChild(h);
      var holder = el("div");
      box.appendChild(holder);
      holder.appendChild(el("p", "جاري التحميل...", "muted"));
      var cl = el("button", "إغلاق", "sec");
      cl.style.marginTop = "16px";
      cl.onclick = function(){ ov.style.display = "none"; };
      box.appendChild(cl);
      ov.style.display = "flex";
      var r = await db.from("projects").select("title,description,governorate,status").eq("company_id", c.id).order("created_at", { ascending: false });
      holder.textContent = "";
      if (r.error) { holder.appendChild(el("p", "تعذر تحميل المشاريع.", "muted")); return; }
      if (!r.data || !r.data.length) { holder.appendChild(el("p", "مفيش مشاريع متسجلة للشركة دي.", "muted")); return; }
      r.data.forEach(function(p){
        var d = el("div", null, "co");
        d.appendChild(el("b", p.title));
        line(d, "المحافظة: " + (p.governorate || "-"));
        line(d, "الحالة: " + p.status);
        if (p.description) { var x = el("p", p.description); x.style.whiteSpace = "pre-wrap"; d.appendChild(x); }
        holder.appendChild(d);
      });
    }

    window.renderList = function(q){
      var list = document.getElementById("d_list");
      list.textContent = "";
      q = (q || "").trim().toLowerCase();
      var rows = allCompanies.filter(function(c){
        var s = ((c.name || "") + " " + (c.activity || "") + " " + (c.governorate || "")).toLowerCase();
        return s.indexOf(q) > -1;
      });
      if (!rows.length) { emptyNote(list, "لا توجد شركات مطابقة."); return; }
      rows.forEach(function(c){
        var d = el("div", null, "co");
        d.style.cursor = "pointer";
        d.appendChild(el("b", c.name || "-"));
        line(d, "النشاط: " + (c.activity || "-"));
        line(d, "المحافظة: " + (c.governorate || "-"));
        line(d, "اضغط لعرض مشاريع الشركة");
        d.addEventListener("click", function(){ openCompany(c); });
        list.appendChild(d);
      });
    };
  } catch (e) {
    var m = document.createElement("div");
    m.textContent = "خطأ في الدليل: " + (e && e.message);
    m.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(m);
  }
})();
