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
  add();
  setInterval(add, 2000);
})();
