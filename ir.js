/* ir.js - طلبات الفحص الهندسية (IR Maker) - تصميم v2
   السطر المطلوب في index.html:  <script src="ir.js"></script> */
(function () {
  'use strict';
  var K2 = 'ir_requests_v2', K1 = 'ir_requests_v1', SK = 'ir_settings_v2';
  var ST = {
    pending:  ['W', 'قيد المراجعة', '#92400e', '#fef3c7'],
    approved: ['A', 'معتمد - Approved', '#14532d', '#e1f5e7'],
    comments: ['C', 'معتمد بملاحظات', '#9a3412', '#ffedd5'],
    rejected: ['R', 'مرفوض / إعادة معاينة', '#9b1c1c', '#fde8e8']
  };
  var DEFAULTS = ['حدادة ونجارة حائط', 'صب لبشة', 'إحداثيات خوازيق', 'حدادة سقف', 'صب أعمدة', 'عزل مائي'];
  var openRows = {}, showAll = false, last = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { alert('تعذر الحفظ المحلي'); } }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function stOf(k) { return ST[k] || ST.pending; }

  /* ---------- البيانات ---------- */
  function load() {
    var l = jget(K2, null);
    if (l) return l;
    var old = jget(K1, []);
    l = old.map(function (r, i) {
      return {
        id: r.id,
        num: parseInt(String(r.num).replace(/\D/g, ''), 10) || (old.length - i),
        proj: r.proj || '',
        text: [r.what, r.bld, r.grid ? 'محاور ' + r.grid : '', r.lvl ? 'منسوب ' + r.lvl : '', r.sd ? 'SD: ' + r.sd : ''].filter(Boolean).join(' - '),
        sub: r.sub || today(),
        status: r.status || 'pending',
        notes: r.notes || ''
      };
    });
    if (l.length) jset(K2, l);
    return l;
  }
  function save(l) { jset(K2, l); }
  function getS() {
    var s = jget(SK, null);
    if (!s) s = {
      proj: localStorage.getItem('ir_project_name') || '',
      company: '',
      phone: localStorage.getItem('ir_consultant_phone') || '',
      start: 0
    };
    return s;
  }
  function lastNum(l, s) {
    return l.reduce(function (m, r) { return Math.max(m, r.num || 0); }, parseInt(s.start, 10) || 0);
  }
  function waPhone(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    else if (d.indexOf('0') === 0) d = '20' + d.slice(1);
    return d;
  }
  function buildText(r) {
    var s = getS();
    var a = ['*طلب فحص هندسي (IR) رقم: IR-' + r.num + '*', ''];
    if (s.company) a.push('الشركة: ' + s.company);
    a.push('المشروع: ' + (r.proj || s.proj || '-'));
    a.push('البند: ' + r.text);
    a.push('تاريخ تقديم الطلب: ' + r.sub);
    a.push('');
    a.push('برجاء التكرم بالمعاينة. شكراً.');
    return a.join('\n');
  }
  function waLink(r) {
    return 'https://wa.me/' + waPhone(getS().phone) + '?text=' + encodeURIComponent(buildText(r));
  }

  /* ---------- الستايل ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#ir .ir-eyebrow{text-align:center;letter-spacing:2px;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:12px}' +
    '#ir .ir-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}' +
    '#ir .ir-head h2{margin:0;font-size:24px}' +
    '#ir .ir-badge{border:1px solid var(--border);border-radius:14px;padding:8px 14px;text-align:center;min-width:110px}' +
    '#ir .ir-badge small{display:block;font-size:11px;color:var(--muted);font-weight:700}' +
    '#ir .ir-badge b{font-size:26px;color:var(--navy)}' +
    '@media (prefers-color-scheme:dark){#ir .ir-badge b{color:#fff}}' +
    '#ir .ir-cap{display:block;font-size:13px;font-weight:700;color:var(--muted);margin:14px 0 6px}' +
    '#ir textarea{min-height:110px;resize:vertical}' +
    '#ir .ir-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}' +
    '#ir .ir-chip{width:auto;max-width:100%;margin:0;padding:8px 12px;font-size:14px;font-weight:600;border-radius:999px;background:var(--bg);color:var(--text);border:1px solid var(--border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#ir .ir-prep{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}' +
    '#ir .ir-main{width:auto;margin:0;padding:14px 22px;background:var(--navy);color:#fff;border-radius:12px;font-size:16px}' +
    '#ir .ir-wa{width:auto;margin:0;padding:12px 18px;background:#25d366;color:#fff;border-radius:12px;font-size:15px}' +
    '#ir .ir-pv{border:1px solid var(--border);border-radius:12px;padding:12px;margin-top:14px;background:var(--bg)}' +
    '#ir .ir-pv pre{white-space:pre-wrap;font-family:inherit;font-size:14px;margin:8px 0}' +
    '#ir .ir-btns{display:flex;gap:10px;flex-wrap:wrap}' +
    '#ir details.ir-tools{border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-top:22px}' +
    '#ir details.ir-tools summary{font-weight:700;cursor:pointer}' +
    '#ir .ir-row{border:1px solid var(--border);border-radius:12px;margin-top:8px;overflow:hidden}' +
    '#ir .ir-top{display:flex;align-items:center;gap:8px;padding:10px;cursor:pointer}' +
    '#ir .ir-top b{min-width:38px}' +
    '#ir .ir-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}' +
    '#ir .ir-s{width:26px;height:26px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:none}' +
    '#ir .ir-pr{width:auto;margin:0;padding:6px 14px;font-size:14px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:999px;flex:none}' +
    '#ir .ir-more{padding:10px;border-top:1px solid var(--border);font-size:14px}' +
    '#ir .ir-more select,#ir .ir-more input{padding:10px;font-size:14px;margin-top:8px}' +
    '#ir .ir-sm{width:auto;margin:8px 8px 0 0;padding:8px 14px;font-size:14px;border-radius:8px}' +
    '#ir .ir-sm.del{background:transparent;color:#9b1c1c;border:1px solid #9b1c1c}' +
    '#ir .ir-sm.wa{background:#25d366}' +
    '#ir .ir-empty{text-align:center;color:var(--muted);padding:18px}' +
    '#irPrint{display:none}' +
    '@media print{body>*:not(#irPrint){display:none!important}#irPrint{display:block!important}@page{size:A4;margin:12mm}}';
  document.head.appendChild(css);

  /* ---------- القسم ---------- */
  var sec = document.createElement('section');
  sec.id = 'ir';
  sec.className = 'card hide';
  sec.innerHTML =
    '<div class="ir-eyebrow">QUALITY DEPARTMENT · قسم الجودة</div>' +
    '<div class="ir-head"><div><h2>طلبات الفحص</h2><p class="muted" id="irSub"></p></div>' +
      '<div class="ir-badge"><small>آخر IR في السجل</small><b id="irLast">-</b></div></div>' +

    '<form id="irForm" autocomplete="off">' +
      '<label class="ir-cap" for="ir_text">ما المراد فحصه؟</label>' +
      '<textarea id="ir_text" required placeholder="مثلاً: حدادة ونجارة حائط بحري فاصل 20"></textarea>' +
      '<div class="ir-chips" id="irChips"></div>' +
      '<label class="ir-cap" for="ir_sub">تاريخ التقديم</label>' +
      '<div class="ir-prep"><input id="ir_sub" type="date" required><button type="submit" class="ir-main">إعداد IR</button></div>' +
    '</form>' +

    '<div id="irPv" class="ir-pv hide">' +
      '<b id="irPvT"></b><pre id="irPvX"></pre>' +
      '<div class="ir-btns"><button type="button" id="irPvPr" class="ir-main">Print / PDF</button>' +
      '<button type="button" id="irPvWa" class="ir-wa">مشاركة واتساب</button></div>' +
    '</div>' +

    '<details class="ir-tools"><summary>أدوات السجل</summary>' +
      '<label class="ir-cap" for="ir_proj">اسم المشروع</label><input id="ir_proj" type="text">' +
      '<label class="ir-cap" for="ir_comp">اسم الشركة (اختياري)</label><input id="ir_comp" type="text">' +
      '<label class="ir-cap" for="ir_phone">رقم واتساب الاستشاري</label><input id="ir_phone" type="tel" dir="ltr" placeholder="01xxxxxxxxx">' +
      '<label class="ir-cap" for="ir_start">آخر رقم IR وصلتله قبل استخدام التطبيق</label><input id="ir_start" type="number" min="0" dir="ltr" placeholder="0">' +
      '<label class="ir-cap" for="ir_q">بحث في السجل</label><input id="ir_q" type="search" placeholder="رقم أو بند أو ملاحظات">' +
      '<label class="ir-cap" for="ir_f">فلتر الحالة</label>' +
      '<select id="ir_f"><option value="">كل الحالات</option>' +
        '<option value="pending">قيد المراجعة (W)</option><option value="approved">معتمد (A)</option>' +
        '<option value="comments">معتمد بملاحظات (C)</option><option value="rejected">مرفوض / إعادة معاينة (R)</option></select>' +
      '<button type="button" class="sec" id="irCsv">تصدير السجل (CSV)</button>' +
    '</details>' +

    '<div class="ir-cap" style="margin-top:22px">آخر الطلبات في السجل</div>' +
    '<div id="irList"></div>' +
    '<button type="button" class="link" id="irMore"></button>' +
    '<button type="button" class="sec" id="irBack">رجوع</button>';

  /* ---------- العرض ---------- */
  function renderHead() {
    var l = load(), s = getS(), n = lastNum(l, s);
    $('irSub').textContent = l.length + ' طلب في السجل';
    $('irLast').textContent = n || '-';
  }
  function renderChips() {
    var seen = {}, out = [];
    load().forEach(function (r) {
      var t = (r.text || '').trim();
      if (t && !seen[t] && out.length < 6) { seen[t] = 1; out.push(t); }
    });
    DEFAULTS.forEach(function (t) { if (!seen[t] && out.length < 6) { seen[t] = 1; out.push(t); } });
    $('irChips').innerHTML = out.map(function (t) {
      return '<button type="button" class="ir-chip" data-v="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
  }
  function renderList() {
    var l = load(), q = $('ir_q').value.trim().toLowerCase(), f = $('ir_f').value;
    var rows = l.filter(function (r) {
      if (f && r.status !== f) return false;
      if (!q) return true;
      return [r.num, r.text, r.proj, r.notes].join(' ').toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return b.num - a.num; });
    var filtering = !!(q || f);
    var vis = (showAll || filtering) ? rows : rows.slice(0, 8);

    if (!vis.length) {
      $('irList').innerHTML = '<div class="ir-empty">لا توجد طلبات</div>';
    } else {
      $('irList').innerHTML = vis.map(function (r) {
        var s = stOf(r.status);
        var opts = Object.keys(ST).map(function (k) {
          return '<option value="' + k + '"' + (k === r.status ? ' selected' : '') + '>' + ST[k][1] + '</option>';
        }).join('');
        return '<div class="ir-row" data-id="' + r.id + '">' +
          '<div class="ir-top" data-act="toggle"><b>' + r.num + '</b>' +
            '<span class="ir-t">' + esc(r.text) + '</span>' +
            '<span class="ir-s" style="color:' + s[2] + ';background:' + s[3] + '">' + s[0] + '</span>' +
            '<button type="button" class="ir-pr" data-act="print">Print</button></div>' +
          '<div class="ir-more' + (openRows[r.id] ? '' : ' hide') + '">' +
            '<div>' + esc(r.text) + '</div>' +
            '<div class="muted" style="margin-top:4px">تاريخ التقديم: ' + esc(r.sub) + (r.proj ? ' | ' + esc(r.proj) : '') + '</div>' +
            '<select data-act="status">' + opts + '</select>' +
            '<input data-act="notes" type="text" placeholder="ملاحظات الاستشاري" value="' + esc(r.notes) + '">' +
            '<button type="button" class="ir-sm wa" data-act="wa">واتساب</button>' +
            '<button type="button" class="ir-sm del" data-act="del">حذف</button>' +
          '</div></div>';
      }).join('');
    }
    var more = $('irMore');
    if (filtering || rows.length <= 8) more.classList.add('hide');
    else { more.classList.remove('hide'); more.textContent = showAll ? 'عرض أقل' : 'عرض كل الطلبات (' + rows.length + ')'; }
  }
  function renderAll() { renderHead(); renderChips(); renderList(); }

  /* ---------- الطباعة (نموذج A4) ---------- */
  function printIR(r) {
    var s = getS();
    function tick(k) { return r.status === k ? '&#9745;' : '&#9744;'; }
    function tr(a, b) {
      return '<tr><td style="border:1px solid #000;padding:8px;width:32%;font-weight:700;background:#f2f2f2">' + a +
             '</td><td style="border:1px solid #000;padding:8px">' + b + '</td></tr>';
    }
    var h = '<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#000;background:#fff;padding:6px">' +
      '<div style="text-align:center;border-bottom:3px solid #000;padding-bottom:8px;margin-bottom:14px">' +
        (s.company ? '<div style="font-size:20px;font-weight:700">' + esc(s.company) + '</div>' : '') +
        '<div style="font-size:22px;font-weight:700;margin-top:4px">طلب فحص واستلام أعمال</div>' +
        '<div style="font-size:14px">Inspection Request</div></div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:14px">' +
        tr('رقم الطلب (IR No.)', 'IR-' + r.num) +
        tr('المشروع', esc(r.proj || s.proj || '')) +
        tr('تاريخ تقديم الطلب', esc(r.sub)) +
      '</table>' +
      '<div style="border:1px solid #000;padding:10px;margin-bottom:14px">' +
        '<div style="font-weight:700;margin-bottom:6px">البند المطلوب فحصه:</div>' +
        '<div style="white-space:pre-wrap;min-height:110px;font-size:16px">' + esc(r.text) + '</div></div>' +
      '<div style="border:1px solid #000;padding:10px;margin-bottom:14px">' +
        '<div style="font-weight:700;margin-bottom:8px">رد الاستشاري:</div>' +
        '<div style="font-size:16px;line-height:2">' + tick('approved') + ' معتمد &nbsp;&nbsp; ' +
          tick('comments') + ' معتمد بملاحظات &nbsp;&nbsp; ' + tick('rejected') + ' مرفوض / إعادة معاينة</div>' +
        '<div style="font-weight:700;margin-top:10px">الملاحظات:</div>' +
        '<div style="white-space:pre-wrap;min-height:90px;border-bottom:1px dotted #000">' + esc(r.notes) + '</div></div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:15px;margin-top:24px"><tr>' +
        '<td style="width:50%;text-align:center;padding-top:6px">مهندس المقاول<div style="margin-top:46px;border-top:1px solid #000;width:70%;margin-right:auto;margin-left:auto">التوقيع / التاريخ</div></td>' +
        '<td style="width:50%;text-align:center;padding-top:6px">الاستشاري<div style="margin-top:46px;border-top:1px solid #000;width:70%;margin-right:auto;margin-left:auto">التوقيع / التاريخ</div></td>' +
      '</tr></table></div>';
    var box = $('irPrint');
    if (!box) { box = document.createElement('div'); box.id = 'irPrint'; document.body.appendChild(box); }
    box.innerHTML = h;
    setTimeout(function () { window.print(); }, 150);
  }

  function exportCSV() {
    var rows = [['IR', 'المشروع', 'البند', 'تاريخ التقديم', 'الحالة', 'ملاحظات الاستشاري']];
    load().forEach(function (r) { rows.push([r.num, r.proj, r.text, r.sub, stOf(r.status)[1], r.notes]); });
    var csv = '\ufeff' + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'ir-log.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function find(id) { return load().filter(function (r) { return r.id === id; })[0]; }
  function patch(id, p) {
    var l = load();
    l.forEach(function (r) { if (r.id === id) for (var k in p) r[k] = p[k]; });
    save(l);
  }

  /* ---------- التركيب ---------- */
  function mount() {
    var main = document.querySelector('main');
    if (!main || $('ir')) return;
    main.appendChild(sec);

    var s = getS();
    $('ir_sub').value = today();
    $('ir_proj').value = s.proj || '';
    $('ir_comp').value = s.company || '';
    $('ir_phone').value = s.phone || '';
    $('ir_start').value = s.start || '';

    function saveSettings() {
      setS({
        proj: $('ir_proj').value.trim(),
        company: $('ir_comp').value.trim(),
        phone: $('ir_phone').value.trim(),
        start: parseInt($('ir_start').value, 10) || 0
      });
      renderHead();
    }
    ['ir_proj', 'ir_comp', 'ir_phone', 'ir_start'].forEach(function (id) { $(id).addEventListener('change', saveSettings); });

    $('irChips').addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (v) { $('ir_text').value = v; $('ir_text').focus(); }
    });

    $('irForm').addEventListener('submit', function (e) {
      e.preventDefault();
      saveSettings();
      var l = load(), st = getS();
      var r = {
        id: 'ir' + Date.now(),
        num: lastNum(l, st) + 1,
        proj: st.proj,
        text: $('ir_text').value.trim(),
        sub: $('ir_sub').value,
        status: 'pending',
        notes: ''
      };
      l.unshift(r);
      save(l);
      last = r;
      $('ir_text').value = '';
      $('ir_sub').value = today();
      $('irPvT').textContent = 'تم إنشاء IR-' + r.num;
      $('irPvX').textContent = buildText(r);
      $('irPv').classList.remove('hide');
      renderAll();
      $('irPv').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('irPvPr').addEventListener('click', function () { if (last) printIR(last); });
    $('irPvWa').addEventListener('click', function () { if (last) window.open(waLink(last), '_blank'); });

    $('ir_q').addEventListener('input', renderList);
    $('ir_f').addEventListener('change', renderList);
    $('irCsv').addEventListener('click', exportCSV);
    $('irMore').addEventListener('click', function () { showAll = !showAll; renderList(); });

    $('irList').addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'), row = e.target.closest('.ir-row');
      if (!el || !row) return;
      var act = el.getAttribute('data-act'), id = row.getAttribute('data-id');
      if (act === 'toggle') {
        openRows[id] = !openRows[id];
        row.querySelector('.ir-more').classList.toggle('hide', !openRows[id]);
      } else if (act === 'print') {
        var r = find(id); if (r) printIR(r);
      } else if (act === 'wa') {
        var w = find(id); if (w) window.open(waLink(w), '_blank');
      } else if (act === 'del') {
        if (confirm('حذف الطلب ده؟')) { save(load().filter(function (x) { return x.id !== id; })); renderAll(); }
      }
    });
    $('irList').addEventListener('change', function (e) {
      var el = e.target.closest('[data-act]'), row = e.target.closest('.ir-row');
      if (!el || !row) return;
      var act = el.getAttribute('data-act'), id = row.getAttribute('data-id');
      if (act === 'status') { patch(id, { status: el.value }); renderList(); }
      if (act === 'notes') patch(id, { notes: el.value });
    });

    $('irBack').addEventListener('click', function () { goto('profile'); });
    renderAll();
  }
  function setS(s) { jset(SK, s); }

  function goto(id) {
    if (typeof window.show === 'function') window.show(id);
    else {
      document.querySelectorAll('main > section').forEach(function (x) { x.classList.add('hide'); });
      if ($(id)) $(id).classList.remove('hide');
    }
  }
  window.openIR = function () {
    document.querySelectorAll('main > section').forEach(function (x) { x.classList.add('hide'); });
    sec.classList.remove('hide');
    renderAll();
    window.scrollTo(0, 0);
  };

  function addButton() {
    var p = $('profile');
    if (!p || $('irOpenBtn')) return;
    var b = document.createElement('button');
    b.id = 'irOpenBtn';
    b.type = 'button';
    b.className = 'sec';
    b.textContent = 'طلبات الفحص الهندسية (IR)';
    b.onclick = window.openIR;
    var lo = $('logoutBtn');
    if (lo && lo.parentNode === p) p.insertBefore(b, lo); else p.appendChild(b);
  }
  function wrapShow() {
    var orig = window.show;
    if (typeof orig !== 'function' || orig.__ir) return;
    var w = function (id) {
      var r = orig.apply(this, arguments);
      if (id !== 'ir') sec.classList.add('hide');
      if (id === 'profile') addButton();
      return r;
    };
    w.__ir = true;
    window.show = w;
  }

  function init() { mount(); addButton(); wrapShow(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
  window.addEventListener('load', function () { addButton(); wrapShow(); });
})();
