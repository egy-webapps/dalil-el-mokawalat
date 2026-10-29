/* theme.js - مظهر موقع المقاولات (شريط تحذير + شبكة هندسية + أزرار 3D + مربعات بأيقونات) */
(function () {
  'use strict';
  var css =
    /* الخلفية: شبكة لوحات هندسية */
    'body{background-image:linear-gradient(rgba(15,37,71,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(15,37,71,.06) 1px,transparent 1px);background-size:26px 26px}' +
    '@media (prefers-color-scheme:dark){body{background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)}}' +

    /* الهيدر */
    'header{position:relative;border-bottom:0;padding:22px 16px 26px;background:linear-gradient(135deg,#0f2547,#18366a)}' +
    'header::after{content:"";position:absolute;left:0;right:0;bottom:0;height:9px;background:repeating-linear-gradient(-45deg,#f5b700 0 14px,#14213d 14px 28px)}' +
    'header h1::before{content:"\\1F477  ";}' +
    'header h1{letter-spacing:.3px}' +

    /* الكروت */
    '.card{border-radius:16px;border-top:4px solid var(--orange);box-shadow:0 8px 20px rgba(15,37,71,.10)}' +
    '.card h2::before{content:"";display:inline-block;width:6px;height:1em;background:var(--orange);border-radius:3px;margin-inline-end:10px;vertical-align:-2px}' +
    '.co{border-radius:12px;border-right:4px solid var(--orange)}' +

    /* الخانات */
    'input,select,textarea{border-radius:10px}' +
    'input:focus,select:focus,textarea:focus{outline:0;border-color:var(--orange);box-shadow:0 0 0 3px rgba(243,112,33,.25)}' +

    /* الأزرار 3D */
    '.card>button:not(.link){border-radius:12px;font-weight:800;background:linear-gradient(180deg,#ff8a3d,#f37021);box-shadow:0 4px 0 #b8501a;transition:transform .08s,box-shadow .08s}' +
    '.card>button.sec{background:var(--card);box-shadow:0 4px 0 rgba(243,112,33,.40)}' +
    '.card>button:not(.link):active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.25)}' +
    '.card>button.link{box-shadow:none;background:none}' +

    /* قايمة الملف الشخصي: مربعات بأيقونات */
    '#profile:not(.hide){display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '#profile>:not(button){grid-column:1/-1}' +
    '#profile>button{margin:0}' +
    '#profile>button[data-ic]::before{content:attr(data-ic);line-height:1}' +
    '#profile>button.sec[data-ic]{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:96px;padding:12px 6px;font-size:15px;text-align:center}' +
    '#profile>button.sec[data-ic]::before{font-size:30px}' +
    '#profile>button:not(.sec){grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:10px;min-height:60px;font-size:18px}' +
    '#profile>button:not(.sec)[data-ic]::before{font-size:24px}' +
    '#profile>#logoutBtn{grid-column:1/-1;flex-direction:row;min-height:52px;color:#9b1c1c;border-color:#9b1c1c;box-shadow:0 4px 0 rgba(155,28,28,.35)}' +
    '#profile>#logoutBtn::before{font-size:20px}';

  var st = document.createElement('style');
  st.id = 'themeCss';
  st.textContent = css;
  document.head.appendChild(st);

  /* الأيقونات: بنحط attribute بس من غير ما نغيّر نص الزرار */
  var IC = [
    ['دليل الشركات', '\u{1F3E2}'], ['المناقصات', '\u{1F4D1}'], ['إضافة شركة', '\u2795'],
    ['إضافة مناقصة', '\u{1F4DD}'], ['إدارة الشركة', '\u2699\uFE0F'], ['تقرير الشهر', '\u{1F4CA}'],
    ['المخزن', '\u{1F4E6}'], ['الوظايف', '\u{1F477}'], ['المشاريع', '\u{1F3D7}\uFE0F'],
    ['المقاولين من الباطن', '\u{1F91D}'], ['التوريدات', '\u{1F69A}'], ['الفريق', '\u{1F465}'],
    ['بصمة الحضور', '\u{1F552}'], ['بصمة العمال', '\u261D\uFE0F'], ['طلبات الفحص', '\u2705'],
    ['تسجيل الخروج', '\u{1F6AA}']
  ];
  var timer = null;
  function icons() {
    var p = document.getElementById('profile');
    if (!p) return;
    var bs = p.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.hasAttribute('data-ic')) continue;
      var t = (b.textContent || '').trim();
      for (var j = 0; j < IC.length; j++) {
        if (t.indexOf(IC[j][0]) > -1) { b.setAttribute('data-ic', IC[j][1]); break; }
      }
    }
  }
  function later() { clearTimeout(timer); timer = setTimeout(icons, 60); }
  icons();
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
})();
