(function () {
  try {
    if (localStorage.getItem('qi_noTrack')) return;
    var p = location.pathname;
    if (p.indexOf('/admin') === 0) return;
    var s = sessionStorage.getItem('qi_sid');
    if (!s) { s = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('qi_sid', s); }
    var body = JSON.stringify({
      accion: 'track', p: p, r: document.referrer || '', s: s,
      m: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'movil' : 'pc'
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/grupos', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/grupos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true });
    }
  } catch (e) {}
})();
