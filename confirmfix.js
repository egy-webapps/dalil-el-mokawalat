(function(){
  try {
    var nativeConfirm = window.confirm.bind(window);
    var pending = null, toast = null, tTimer = null;
    function showToast(text){
      if (!toast) {
        toast = document.createElement("div");
        toast.style.cssText = "position:fixed;left:12px;right:12px;bottom:16px;z-index:9999;background:#1a2238;color:#fff;padding:12px 14px;border-radius:10px;font-size:15px;text-align:center;white-space:pre-line;box-shadow:0 2px 10px rgba(0,0,0,.3);display:none;";
        document.body.appendChild(toast);
      }
      toast.textContent = text;
      toast.style.display = "block";
      clearTimeout(tTimer);
      tTimer = setTimeout(function(){ toast.style.display = "none"; }, 6000);
    }
    function hideToast(){ if (toast) toast.style.display = "none"; }
    window.confirm = function(text){
      var t0 = Date.now();
      var r = false;
      try { r = nativeConfirm(text); } catch (e) { r = false; }
      if (r) { hideToast(); pending = null; return true; }
      if (Date.now() - t0 > 150) { hideToast(); pending = null; return false; }
      var now = Date.now();
      if (pending && pending.text === text && now < pending.until) { pending = null; hideToast(); return true; }
      pending = { text: text, until: now + 6000 };
      showToast(text + "\nاضغط نفس الزرار تاني خلال 6 ثواني للتأكيد");
      return false;
    };
  } catch (e) {
    var d = document.createElement("div");
    d.textContent = "خطأ في التأكيد: " + (e && e.message);
    d.style.cssText = "padding:8px;color:#b00;font-size:12px;text-align:center;";
    document.body.appendChild(d);
  }
})();
