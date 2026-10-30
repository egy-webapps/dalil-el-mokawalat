/* support.js v1 - زرار الدعم الفني العائم */
(function () {
  'use strict';
  var PHONE_LOCAL = '01210455283';
  var PHONE_INTL = '201210455283';
  var TEXT = 'مرحباً، عندي مشكلة في تطبيق دليل المقاولات.';

  var css = document.createElement('style');
  css.textContent =
    '#spFab{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9999;width:auto;margin:0;padding:12px 18px;border:0;border-radius:999px;background:linear-gradient(135deg,#ff8f45,#f37021);color:#fff;font:700 15px "Tajawal","Segoe UI",Tahoma,Arial,sans-serif;box-shadow:0 8px 20px rgba(243,112,33,.45);cursor:pointer}' +
    '#spFab:active{transform:scale(.96)}' +
    '#spBox{position:fixed;left:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:9999;width:min(300px,calc(100vw - 32px));background:var(--card,#fff);color:var(--text,#14213d);border:1px solid var(--border,#d1d5db);border-radius:18px;padding:16px;box-shadow:0 14px 34px rgba(15,37,71,.25);direction:rtl;font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif}' +
    '#spBox[hidden]{display:none}' +
    '#spBox b{display:block;font-size:17px;margin-bottom:4px}' +
    '#spBox p{margin:0 0 12px;font-size:14px;color:var(--muted,#6b7280)}' +
    '#spBox a{display:block;text-align:center;text-decoration:none;font-weight:700;font-size:16px;padding:12px;border-radius:12px;margin-top:8px;color:#fff}' +
    '#spBox a.wa{background:#25d366}' +
    '#spBox a.tel{background:#0f2547}' +
    '#spBox .ph{direction:ltr;text-align:center;margin-top:10px;font-size:14px;color:var(--muted,#6b7280)}';
  document.head.appendChild(css);

  var fab = document.createElement('button');
  fab.id = 'spFab';
  fab.type = 'button';
  fab.textContent = '\u{1F4AC} الدعم';

  var box = document.createElement('div');
  box.id = 'spBox';
  box.hidden = true;
  box.innerHTML =
    '<b>محتاج مساعدة؟</b>' +
    '<p>لو عندك أي مشكلة في التطبيق، تواصل معانا.</p>' +
    '<a class="wa" target="_blank" rel="noopener" href="https://wa.me/' + PHONE_INTL + '?text=' + encodeURIComponent(TEXT) + '">\u{1F4AC} واتساب</a>' +
    '<a class="tel" href="tel:' + PHONE_LOCAL + '">\u{1F4DE} اتصال</a>' +
    '<div class="ph">' + PHONE_LOCAL + '</div>';

  function mount() {
    if (document.getElementById('spFab')) return;
    document.body.appendChild(box);
    document.body.appendChild(fab);
    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      box.hidden = !box.hidden;
    });
    document.addEventListener('click', function (e) {
      if (!box.hidden && !box.contains(e.target)) box.hidden = true;
    });
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
