/* lockphone.js v1 - رقم التواصل في شاشة "اشتراكك موقوف" */
(function () {
  'use strict';
  var LOCAL = '01210455283';
  var INTL = '201210455283';
  var KEY = 'تواصل مع الإدارة لتفعيله';
  var MSG = 'مرحباً، اشتراك شركتي موقوف في تطبيق دليل المقاولات وأريد تفعيله.';

  function norm(s) { return String(s || '').replace(/\s+/g, ' '); }

  function build() {
    var d = document.createElement('div');
    d.setAttribute('data-lockphone', '1');
    d.style.cssText = 'margin:20px auto 0;max-width:420px;text-align:center;direction:rtl;font-family:inherit';
    d.innerHTML =
      '<div style="direction:ltr;font-size:24px;font-weight:800;letter-spacing:1px;color:#fff;margin-bottom:14px">' + LOCAL + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<a href="https://wa.me/' + INTL + '?text=' + encodeURIComponent(MSG) + '" target="_blank" rel="noopener" ' +
          'style="display:block;padding:13px 8px;border-radius:14px;background:#25d366;color:#fff;text-decoration:none;font-weight:700;font-size:16px">\u{1F4AC} واتساب</a>' +
        '<a href="tel:' + LOCAL + '" ' +
          'style="display:block;padding:13px 8px;border-radius:14px;border:2px solid #f37021;color:#fff;text-decoration:none;font-weight:700;font-size:16px">\u{1F4DE} اتصال</a>' +
      '</div>';
    return d;
  }

  function check() {
    var all = document.body ? document.body.querySelectorAll('*') : [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i], tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'A' || tag === 'BUTTON') continue;
      if (el.hasAttribute('data-lockphone') || norm(el.textContent).indexOf(KEY) < 0) continue;
      var inChild = false;
      for (var j = 0; j < el.children.length; j++) {
        if (norm(el.children[j].textContent).indexOf(KEY) > -1) { inChild = true; break; }
      }
      if (inChild) continue;
      var nx = el.nextElementSibling;
      if (!nx || !nx.hasAttribute('data-lockphone')) el.insertAdjacentElement('afterend', build());
      return;
    }
  }

  var t = null;
  function later() { clearTimeout(t); t = setTimeout(check, 80); }

  function start() {
    check();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
