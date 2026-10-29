/* ir.js - قسم طلبات الفحص الهندسية (IR Maker)
   ضيف في index.html:  <script src="ir.js"></script>
   بيضيف نفسه لوحده: قسم جديد + زرار في الملف الشخصي. مفيش تعديل تاني مطلوب. */
(function () {
  'use strict';
  var KEY = 'ir_requests_v1', PH_KEY = 'ir_consultant_phone', PRJ_KEY = 'ir_project_name';

  var ST = {
    pending:  ['قيد المراجعة', '#92400e', '#fef3c7'],
    approved: ['معتمد - Approved', '#14532d', '#e1f5e7'],
    comments: ['معتمد بملاحظات - Approved with Comments', '#9a3412', '#ffedd5'],
    rejected: ['مرفوض / إعادة معاينة - Rejected', '#9b1c1c', '#fde8e8']
  };
  var CHIPS = ['حدادة ونجارة حائط', 'صب لبشة', 'إحداثيات خوازيق', 'حدادة سقف', 'صب أعمدة', 'عزل مائي', 'مواسير سباكة', 'تمديدات كهرباء'];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { alert('تعذر الحفظ المحلي'); } }
  function today() {
    var d = new Date(), m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function fmtDT(v) { return v ? v.replace('T', '  ') : '-'; }

  /* ---------- الستايل (بيستخدم متغيرات التطبيق الحالية) ---------- */
  var css = document.createElement('style');
  css.textContent =
    '#ir .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '#ir .chip{width:auto;margin:0;padding:6px 12px;font-size:14px;border-radius:999px;background:transparent;color:var(--orange);border:1px solid var(--orange);font-weight:600}' +
    '#ir .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '#ir .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}' +
    '#ir .wrap{overflow-x:auto;margin-top:10px;border:1px solid var(--border);border-radius:10px}' +
    '#ir table{border-collapse:collapse;width:100%;min-width:760px;font-size:14px}' +
    '#ir th{background:var(--navy);color:#fff;padding:10px 8px;text-align:right;white-space:nowrap}' +
    '#ir td{padding:8px;border-top:1px solid var(--border);vertical-align:top}' +
    '#ir td select,#ir td input{padding:8px;font-size:14px}' +
    '#ir .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:4px}' +
    '#ir .sm{width:auto;margin:0 0 4px;padding:6px 10px;font-size:13px;display:block}' +
    '#ir .sm.del{background:transparent;color:#9b1c1c;border:1px solid #9b1c1c}' +
    '#ir .sm.wa{background:#25d366}' +
    '#ir pre{white-space:pre-wrap;font-family:inherit;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:14px;margin:10px 0 0}' +
    '#ir .empty{text-align:center;color:var(--muted);padding:20px}';
  document.head.appendChild(css);

  /* ---------- القسم ---------- */
  var sec = document.createElement('section');
  sec.id = 'ir';
  sec.className = 'card hide';
  sec.innerHTML =
    '<h2>طلبات الفحص الهندسية (IR Maker)</h2>' +
    '<p class="muted">جهّز طلب الفحص، شاركه واتساب، وتابع ردود الاستشاري.</p>' +

    '<form id="irForm" autocomplete="off">' +
      '<label for="ir_proj">اسم المشروع</label>' +
      '<input id="ir_proj" type="text" required placeholder="مثال: برج النخيل - القاهرة الجديدة">' +

      '<label for="ir_what">ما المراد فحصه؟</label>' +
      '<input id="ir_what" type="text" required placeholder="مثال: حدادة ونجارة حائط">' +
      '<div class="chips" id="irChips"></div>' +

      '<label for="ir_bld">رقم المبنى / القطاع</label>' +
      '<input id="ir_bld" type="text" required placeholder="مثال: مبنى B - قطاع 2">' +
      '<div class="row2">' +
        '<div><label for="ir_grid">المحاور Gridlines</label><input id="ir_grid" type="text" dir="ltr" placeholder="A-C / 3-5"></div>' +
        '<div><label for="ir_lvl">المنسوب Level</label><input id="ir_lvl" type="text" dir="ltr" placeholder="+3.20"></div>' +
      '</div>' +

      '<label for="ir_sd">رقم لوحة الرسومات المعتمدة (Shop Drawing No)</label>' +
      '<input id="ir_sd" type="text" dir="ltr" placeholder="SD-STR-014">' +

      '<label for="ir_when">موعد المعاينة المطلوب</label>' +
      '<input id="ir_when" type="datetime-local" required>' +

      '<label for="ir_sub">تاريخ تقديم الطلب</label>' +
      '<input id="ir_sub" type="date" required>' +

      '<label for="ir_phone">رقم واتساب الاستشاري (اختياري، بصيغة دولية بدون +)</label>' +
      '<input id="ir_phone" type="tel" dir="ltr" placeholder="2010xxxxxxxx">' +

      '<button type="submit">إعداد وتوليد طلب الفحص</button>' +
    '</form>' +

    '<div id="irPreview" class="hide">' +
      '<pre id="irText"></pre>' +
      '<button id="irPvWa" type="button" style="background:#25d366">مشاركة سريعة عبر واتساب</button>' +
      '<button id="irPvCopy" type="button" class="sec">نسخ النص</button>' +
    '</div>' +

    '<h2 style="margin-top:26px">سجل الطلبات</h2>' +
    '<input id="ir_q" type="search" placeholder="ابحث بالرقم أو المشروع أو البند أو الموقع أو الملاحظات">' +
    '<select id="ir_f" style="margin-top:8px">' +
      '<option value="">كل الحالات</option>' +
      '<option value="pending">قيد المراجعة</option>' +
      '<option value="approved">معتمد</option>' +
      '<option value="comments">معتمد بملاحظات</option>' +
      '<option value="rejected">مرفوض / إعادة معاينة</option>' +
    '</select>' +
    '<p class="muted" id="irCount" style="margin-top:8px"></p>' +
    '<div class="wrap"><table>' +
      '<thead><tr><th>الرقم</th><th>البند والموقع</th><th>الموعد</th><th>الحالة وملاحظات الاستشاري</th><th></th></tr></thead>' +
      '<tbody id="irBody"></tbody>' +
    '</table></div>' +
    '<button class="sec" id="irBack" type="button">رجوع</button>';

  /* ---------- النص اللي بيتبعت ---------- */
  function buildText(r) {
    return [
      '*طلب فحص هندسي (IR) رقم: ' + r.num + '*',
      '',
      'المشروع: ' + (r.proj || '-'),
      'البند: ' + r.what,
      'المبنى / القطاع: ' + r.bld,
      'المحاور: ' + (r.grid || '-'),
      'المنسوب: ' + (r.lvl || '-'),
      'رقم لوحة الرسومات: ' + (r.sd || '-'),
      'موعد المعاينة: ' + fmtDT(r.when),
      'تاريخ تقديم الطلب: ' + r.sub,
      '',
      'برجاء التكرم بالمعاينة في الموعد المذكور. شكراً.'
    ].join('\n');
  }
  function waLink(r, phone) {
    var p = String(phone || '').replace(/\D/g, '');
    return 'https://wa.me/' + p + '?text=' + encodeURIComponent(buildText(r));
  }

  /* ---------- السجل ---------- */
  function render() {
    var list = load(), q = $('ir_q').value.trim().toLowerCase(), f = $('ir_f').value;
    var rows = list.filter(function (r) {
      if (f && r.status !== f) return false;
      if (!q) return true;
      return [r.num, r.proj, r.what, r.bld, r.grid, r.lvl, r.sd, r.notes].join(' ').toLowerCase().indexOf(q) > -1;
    });
    $('irCount').textContent = rows.length + ' من ' + list.length + ' طلب';
    if (!rows.length) {
      $('irBody').innerHTML = '<tr><td colspan="5" class="empty">لا توجد طلبات</td></tr>';
      return;
    }
    $('irBody').innerHTML = rows.map(function (r) {
      var s = ST[r.status] || ST.pending;
      var opts = Object.keys(ST).map(function (k) {
        return '<option value="' + k + '"' + (k === r.status ? ' selected' : '') + '>' + ST[k][0] + '</option>';
      }).join('');
      return '<tr data-id="' + r.id + '">' +
        '<td><b>' + esc(r.num) + '</b><br><span class="muted">' + esc(r.sub) + '</span></td>' +
        '<td><b>' + esc(r.what) + '</b><br><span class="muted">' +
          (r.proj ? 'مشروع: ' + esc(r.proj) + '<br>' : '') + esc(r.bld) +
          (r.grid ? ' | محاور ' + esc(r.grid) : '') + (r.lvl ? ' | منسوب ' + esc(r.lvl) : '') +
          (r.sd ? '<br>SD: ' + esc(r.sd) : '') + '</span></td>' +
        '<td>' + esc(fmtDT(r.when)) + '</td>' +
        '<td><span class="badge" style="color:' + s[1] + ';background:' + s[2] + '">' + s[0] + '</span>' +
          '<select data-act="status">' + opts + '</select>' +
          '<input data-act="notes" type="text" placeholder="ملاحظات الاستشاري" value="' + esc(r.notes) + '" style="margin-top:6px"></td>' +
        '<td><button class="sm wa" data-act="wa" type="button">واتساب</button>' +
          '<button class="sm del" data-act="del" type="button">حذف</button></td>' +
        '</tr>';
    }).join('');
  }

  function find(id) { return load().filter(function (r) { return r.id === id; })[0]; }
  function update(id, patch) {
    var list = load();
    list.forEach(function (r) { if (r.id === id) for (var k in patch) r[k] = patch[k]; });
    save(list);
  }

  /* ---------- التركيب في التطبيق ---------- */
  function mount() {
    var main = document.querySelector('main');
    if (!main || $('ir')) return;
    main.appendChild(sec);

    $('ir_sub').value = today();
    $('ir_phone').value = localStorage.getItem(PH_KEY) || '';
    $('ir_proj').value = localStorage.getItem(PRJ_KEY) || '';

    $('irChips').innerHTML = CHIPS.map(function (c) {
      return '<button type="button" class="chip" data-v="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    $('irChips').addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (v) { $('ir_what').value = v; $('ir_what').focus(); }
    });

    var last = null;
    $('irForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var list = load();
      var n = list.reduce(function (m, r) { return Math.max(m, parseInt(String(r.num).replace(/\D/g, ''), 10) || 0); }, 0) + 1;
      var r = {
        id: 'ir' + Date.now(),
        num: 'IR-' + ('00' + n).slice(-3),
        proj: $('ir_proj').value.trim(),
        what: $('ir_what').value.trim(),
        bld: $('ir_bld').value.trim(),
        grid: $('ir_grid').value.trim(),
        lvl: $('ir_lvl').value.trim(),
        sd: $('ir_sd').value.trim(),
        when: $('ir_when').value,
        sub: $('ir_sub').value,
        status: 'pending',
        notes: ''
      };
      list.unshift(r);
      save(list);
      localStorage.setItem(PH_KEY, $('ir_phone').value.trim());
      localStorage.setItem(PRJ_KEY, r.proj);
      last = r;
      $('irText').textContent = buildText(r);
      $('irPreview').classList.remove('hide');
      ['ir_what', 'ir_bld', 'ir_grid', 'ir_lvl', 'ir_sd', 'ir_when'].forEach(function (id) { $(id).value = ''; });
      $('ir_sub').value = today();
      render();
      $('irPreview').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    $('irPvWa').addEventListener('click', function () {
      if (last) window.open(waLink(last, localStorage.getItem(PH_KEY)), '_blank');
    });
    $('irPvCopy').addEventListener('click', function () {
      var t = $('irText').textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { alert('تم النسخ'); });
    });

    $('ir_q').addEventListener('input', render);
    $('ir_f').addEventListener('change', render);

    $('irBody').addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act'), tr = e.target.closest('tr');
      if (!act || !tr) return;
      var id = tr.getAttribute('data-id');
      if (act === 'del') {
        if (confirm('حذف الطلب ده؟')) { save(load().filter(function (r) { return r.id !== id; })); render(); }
      } else if (act === 'wa') {
        var r = find(id);
        if (r) window.open(waLink(r, localStorage.getItem(PH_KEY)), '_blank');
      }
    });
    $('irBody').addEventListener('change', function (e) {
      var act = e.target.getAttribute('data-act'), tr = e.target.closest('tr');
      if (!act || !tr) return;
      var id = tr.getAttribute('data-id');
      if (act === 'status') { update(id, { status: e.target.value }); render(); }
      if (act === 'notes') update(id, { notes: e.target.value });
    });

    $('irBack').addEventListener('click', function () { goto('profile'); });
    render();
  }

  function goto(id) {
    if (typeof window.show === 'function') window.show(id);
    else {
      document.querySelectorAll('main > section').forEach(function (s) { s.classList.add('hide'); });
      if ($(id)) $(id).classList.remove('hide');
    }
  }

  window.openIR = function () {
    document.querySelectorAll('main > section').forEach(function (s) { s.classList.add('hide'); });
    sec.classList.remove('hide');
    render();
    window.scrollTo(0, 0);
  };

  /* زرار في الملف الشخصي */
  function addButton() {
    var p = $('profile');
    if (!p || $('irOpenBtn')) return;
    var b = document.createElement('button');
    b.id = 'irOpenBtn';
    b.type = 'button';
    b.className = 'sec';
    b.textContent = 'طلبات الفحص الهندسية (IR)';
    b.onclick = window.openIR;
    var logout = $('logoutBtn');
    if (logout && logout.parentNode === p) p.insertBefore(b, logout); else p.appendChild(b);
  }

  /* أي تنقل عن طريق show() لازم يقفل قسم IR */
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
