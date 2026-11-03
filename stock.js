(function(){
  try {
    var prevShow = window.show;
    var cid = null, tk = 0;

    function el(tag, text, cls){
      var e = document.createElement(tag);
      if (text != null) e.textContent = text;
      if (cls) e.className = cls;
      return e;
    }
    function field(type, ph, req, dec){
      var i = document.createElement("input");
      i.type = type; i.placeholder = ph || "";
      if (dec) i.setAttribute("inputmode", "decimal");
      if (req) i.required = true;
      i.style.marginBottom = "8px";
      return i;
    }
    function pad(n){ return String(n).padStart(2, "0"); }
    function today(){
      var d = new Date();
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    /* يقرأ الأرقام عربي أو إنجليزي، وبيرجّع NaN لو الكتابة مش رقم صحيح */
    function toNum(v){
      var s = String(v == null ? "" : v).trim();
      s = s.replace(/[\u0660-\u0669]/g, function(d){ return String(d.charCodeAt(0) - 1632); })
           .replace(/[\u06F0-\u06F9]/g, function(d){ return String(d.charCodeAt(0) - 1776); })
           .replace(/\u066C/g, "")
           .replace(/[\u066B\u060C,]/g, ".")
           .replace(/\s/g, "");
      if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
      return Number(s);
    }
    function r3(x){ return Math.round((Number(x) || 0) * 1000) / 1000; }

    /* تنسيق الرقم للعرض: من غير أي حروف اتجاه مخفية */
    function num(n){
      var v = r3(n);
      var neg = v < 0;
      v = Math.abs(v);
      var p = v.toFixed(3).replace(/\.?0+$/, "").split(".");
      var ip = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (neg ? "-" : "") + ip + (p[1] ? "." + p[1] : "");
    }

    var sec = el("section", null, "card hide");
    sec.id = "stock";
    var sel = el("select");
    var body = el("div");
    body.style.marginTop = "12px";
    var back = el("button", "رجوع", "link");
    back.addEventListener("click", function(){ window.show("profile"); });
    sec.appendChild(el("h2", "المخزن"));
    sec.appendChild(sel);
    sec.appendChild(body);
    sec.appendChild(back);
    (document.querySelector("main") || document.body).appendChild(sec);

    window.show = function(id){
      prevShow(id);
      if (id !== "stock") sec.classList.add("hide");
    };

    var prof = document.getElementById("profile");
    var lb = document.getElementById("logoutBtn");
    var sb = el("button", "المخزن", "sec");
    sb.addEventListener("click", openStock);
    if (prof && lb) prof.insertBefore(sb, lb);
    else if (prof) prof.appendChild(sb);

    sel.addEventListener("change", function(){ cid = sel.value; draw(); });

    async function openStock(){
      prevShow("stock");
      sec.classList.remove("hide");
      sel.textContent = "";
      body.textContent = "";
      var u = await db.auth.getUser();
      if (u.error || !u.data.user) {
        window.show("home");
        msg("لازم تسجل دخول الاول.", "err");
        return;
      }
      var r = await db.from("companies").select("id,name").eq("owner_id", u.data.user.id);
      if (r.error) { msg(arabicError(r.error), "err"); return; }
      if (!r.data || !r.data.length) {
        emptyNote(body, "مفيش عندك شركة. ضيف شركة الأول من إضافة شركة.");
        return;
      }
      r.data.forEach(function(c){
        var o = el("option", c.name);
        o.value = c.id;
        sel.appendChild(o);
      });
      cid = sel.value;
      draw();
    }

    async function draw(){
      if (!cid) return;
      var my = ++tk;
      var company = cid;
      hideMsg();
      body.textContent = "";

      var f = el("form");
      var n = field("text", "اسم الصنف (مثال: أسمنت)", true);
      var un = field("text", "الوحدة (مثال: كيس، طن، متر)");
      var mn = field("text", "الحد الأدنى للتنبيه (اختياري)", false, true);
      var ab = el("button", "إضافة صنف");
      ab.type = "submit";
      f.appendChild(n); f.appendChild(un); f.appendChild(mn); f.appendChild(ab);
      f.addEventListener("submit", async function(e){
        e.preventDefault();
        var minRaw = mn.value.trim();
        var minVal = minRaw ? toNum(minRaw) : 0;
        if (isNaN(minVal) || minVal < 0) { msg("الحد الأدنى لازم يكون رقم صحيح.", "err"); return; }
        ab.disabled = true;
        var r = await db.from("stock_items").insert({ company_id: company, name: n.value.trim(), unit: un.value.trim() || "قطعة", min_qty: r3(minVal) });
        ab.disabled = false;
        if (r.error) {
          if (String(r.error.message || "").indexOf("duplicate") > -1) msg("الصنف ده موجود قبل كده.", "err");
          else msg(arabicError(r.error), "err");
          return;
        }
        msg("تمت إضافة الصنف.", "ok");
        draw();
      });
      body.appendChild(f);
      var list = el("div");
      list.style.marginTop = "12px";
      body.appendChild(list);
      list.appendChild(el("p", "جاري التحميل...", "muted"));

      var it = await db.from("stock_items").select("id,name,unit,min_qty").eq("company_id", company).order("created_at", { ascending: true });
      if (my !== tk) return;
      if (it.error) { list.textContent = ""; msg(arabicError(it.error), "err"); return; }

      var moves = [], from = 0, size = 1000;
      while (true) {
        var r2 = await db.from("stock_moves").select("id,item_id,kind,qty,note,move_date,created_at").eq("company_id", company).order("created_at", { ascending: false }).order("id").range(from, from + size - 1);
        if (my !== tk) return;
        if (r2.error) { list.textContent = ""; msg(arabicError(r2.error), "err"); return; }
        moves = moves.concat(r2.data || []);
        if (!r2.data || r2.data.length < size) break;
        from += size;
      }

      var bal = {}, hist = {};
      moves.forEach(function(m){
        bal[m.item_id] = (bal[m.item_id] || 0) + (m.kind === "in" ? Number(m.qty) : -Number(m.qty));
        (hist[m.item_id] || (hist[m.item_id] = [])).push(m);
      });

      list.textContent = "";
      var items = it.data || [];
      if (!items.length) { emptyNote(list, "لسه مفيش أصناف. ضيف أول صنف من فوق."); return; }

      items.forEach(function(x){
        var cur = r3(bal[x.id] || 0);
        var low = Number(x.min_qty) > 0 && cur <= Number(x.min_qty);
        var c = el("div", null, "co");
        c.appendChild(el("b", x.name));
        line(c, "الكمية الحالية: " + num(cur) + " " + x.unit);
        if (Number(x.min_qty) > 0) line(c, "الحد الأدنى: " + num(x.min_qty) + " " + x.unit);
        if (low) {
          var w = el("div", "⚠ تنبيه: الكمية قاربت تخلص");
          w.style.cssText = "color:#b00;font-weight:bold;margin:6px 0;";
          c.appendChild(w);
        }

        var mf = el("form");
        mf.style.marginTop = "8px";
        var kd = el("select");
        kd.style.marginBottom = "8px";
        [["in", "وارد (داخل المخزن)"], ["out", "صادر (خارج من المخزن)"]].forEach(function(o){
          var op = el("option", o[1]);
          op.value = o[0];
          kd.appendChild(op);
        });
        var q = field("text", "الكمية", true, true);
        var nt = field("text", "ملاحظة (اختياري)");
        var mb = el("button", "تسجيل الحركة");
        mb.type = "submit";
        mf.appendChild(kd); mf.appendChild(q); mf.appendChild(nt); mf.appendChild(mb);
        mf.addEventListener("submit", async function(e){
          e.preventDefault();
          var qty = toNum(q.value);
          if (isNaN(qty) || !(qty > 0)) { msg("اكتب كمية صحيحة أكبر من صفر (أرقام فقط).", "err"); return; }
          qty = r3(qty);
          if (kd.value === "out" && qty > cur) { msg("الكمية الصادرة أكبر من الموجود (" + num(cur) + " " + x.unit + ").", "err"); return; }
          mb.disabled = true;
          var r = await db.from("stock_moves").insert({ company_id: company, item_id: x.id, kind: kd.value, qty: qty, note: nt.value.trim() || null, move_date: today() });
          mb.disabled = false;
          if (r.error) { msg(arabicError(r.error), "err"); return; }
          msg("تم تسجيل الحركة.", "ok");
          draw();
        });
        c.appendChild(mf);

        var hs = hist[x.id] || [];
        if (hs.length) {
          var hb = el("b", "آخر الحركات");
          hb.style.cssText = "display:block;margin-top:14px;";
          c.appendChild(hb);
          hs.slice(0, 5).forEach(function(m){
            line(c, (m.kind === "in" ? "وارد " : "صادر ") + num(m.qty) + " " + x.unit + " - " + m.move_date + (m.note ? " - " + m.note : ""));
          });
        }

        var del = el("button", "حذف الصنف", "sec");
        del.style.marginTop = "8px";
        del.addEventListener("click", async function(){
          if (!confirm("تحذف " + x.name + " وكل حركاته؟")) return;
          var r = await db.from("stock_items").delete().eq("id", x.id);
          if (r.error) { msg(arabicError(r.error), "err"); return; }
          draw();
        });
        c.appendChild(del);
        list.appendChild(c);
      });
    }
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في المخزن: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
