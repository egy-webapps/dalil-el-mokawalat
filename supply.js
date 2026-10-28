(function(){
  try {
    var prevShow = window.show, all = [], uid = null;
    function el(t, x, c){ var e = document.createElement(t); if (x != null) e.textContent = x; if (c) e.className = c; return e; }
    function inp(type, ph, req){ var i = document.createElement("input"); i.type = type; i.placeholder = ph || ""; if (req) i.required = true; i.style.marginBottom = "8px"; return i; }

    var sec = el("section", null, "card hide");
    sec.id = "supply";
    var search = inp("search", "ابحث بالصنف أو المحافظة");
    var list = el("div");
    var addBtn = el("button", "انشر عرض توريد", "sec");
    addBtn.style.marginBottom = "8px";
    var form = el("form");
    form.style.display = "none";
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });

    var nm = inp("text", "اسم المورّد أو الشركة", true);
    var it = inp("text", "الصنف (مثال: أسمنت، حديد تسليح)", true);
    var pr = inp("text", "السعر (مثال: 3500 جنيه للطن)");
    var go;
    if (typeof GOVS !== "undefined") {
      go = el("select"); go.style.marginBottom = "8px";
      var f0 = el("option", "اختار المحافظة"); f0.value = ""; go.appendChild(f0);
      GOVS.forEach(function(g){ var o = el("option", g); o.value = g; go.appendChild(o); });
    } else { go = inp("text", "المحافظة"); }
    var ph = inp("tel", "رقم التليفون", true);
    var de = document.createElement("textarea");
    de.rows = 3; de.placeholder = "تفاصيل العرض (اختياري)"; de.style.marginBottom = "8px";
    var sb = el("button", "نشر"); sb.type = "submit";
    [nm, it, pr, go, ph, de, sb].forEach(function(x){ form.appendChild(x); });

    sec.appendChild(el("h2", "التوريدات"));
    sec.appendChild(search);
    sec.appendChild(addBtn);
    sec.appendChild(form);
    sec.appendChild(list);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){ prevShow(id); if (id !== "supply") sec.classList.add("hide"); };

    var prof = document.getElementById("profile"), lb = document.getElementById("logoutBtn");
    var pb = el("button", "التوريدات", "sec");
    pb.addEventListener("click", openSupply);
    if (prof && lb) prof.insertBefore(pb, lb); else if (prof) prof.appendChild(pb);

    function render(){
      list.textContent = "";
      var q = search.value.trim().toLowerCase();
      var rows = all.filter(function(s){
        return ((s.supplier_name || "") + " " + (s.item || "") + " " + (s.governorate || "")).toLowerCase().indexOf(q) > -1;
      });
      if (!rows.length) { emptyNote(list, "مفيش عروض توريد دلوقتي."); return; }
      rows.forEach(function(s){
        var d = el("div", null, "co");
        d.appendChild(el("b", s.item));
        line(d, "المورّد: " + s.supplier_name);
        line(d, "السعر: " + (s.price_text || "-"));
        line(d, "المحافظة: " + (s.governorate || "-"));
        line(d, "التليفون: " + (s.phone || "-"));
        if (s.description) { var x = el("p", s.description); x.style.whiteSpace = "pre-wrap"; d.appendChild(x); }
        if (uid && s.owner_id === uid) {
          var del = el("button", "حذف عرضي", "sec");
          del.style.marginTop = "8px";
          del.addEventListener("click", async function(){
            if (!confirm("تحذف عرضك؟")) return;
            var r = await db.from("supply_offers").delete().eq("id", s.id);
            if (r.error) { msg(arabicError(r.error), "err"); return; }
            load();
          });
          d.appendChild(del);
        }
        list.appendChild(d);
      });
    }

    async function load(){
      list.textContent = "";
      list.appendChild(el("p", "جاري التحميل...", "muted"));
      var r = await db.from("supply_offers").select("id,owner_id,supplier_name,item,price_text,governorate,phone,description").order("created_at", { ascending: false });
      if (r.error) { list.textContent = ""; msg(arabicError(r.error), "err"); return; }
      all = r.data || [];
      render();
    }

    async function openSupply(){
      prevShow("supply");
      sec.classList.remove("hide");
      form.style.display = "none";
      search.value = "";
      var u = await db.auth.getUser();
      uid = (u.data && u.data.user) ? u.data.user.id : null;
      load();
    }

    search.addEventListener("input", render);

    addBtn.addEventListener("click", function(){
      if (!uid) { msg("لازم تسجل دخول الاول.", "err"); return; }
      form.style.display = (form.style.display === "block") ? "none" : "block";
    });

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      sb.disabled = true;
      var r = await db.from("supply_offers").insert({ owner_id: uid, supplier_name: nm.value.trim(), item: it.value.trim(), price_text: pr.value.trim() || null, governorate: go.value.trim() || null, phone: ph.value.trim(), description: de.value.trim() || null });
      sb.disabled = false;
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      form.reset();
      form.style.display = "none";
      msg("تم نشر عرضك.", "ok");
      load();
    });
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في التوريدات: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
