/* theme.js v2 - مظهر عصري لموقع المقاولات */
(function () {
  'use strict';

  var lk = document.createElement('link');
  lk.rel = 'stylesheet';
  lk.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';
  document.head.appendChild(lk);

  var css =
    /* الخط والخلفية */
    'body,input,select,textarea,button{font-family:"Tajawal","Segoe UI",Tahoma,Arial,sans-serif}' +
    'body{background:linear-gradient(180deg,#e9eef7 0%,#f6f8fc 320px);background-attachment:fixed}' +
    '@media (prefers-color-scheme:dark){body{background:linear-gradient(180deg,#0a1325 0%,#0b1220 320px)}}' +

    /* الهيدر */
    'header{position:relative;overflow:hidden;border-bottom:0;padding:28px 18px 38px;border-radius:0 0 28px 28px;background:linear-gradient(135deg,#0f2547 0%,#1b3a6e 60%,#2a5199 100%)}' +
    'header::before{content:"";position:absolute;width:240px;height:240px;border-radius:50%;top:-110px;left:-70px;background:radial-gradient(circle,rgba(243,112,33,.55),transparent 70%)}' +
    'header>*{position:relative}' +
    'header h1{font-size:26px;font-weight:800}' +
    'header h1::before{content:"\\1F3D7\\FE0F\\00A0"}' +
    'header p{color:#ffb27a;font-weight:500}' +
    'main{position:relative;margin-top:-18px}' +

    /* الكروت */
    '.card{border:0;border-radius:22px;box-shadow:0 10px 30px rgba(15,37,71,.10)}' +
    '@media (prefers-color-scheme:dark){.card{box-shadow:0 10px 30px rgba(0,0,0,.40)}}' +
    '.card h2{font-weight:800;font-size:21px}' +
    '.co{border-radius:14px}' +

    /* الخانات */
    'input,select,textarea{border:1.5px solid var(--border);border-radius:12px;padding:13px}' +
    'input:focus,select:focus,textarea:focus{outline:0;border-color:var(--orange);box-shadow:0 0 0 4px rgba(243,112,33,.18)}' +

    /* الأزرار */
    'button{font-weight:700;letter-spacing:.2px;transition:transform .12s,box-shadow .12s}' +
    '.card>button:not(.link){border-radius:14px;background:linear-gradient(135deg,#ff8f45,#f37021);box-shadow:0 8px 18px rgba(243,112,33,.32)}' +
    '.card>button.sec{background:var(--card);color:var(--orange);border:1.5px solid rgba(243,112,33,.45);box-shadow:none}' +
    '.card>button.link{background:none;box-shadow:none}' +
    'button:active{transform:scale(.97)}' +

    /* قايمة الملف الشخصي */
    '#profile:not(.hide){display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '#profile>:not(button){grid-column:1/-1;margin:0}' +
    '#profile>button{margin:0}' +

    /* مربع الأيقونة */
    '#profile>button[data-ic]::before{content:attr(data-ic);display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:16px;font-size:26px;line-height:1;background:var(--tc,rgba(243,112,33,.14))}' +
    '#profile>button[data-c="0"]{--tc:rgba(243,112,33,.14)}' +
    '#profile>button[data-c="1"]{--tc:rgba(37,99,235,.14)}' +
    '#profile>button[data-c="2"]{--tc:rgba(22,163,74,.14)}' +
    '#profile>button[data-c="3"]{--tc:rgba(147,51,234,.14)}' +
    '#profile>button[data-c="4"]{--tc:rgba(234,179,8,.20)}' +
    '#profile>button[data-c="5"]{--tc:rgba(225,29,72,.14)}' +

    /* المربعات العادية */
    '#profile>button.sec[data-ic]{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:106px;padding:14px 8px;font-size:14px;line-height:1.35;text-align:center;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:20px;box-shadow:0 6px 16px rgba(15,37,71,.07)}' +
    '#profile>button.wide{grid-column:1/-1;flex-direction:row!important;min-height:72px!important;gap:14px!important}' +

    /* المربعين الرئيسيين */
    '#profile>button:not(.sec){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:106px;padding:14px 8px;font-size:16px;color:#fff;border-radius:20px;background:linear-gradient(135deg,#ff8f45,#f37021);box-shadow:0 10px 22px rgba(243,112,33,.35)}' +
    '#profile>button:not(.sec)[data-ic]::before{background:rgba(255,255,255,.24)}' +

    /* تسجيل الخروج */
    '#profile>#logoutBtn{grid-column:1/-1;flex-direction:row;gap:10px;min-height:54px;color:#dc2626;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.28);box-shadow:none;border-radius:16px}' +
    '#profile>#logoutBtn::before{width:auto;height:auto;background:none;font-size:20px}';

  var st = document.createElement('style');
  st.id = 'themeCss';
  st.textContent = css;
  document.head.appendChild(st);

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
    var bs = p.querySelectorAll('button'), i, j, tiles = [];
    for (i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (!b.hasAttribute('data-ic')) {
        var t = (b.textContent || '').trim();
        for (j = 0; j < IC.length; j++) {
          if (t.indexOf(IC[j][0]) > -1) { b.setAttribute('data-ic', IC[j][1]); break; }
        }
      }
      if (b.classList.contains('sec') && b.id !== 'logoutBtn' && b.hasAttribute('data-ic')) tiles.push(b);
    }
    for (i = 0; i < tiles.length; i++) {
      tiles[i].setAttribute('data-c', String(i % 6));
      tiles[i].classList.remove('wide');
    }
    if (tiles.length % 2 === 1) tiles[tiles.length - 1].classList.add('wide');
  }

  function later() { clearTimeout(timer); timer = setTimeout(icons, 60); }
  icons();
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
})();
