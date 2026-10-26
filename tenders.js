var allTenders = [];

function renderTenders(q){
  var list = document.getElementById("t_list");
  list.textContent = "";
  q = (q || "").trim().toLowerCase();
  var rows = allTenders.filter(function(t){
    var s = ((t.title||"") + " " + (t.governorate||"")).toLowerCase();
    return s.indexOf(q) > -1;
  });
  if (!rows.length) { emptyNote(list, "لا توجد مناقصات مطابقة."); return; }
  rows.forEach(function(t){
    var d = document.createElement("div");
    d.className = "co";
    var b = document.createElement("b");
    b.textContent = t.title || "-";
    d.appendChild(b);
    line(d, "الشركة: " + ((t.companies && t.companies.name) || "-"));
    line(d, "المحافظة: " + (t.governorate || "-"));
    line(d, "آخر موعد: " + (t.deadline || "-"));
    if (t.description) line(d, t.description);
    list.appendChild(d);
  });
}

async function openTenders(){
  show("tenders");
  document.getElementById("t_search").value = "";
  var list = document.getElementById("t_list");
  list.textContent = "جاري التحميل...";
  var r = await db.from("tenders")
    .select("id,title,description,governorate,deadline,companies(name)")
    .order("created_at", { ascending: false });
  if (r.error) {
    list.textContent = "";
    msg("تعذر تحميل المناقصات: " + r.error.message, "err");
    return;
  }
  allTenders = r.data || [];
  renderTenders("");
}
document.getElementById("t_search").addEventListener("input", function(e){
  renderTenders(e.target.value);
});

async function openAddTender(){
  show("addtender");
  var sel = document.getElementById("t_company");
  var btn = document.getElementById("t_btn");
  sel.textContent = "";
  btn.disabled = true;
  var u = await db.auth.getUser();
  if (u.error || !u.data.user) { msg("لازم تسجّل دخول الأول.", "err"); return; }
  var r = await db.from("companies")
    .select("id,name")
    .eq("owner_id", u.data.user.id)
    .eq("verification_status", "verified");
  if (r.error) { msg(arabicError(r.error), "err"); return; }
  if (!r.data || !r.data.length) {
    msg("مفيش عندك شركة موثّقة. الشركة لازم تتوثّق الأول علشان تنشر مناقصة.", "err");
    return;
  }
  r.data.forEach(function(c){
    var o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name;
    sel.appendChild(o);
  });
  btn.disabled = false;
}

document.getElementById("tenderForm").addEventListener("submit", async function(e){
  e.preventDefault();
  var btn = document.getElementById("t_btn");
  btn.disabled = true;
  var r = await db.from("tenders").insert({
    company_id: document.getElementById("t_company").value,
    title: document.getElementById("t_title").value.trim(),
    description: document.getElementById("t_desc").value.trim() || null,
    governorate: document.getElementById("t_gov").value.trim() || null,
    deadline: document.getElementById("t_deadline").value || null
  });
  btn.disabled = false;
  if (r.error) { msg(arabicError(r.error), "err"); return; }
  e.target.reset();
  show("profile");
  msg("تم نشر المناقصة.", "ok");
});
