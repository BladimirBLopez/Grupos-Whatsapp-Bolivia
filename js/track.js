(function () {
  try {
    if (localStorage.getItem('qi_noTrack')) return;
    var p = location.pathname;
    if (p.indexOf('/admin') === 0) return;
    var s = sessionStorage.getItem('qi_sid');
    if (!s) { s = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('qi_sid', s); }
    function enviar(obj) {
      var body = JSON.stringify(obj);
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/grupos', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/grupos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true });
      }
    }
    enviar({
      accion: 'track', p: p, r: document.referrer || '', s: s,
      m: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'movil' : 'pc'
    });
    var timer = null, vistos = {};
    document.addEventListener('input', function (ev) {
      var t = ev.target;
      if (!t || (t.id !== 'searchInput' && t.id !== 'searchInputNav')) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = (t.value || '').trim().toLowerCase();
        if (q.length < 2 || vistos[q]) return;
        vistos[q] = 1;
        var vacio = Array.prototype.some.call(document.querySelectorAll('.empty-message'), function (e) {
          return /no se encontraron/i.test(e.textContent);
        });
        enviar({ accion: 'evento', e: 'busq', q: q, r: vacio ? 0 : 1, s: s });
      }, 2000);
    });
  } catch (e) {}
})();
