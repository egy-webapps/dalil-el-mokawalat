const SUPABASE_URL = "https://ymmyijtuaqkiyjenmgjh.supabase.co";
const SUPABASE_KEY = "sb_publishable_0T07DGMMB6Owg10Sl6zHyw_2PZLAgBL";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
var allCompanies = [];

function show(id){
  ["home","login","signup","profile","directory","addco","tenders","addtender"].forEach(function(s){
    document.getElementById(s).classList.toggle("hide", s !== id);
  });
  hideMsg();
}
function hideMsg(){ document.getElementById("msg").style.display = "none"; }
function msg(text, type){
  var m = document.getElementById("msg");
  m.textContent = text;
  m.className = "msg " + type;
  m.style.display = "block";
}
function arabicError(e){
  var t = (e && e.message) || "";
  if (t.indexOf("Invalid login") > -1) return "الإيميل أو كلمة المرور غلط.";
  if (t.indexOf("not confirmed") > -1) return "لازم تأكد الإيميل الأول. افتح الرسالة اللي وصلتك واضغط على اللينك.";
  if (t.indexOf("already registered") > -1) return "الإيميل ده مسجل قبل كده. جرّب تسجيل الدخول.";
  if (t.indexOf("Password should") > -1) return "كلمة المرور لازم تكون 6 أحرف على الأقل.";
  if (t.indexOf("rate limit") > -1) return "محاولات كتير. استنى شوية وجرّب تاني.";
  if (t.indexOf("row-level security") > -1) return "غير مسموح بالعملية دي.";
  return "حصل خطأ: " + t;
}
function showProfile(user){
  var meta = user.user_metadata || {};
  document.getElementById("p_name").textContent = meta.full_name || "-";
  document.getElementById("p_email").textContent = user.email;
  show("profile");
}
function line(parent, text){
  var d = document.createElement("div");
  d.className = "muted";
  d.textContent = text;
  parent.appendChild(d);
}
function emptyNote(list, text){
  var p = document.createElement("p");
  p.className = "muted";
  p.style.marginTop = "12px";
  p.textContent = text;
  list.appendChild(p);
}

function renderList(q){
  var list = document.getElementById("d_list");
  list.textContent = "";
  q = (q || "").trim().toLowerCase();
  var rows = allCompanies.filter(function(c){
    var s = ((c.name||"") + " " + (c.activity||"") + " " + (c.governorate||"")).toLowerCase();
    return s.indexOf(q) > -1;
  });
  if (!rows.length) { emptyNote(list, "لا توجد شركات مطابقة."); return; }
  rows.forEach(function(c){
    var d = document.createElement("div");
    d.className = "co";
    var b = document.createElement("b");
    b.textContent = c.name || "-";
    d.appendChild(b);
    line(d, "النشاط: " + (c.activity || "-"));
    line(d, "المحافظة: " + (c.governorate || "-"));
    list.appendChild(d);
  });
}

async function openDirectory(){
  show("directory");
  document.getElementById("d_search").value = "";
  var list = document.getElementById("d_list");
  list.textContent = "جاري التحميل...";
  var r = await db.from("companies")
    .select("id,name,activity,governorate")
    .order("created_at", { ascending: false });
  if (r.error) {
    list.textContent = "";
    msg("تعذر تحميل الدليل: " + r.error.message, "err");
    return;
  }
  allCompanies = r.data || [];
  renderList("");
}
document.getElementById("d_search").addEventListener("input", function(e){
  renderList(e.target.value);
});

document.getElementById("addForm").addEventListener("submit", async function(e){
  e.preventDefault();
  var btn = e.target.querySelector("button");
  btn.disabled = true;
  var u = await db.auth.getUser();
  if (u.error || !u.data.user) {
    btn.disabled = false;
    msg("لازم تسجّل دخول الأول.", "err");
    return;
  }
  var r = await db.from("companies").insert({
    name: document.getElementById("a_name").value.trim(),
    activity: document.getElementById("a_activity").value.trim(),
    governorate: document.getElementById("a_gov").value.trim(),
    owner_id: u.data.user.id
  });
  btn.disabled = false;
  if (r.error) { msg(arabicError(r.error), "err"); return; }
  e.target.reset();
  show("profile");
  msg("تمت إضافة الشركة. هتظهر في الدليل بعد المراجعة والتوثيق.", "ok");
});

document.getElementById("signupForm").addEventListener("submit", async function(e){
  e.preventDefault();
  var btn = e.target.querySelector("button");
  btn.disabled = true;
  var r = await db.auth.signUp({
    email: document.getElementById("s_email").value.trim(),
    password: document.getElementById("s_pass").value,
    options: { data: { full_name: document.getElementById("s_name").value.trim() } }
  });
  btn.disabled = false;
  if (r.error) { msg(arabicError(r.error), "err"); return; }
  if (r.data.session) {
    showProfile(r.data.user);
  } else {
    msg("تم إنشاء الحساب. افتح إيميلك واضغط على لينك التأكيد (وبص في Spam)، وبعدها سجّل دخول.", "ok");
  }
});

document.getElementById("loginForm").addEventListener("submit", async function(e){
  e.preventDefault();
  var btn = e.target.querySelector("button");
  btn.disabled = true;
  var r = await db.auth.signInWithPassword({
    email: document.getElementById("l_email").value.trim(),
    password: document.getElementById("l_pass").value
  });
  btn.disabled = false;
  if (r.error) { msg(arabicError(r.error), "err"); return; }
  showProfile(r.data.user);
});

document.getElementById("logoutBtn").addEventListener("click", async function(){
  await db.auth.signOut();
  show("home");
});

db.auth.getSession().then(function(r){
  if (r.data.session) showProfile(r.data.session.user);
});
