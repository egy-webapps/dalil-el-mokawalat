/* tenderimg.js v1 - صورة للمناقصة (كاميرا أو معرض) */
(function () {
  'use strict';
  try {
    if (typeof db === 'undefined' || !db.from) return;
    var BUCKET = 'tender-images';
    var picked = null, prevUrl = null;

    function say(t, k) { if (typeof msg === 'function') msg(t, k); }

    function compress(file) {
      return new Promise(function (res, rej) {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () {
          var max = 1280, s = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          c.toBlob(function (b) { b ? res(b) : rej(new Error('compress')); }, 'image/jpeg', 0.8);
        };
        img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('bad image')); };
        img.src = url;
      });
    }

    function zoom(src) {
      var o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:12px';
      var i = document.createElement('img');
      i.src = src;
      i.style.cssText = 'max-width:100%;max-height:100%;border-radius:8px';
      o.appendChild(i);
      o.addEventListener('click', function () { o.remove(); });
      document.body.appendChild(o);
    }

    /* ---------- نموذج إضافة مناقصة ---------- */
    var form = document.getElementById('tenderForm');
    var sub = document.getElementById('t_btn');
    if (form && sub) {
      var box = document.createElement('div');
      box.innerHTML =
        '<label>صورة المناقصة (اختياري)</label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<button type="button" class="sec" id="tiCam" style="margin-top:4px">\u{1F4F7} تصوير</button>' +
          '<button type="button" class="sec" id="tiGal" style="margin-top:4px">\u{1F5BC}\uFE0F من المعرض</button>' +
        '</div>' +
        '<div id="tiPrev" class="hide" style="margin-top:10px">' +
          '<img id="tiImg" alt="" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;display:block">' +
          '<button type="button" class="sec" id="tiDel" style="margin-top:8px">إزالة الصورة</button>' +
        '</div>';
      var camIn = document.createElement('input');
      camIn.type = 'file'; camIn.accept = 'image/*'; camIn.setAttribute('capture', 'environment');
      camIn.style.display = 'none';
      var galIn = document.createElement('input');
      galIn.type = 'file'; galIn.accept = 'image/*';
      galIn.style.display = 'none';
      box.appendChild(camIn);
      box.appendChild(galIn);
      form.insertBefore(box, sub);

      var prev = box.querySelector('#tiPrev'), pimg = box.querySelector('#tiImg');
      function setPreview(blob) {
        if (prevUrl) { URL.revokeObjectURL(prevUrl); prevUrl = null; }
        if (blob) { prevUrl = URL.createObjectURL(blob); pimg.src = prevUrl; prev.classList.remove('hide'); }
        else { pimg.removeAttribute('src'); prev.classList.add('hide'); }
      }
      async function onPick(e) {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try { picked = await compress(f); setPreview(picked); }
        catch (err) { say('تعذر قراءة الصورة. جرّب صورة تانية.', 'err'); }
      }
      camIn.addEventListener('change', onPick);
      galIn.addEventListener('change', onPick);
      box.querySelector('#tiCam').addEventListener('click', function () { camIn.click(); });
      box.querySelector('#tiGal').addEventListener('click', function () { galIn.click(); });
      box.querySelector('#tiDel').addEventListener('click', function () { picked = null; setPreview(null); });
      form.addEventListener('reset', function () { picked = null; setPreview(null); });
    }

    /* ---------- رفع الصورة مع النشر + تحميل عمود الصورة مع القايمة ---------- */
    var origFrom = db.from.bind(db);
    db.from = function (table) {
      var q = origFrom(table);
      if (table !== 'tenders') return q;
      var oi = q.insert.bind(q), os = q.select.bind(q);

      q.insert = function (payload) {
        if (!picked) return oi.apply(null, arguments);
        var args = arguments;
        return (async function () {
          try {
            var u = await db.auth.getUser();
            var uid = (u && u.data && u.data.user) ? u.data.user.id : 'anon';
            var path = uid + '/' + Date.now() + '.jpg';
            var up = await db.storage.from(BUCKET).upload(path, picked, { contentType: 'image/jpeg' });
            if (up.error) throw up.error;
            var url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
            if (Array.isArray(payload)) payload.forEach(function (p) { p.image_url = url; });
            else payload.image_url = url;
          } catch (err) {
            return { data: null, error: { message: 'تعذر رفع الصورة: ' + ((err && err.message) || err) } };
          }
          return await oi.apply(null, args);
        })();
      };

      q.select = function () {
        var a = Array.prototype.slice.call(arguments);
        if (typeof a[0] === 'string' && a[0] !== '' && a[0].indexOf('image_url') < 0) a[0] += ',image_url';
        return os.apply(null, a);
      };
      return q;
    };

    /* ---------- عرض الصور في قايمة المناقصات ---------- */
    function decorate() {
      var list = document.getElementById('t_list');
      if (!list || typeof allTenders === 'undefined' || !allTenders) return;
      var used = {}, kids = list.children;
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k.querySelector('.timg')) continue;
        var b = k.querySelector('b');
        if (!b) continue;
        var title = b.textContent, t = null;
        for (var j = 0; j < allTenders.length; j++) {
          var c = allTenders[j];
          if (!used[c.id] && (c.title || '-') === title) { t = c; used[c.id] = 1; break; }
        }
        if (t && t.image_url) {
          var im = document.createElement('img');
          im.className = 'timg';
          im.loading = 'lazy';
          im.alt = '';
          im.src = t.image_url;
          im.style.cssText = 'width:100%;max-height:200px;object-fit:cover;border-radius:12px;margin-top:10px;cursor:zoom-in;display:block';
          (function (src) { im.addEventListener('click', function () { zoom(src); }); })(t.image_url);
          k.appendChild(im);
        }
      }
    }
    var tl = document.getElementById('t_list');
    if (tl) new MutationObserver(decorate).observe(tl, { childList: true });
  } catch (e) {
    var d = document.createElement('div');
    d.textContent = 'خطأ في صور المناقصات: ' + (e && e.message);
    d.style.cssText = 'padding:8px;color:#b00;font-size:12px;text-align:center;';
    document.body.appendChild(d);
  }
})();
