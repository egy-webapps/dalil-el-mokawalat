(function () {
  var sb = window.supabase.createClient(
    "https://ymmyijtuaqkiyjenmgjh.supabase.co",
    "sb_publishable_0T07DGMMB6Owg10Sl6zHyw_2PZLAgBL"
  );

  async function add() {
    var box = document.getElementById("profile");
    if (!box) return;
    var s = await sb.auth.getSession();
    if (!s.data.session) return;
    if (!document.getElementById("extLinkBtn")) {
      var e = document.createElement("button");
      e.id = "extLinkBtn";
      e.className = "sec";
      e.textContent = "المستخلصات";
      e.onclick = function () { location.href = "extracts.html"; };
      box.appendChild(e);
    }
    if (document.getElementById("adminLinkBtn")) return;
    var p = await sb.from("profiles").select("platform_role")
      .eq("id", s.data.session.user.id).single();
    if (p.error || !p.data || p.data.platform_role !== "admin") return;
    var b = document.createElement("button");
    b.id = "adminLinkBtn";
    b.textContent = "لوحة الأدمن";
    b.onclick = function () { location.href = "admin.html"; };
    box.appendChild(b);
  }

  function lockScreen() {
    if (document.getElementById("subLock")) return;
    var o = document.createElement("div");
    o.id = "subLock";
    o.setAttribute("style", "position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;background:#0f2547;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:Tahoma,Arial,sans-serif;direction:rtl");
    o.innerHTML = '<div style="font-size:56px">🔒</div>' +
      '<h2 style="margin:12px 0 8px;font-size:24px">اشتراكك موقوف</h2>' +
      '<p style="max-width:320px;line-height:1.8;margin:0 0 20px;color:#cbd5e1">اشتراك الشركة موقوف أو منتهي، وكل الخدمات متوقفة. تواصل مع الإدارة لتفعيله.</p>';
    var b = document.createElement("button");
    b.textContent = "تسجيل الخروج";
    b.setAttribute("style", "width:100%;max-width:320px;padding:14px;font-size:17px;border:2px solid #f37021;border-radius:8px;background:transparent;color:#f37021;font-weight:700");
    b.onclick = async function () { await sb.auth.signOut(); location.reload(); };
    o.appendChild(b);
    document.body.appendChild(o);
    document.documentElement.style.overflow = "hidden";
  }

  function unlockScreen() {
    var o = document.getElementById("subLock");
    if (o) o.remove();
    document.documentElement.style.overflow = "";
  }

  async function check() {
    var s = await sb.auth.getSession();
    if (!s.data.session) { unlockScreen(); return; }
    var r = await sb.rpc("my_access_locked");
    if (r.error) return;
    if (r.data === true) lockScreen(); else unlockScreen();
  }

  var lastUid = null;
  async function tick() {
    var s = await sb.auth.getSession();
    var uid = s.data.session ? s.data.session.user.id : null;
    if (uid !== lastUid) { lastUid = uid; check(); }
  }

  add();
  tick();
  setInterval(add, 2000);
  setInterval(tick, 2000);
  setInterval(check, 15000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) check();
  });
})();
