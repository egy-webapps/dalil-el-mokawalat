/* passkey.js v1 - بصمة الصباع (WebAuthn) قبل تسجيل الحضور والانصراف */
(function () {
  'use strict';
  try {
    if (typeof db === 'undefined' || !db.rpc) return;
    var orig = db.rpc.bind(db);

    function b64u(buf) {
      var b = new Uint8Array(buf), s = '';
      for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function fromB64u(s) {
      s = s.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var b = atob(s), a = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
      return a;
    }
    function rnd(n) { return crypto.getRandomValues(new Uint8Array(n)); }
    function say(t, k) { if (typeof msg === 'function') msg(t, k); }
    function fail(t) { setTimeout(function () { say(t, 'err'); }, 80); }

    async function enroll(user) {
      var cred = await navigator.credentials.create({
        publicKey: {
          challenge: rnd(32),
          rp: { name: 'دليل المقاولات', id: location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || user.id,
            displayName: user.email || 'worker'
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'discouraged'
          },
          timeout: 60000,
          attestation: 'none'
        }
      });
      var pk = cred.response.getPublicKey ? b64u(cred.response.getPublicKey()) : null;
      var ins = await db.from('passkeys').insert({
        user_id: user.id,
        credential_id: b64u(cred.rawId),
        public_key: pk,
        device: (navigator.userAgent || '').slice(0, 120)
      });
      if (ins.error) throw ins.error;
    }

    async function verify(credId) {
      var a = await navigator.credentials.get({
        publicKey: {
          challenge: rnd(32),
          rpId: location.hostname,
          allowCredentials: [{ type: 'public-key', id: fromB64u(credId), transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000
        }
      });
      var flags = new Uint8Array(a.response.authenticatorData)[32];
      return (flags & 0x04) !== 0;
    }

    function explain(e) {
      var m = String((e && e.message) || e || '');
      if (e && e.name === 'NotAllowedError') return 'البصمة اتلغت أو ما اتطابقتش، أو الموبايل ده مش الموبايل المسجّل. جرّب تاني.';
      if (e && e.name === 'InvalidStateError') return 'البصمة دي متسجلة قبل كده.';
      if (m.indexOf('passkeys') > -1 || (e && e.code === '42P01')) return 'جدول البصمات مش متعمل في Supabase.';
      return 'تعذر التحقق من البصمة: ' + m;
    }

    db.rpc = async function (name, args) {
      if (name !== 'clock_action') return orig.apply(null, arguments);
      try {
        if (!window.PublicKeyCredential || !navigator.credentials) {
          fail('المتصفح ده مش بيدعم البصمة. افتح الموقع من Chrome.');
          return { data: 'passkey_failed', error: null };
        }
        var u = await db.auth.getUser();
        var user = u && u.data && u.data.user;
        if (!user) {
          fail('لازم تسجل دخول الأول.');
          return { data: 'passkey_failed', error: null };
        }

        var q = await db.from('passkeys').select('credential_id').eq('user_id', user.id).limit(1);
        if (q.error) throw q.error;

        if (!q.data || !q.data.length) {
          if (!confirm('أول مرة: هتسجّل بصمة صباعك على الموبايل ده، وبعد كده مش هتقدر تبصم غير منه. تكمل؟')) {
            fail('اتلغى تسجيل البصمة.');
            return { data: 'passkey_failed', error: null };
          }
          await enroll(user);
        } else {
          var ok = await verify(q.data[0].credential_id);
          if (!ok) {
            fail('لازم تتحقق ببصمتك.');
            return { data: 'passkey_failed', error: null };
          }
        }
      } catch (e) {
        fail(explain(e));
        return { data: 'passkey_failed', error: null };
      }
      return orig.apply(null, arguments);
    };
  } catch (e) {
    var d = document.createElement('div');
    d.textContent = 'خطأ في البصمة: ' + (e && e.message);
    d.style.cssText = 'padding:8px;color:#b00;font-size:12px;text-align:center;';
    document.body.appendChild(d);
  }
})();
