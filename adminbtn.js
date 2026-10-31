(function () {
  var sb = window.supabase.createClient(
    "https://ymmyijtuaqkiyjenmgjh.supabase.co",
    "sb_publishable_0T07DGMMB6Owg10Sl6zHyw_2PZLAgBL"
  );

  async function addAdminButton() {
    var box = document.getElementById("profile");
    if (!box || document.getElementById("adminLinkBtn")) return;
    var s = await sb.auth.getSession();
    if (!s.data.session) return;
    var p = await sb.from("profiles").select("platform_role")
      .eq("id", s.data.session.user.id).single();
    if (p.error || !p.data || p.data.platform_role !== "admin") return;
    var b = document.createElement("button");
    b.id = "adminLinkBtn";
    b.textContent = "لوحة الأدمن";
    b.onclick = function () { location.href = "admin.html"; };
    box.appendChild(b);
  }

  addAdminButton();
  setInterval(addAdminButton, 2000);
})();
