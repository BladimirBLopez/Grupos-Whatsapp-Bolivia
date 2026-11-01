(function () {
  var dias = 30;
  var tabRef = document.getElementById('tabDestacados');
  var secRef = document.getElementById('seccionDestacados');
  if (!tabRef || !secRef) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var tab = tabRef.cloneNode(true);
  tab.id = 'tabMetricas';
  tab.removeAttribute('onclick');
  tab.onclick = function () { mostrarSeccion('metricas'); };
  tab.innerHTML = '<i class="fas fa-chart-line"></i> Métricas';
  tab.style.background = 'transparent';
  tab.style.color = '#6b7f8e';
  tabRef.parentNode.insertBefore(tab, tabRef.nextSibling);

  var sec = document.createElement('div');
  sec.id = 'seccionMetricas';
  sec.style.display = 'none';
  secRef.parentNode.insertBefore(sec, secRef.nextSibling);

  var nombrePais = null;
  try { nombrePais = new Intl.DisplayNames(['es'], { type: 'region' }); } catch (e) {}

  function card(t, v) {
    return '<div style="flex:1;min-width:130px;background:#fff;border-radius:14px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
      '<div style="font-size:.75rem;color:#6b7f8e;">' + esc(t) + '</div>' +
      '<div style="font-size:1.6rem;font-weight:700;color:#1a2c3e;">' + esc(v) + '</div></div>';
  }

  function lista(titulo, filas) {
    var max = filas.reduce(function (m, f) { return Math.max(m, f.n); }, 1);
    var h = '<div style="background:#fff;border-radius:14px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:1rem;">' +
      '<div style="font-weight:600;margin-bottom:.6rem;color:#1a2c3e;">' + esc(titulo) + '</div>';
    if (!filas.length) h += '<div style="color:#9aa8b4;font-size:.85rem;">Sin datos todavía</div>';
    filas.forEach(function (f) {
      h += '<div style="margin-bottom:.45rem;font-size:.85rem;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(f.label) + '</span><b>' + f.n + '</b></div>' +
        '<div style="height:5px;background:#eef2f5;border-radius:4px;"><div style="height:5px;width:' + Math.round(f.n / max * 100) + '%;background:#25D366;border-radius:4px;"></div></div></div>';
    });
    return h + '</div>';
  }

  function grafico(porDia) {
    var max = porDia.reduce(function (m, d) { return Math.max(m, d.vistas); }, 1);
    var h = '<div style="background:#fff;border-radius:14px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:1rem;">' +
      '<div style="font-weight:600;margin-bottom:.6rem;color:#1a2c3e;">Visitas por día</div>' +
      '<div style="display:flex;align-items:flex-end;gap:3px;height:110px;overflow-x:auto;">';
    porDia.forEach(function (d) {
      h += '<div title="' + esc(d.dia) + ': ' + d.vistas + ' vistas, ' + d.sesiones + ' sesiones" style="flex:1;min-width:8px;height:' + Math.max(3, Math.round(d.vistas / max * 100)) + '%;background:#25D366;border-radius:3px 3px 0 0;"></div>';
    });
    if (!porDia.length) h += '<div style="color:#9aa8b4;font-size:.85rem;">Sin datos todavía</div>';
    return h + '</div></div>';
  }

  function bloqueEventos(ev) {
    var t = ev.totales || {};
    var conv = t.join ? Math.round((t.go || 0) / t.join * 100) : 0;
    return '<div style="font-weight:700;font-size:1.05rem;color:#1a2c3e;margin:1.2rem 0 .6rem;">Clics en Unirse y búsquedas</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:1rem;">' +
      card('Clics en Unirse', t.join || 0) + card('Pulsaron Unirme ahora', t.go || 0) + card('Conversión', conv + '%') + card('Búsquedas', t.busq || 0) + '</div>' +
      lista('Grupos con más clics en Unirse', (ev.grupos || []).map(function (x) { return { label: x.g + ' (' + x.pl + ') · ' + x.confirmados + ' confirmados', n: x.clics }; })) +
      lista('Desde dónde hacen clic', (ev.origenes || []).map(function (x) { return { label: x.k || 'otro', n: x.n }; })) +
      lista('Búsquedas más frecuentes', (ev.busquedas || []).map(function (x) { return { label: x.k, n: x.n }; })) +
      lista('Búsquedas sin resultados (lo que falta en tu web)', (ev.sinResultados || []).map(function (x) { return { label: x.k, n: x.n }; }));
  }
  function delta(a, b) {
    if (b == null) return '';
    if (!b) return '<div style="font-size:.7rem;color:#9aa8b4;">sin datos previos</div>';
    var p = Math.round((a - b) / b * 100);
    var ok = p >= 0;
    return '<div style="font-size:.72rem;font-weight:600;color:' + (ok ? '#16a34a' : '#dc2626') + ';">' + (ok ? '▲ +' : '▼ ') + p + '% vs período anterior</div>';
  }

  function cardD(t, v, extra) {
    return '<div style="flex:1;min-width:130px;background:#fff;border-radius:14px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
      '<div style="font-size:.75rem;color:#6b7f8e;">' + esc(t) + '</div>' +
      '<div style="font-size:1.6rem;font-weight:700;color:#1a2c3e;">' + esc(v) + '</div>' + (extra || '') + '</div>';
  }

  function nota(t) { return '<div style="font-size:.72rem;color:#9aa8b4;">' + esc(t) + '</div>'; }

  function kpisAv(av) {
    var k = av.kpis, a = av.anterior;
    return cardD('Páginas vistas', k.vistas, delta(k.vistas, a ? a.vistas : null)) +
      cardD('Sesiones', k.sesiones, delta(k.sesiones, a ? a.sesiones : null)) +
      cardD('Páginas por sesión', k.paginasPorSesion, nota('promedio')) +
      cardD('Rebote', k.rebote + '%', nota('vieron 1 sola página')) +
      cardD('Activos ahora', av.ahora.sesiones, nota('últimos 30 min'));
  }

  function mapaCalor(grid) {
    var nom = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    var max = 0, pico = null;
    grid.forEach(function (fila, i) {
      fila.forEach(function (n, h) { if (n > max) { max = n; pico = nom[i] + ' ' + h + ':00'; } });
    });
    var h = '<div style="background:#fff;border-radius:14px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:1rem;">' +
      '<div style="font-weight:600;margin-bottom:.2rem;color:#1a2c3e;">Mejores horas y días (hora de La Paz)</div>' +
      '<div style="font-size:.78rem;color:#6b7f8e;margin-bottom:.6rem;">' + (pico ? 'Pico de visitas: ' + esc(pico) : 'Sin datos todavía') + '</div>' +
      '<div style="overflow-x:auto;"><div style="min-width:420px;">' +
      '<div style="display:flex;gap:2px;margin-left:34px;margin-bottom:2px;">';
    for (var x = 0; x < 24; x++) {
      h += '<div style="width:14px;font-size:.55rem;color:#9aa8b4;text-align:center;">' + (x % 3 === 0 ? x : '') + '</div>';
    }
    h += '</div>';
    grid.forEach(function (fila, i) {
      h += '<div style="display:flex;gap:2px;margin-bottom:2px;align-items:center;"><div style="width:32px;font-size:.65rem;color:#6b7f8e;">' + nom[i] + '</div>';
      fila.forEach(function (n, hr) {
        var bg = n ? 'rgba(37,211,102,' + (0.15 + 0.85 * n / max).toFixed(2) + ')' : '#eef2f5';
        h += '<div title="' + nom[i] + ' ' + hr + ':00 · ' + n + ' vistas" style="width:14px;height:14px;border-radius:3px;background:' + bg + ';"></div>';
      });
      h += '</div>';
    });
    return h + '</div></div></div>';
  }

  function bloqueAv(av) {
    return '<div style="font-weight:700;font-size:1.05rem;color:#1a2c3e;margin:1.2rem 0 .6rem;">Análisis de audiencia</div>' +
      mapaCalor(av.calor) +
      lista('Tipos de tráfico', av.trafico.map(function (x) { return { label: x.k, n: x.n }; })) +
      lista('Visitas por tipo de página', av.tiposPagina.map(function (x) { return { label: x.k, n: x.n }; })) +
      lista('Páginas de entrada (sesiones · rebote)', av.entradas.map(function (x) { return { label: x.k + ' · ' + x.rebote + '% rebote', n: x.n }; })) +
      lista('Visitas por departamento (Bolivia)', av.departamentos.map(function (x) { return { label: x.k, n: x.n }; }));
  }

  window.cargarMetricas = async function () {
    sec.innerHTML = '<div style="padding:1rem;color:#6b7f8e;">Cargando métricas…</div>';
    try {
      var res = await fetch('/api/grupos?metricas=1&dias=' + dias, { headers: { 'x-admin-token': getToken() } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var d = await res.json();
      var av = null;
      try {
        var r3 = await fetch('/api/grupos?metricas=avanzado&dias=' + dias, { headers: { 'x-admin-token': getToken() } });
        if (r3.ok) av = await r3.json();
      } catch (e3) {}
      var btns = [7, 30, 90].map(function (n) {
        var act = n === dias;
        return '<button onclick="cambiarDiasMetricas(' + n + ')" style="padding:6px 14px;border:none;border-radius:50px;cursor:pointer;font-weight:600;background:' + (act ? '#25D366' : '#eef2f5') + ';color:' + (act ? '#fff' : '#6b7f8e') + ';">' + n + ' días</button>';
      }).join(' ');
      var h = '<div style="display:flex;gap:6px;margin:0 0 1rem;flex-wrap:wrap;">' + btns + '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:1rem;">' + (av ? kpisAv(av) : card('Páginas vistas', d.totalVistas) + card('Sesiones', d.totalSesiones)) + '</div>' +
        grafico(d.porDia) + (av ? bloqueAv(av) : '') +
        lista('Páginas más vistas', d.paginas.map(function (x) { return { label: x.k, n: x.n }; })) +
        lista('De dónde llegan', d.fuentes.map(function (x) { return { label: x.k || 'directo', n: x.n }; })) +
        lista('Países', d.paises.map(function (x) {
          var l = x.k || 'Desconocido';
          try { if (nombrePais && x.k) l = nombrePais.of(x.k); } catch (e) {}
          return { label: l, n: x.n };
        })) +
        lista('Ciudades', d.ciudades.map(function (x) { return { label: (x.k.ciudad || '?') + (x.k.pais ? ' (' + x.k.pais + ')' : ''), n: x.n }; })) +
        lista('Dispositivos', d.dispositivos.map(function (x) { return { label: x.k === 'movil' ? 'Móvil' : 'PC', n: x.n }; })) +
        lista('Grupos con más visitas (acumulado)', d.topGrupos.map(function (g) { return { label: g.nombre + (g.ubicacion ? ' · ' + g.ubicacion : ''), n: g.visitas || 0 }; })) +
        '<div style="font-size:.75rem;color:#9aa8b4;">Sin IP ni cookies. Se excluyen bots y tu sesión de admin. Los datos se borran solos a los 90 días.</div>';
      try {
        var r2 = await fetch('/api/grupos?metricas=eventos&dias=' + dias, { headers: { 'x-admin-token': getToken() } });
        if (r2.ok) { h += bloqueEventos(await r2.json()); }
      } catch (e2) {}
      sec.innerHTML = h;
    } catch (e) {
      sec.innerHTML = '<div style="padding:1rem;color:#c0392b;">No se pudieron cargar las métricas (' + esc(e.message) + ').</div>';
    }
  };

  window.cambiarDiasMetricas = function (n) { dias = n; window.cargarMetricas(); };

  window.alCambiarSeccion = function (seccion) {
    var es = seccion === 'metricas';
    sec.style.display = es ? 'block' : 'none';
    tab.style.background = es ? '#3B82F6' : 'transparent';
    tab.style.color = es ? '#fff' : '#6b7f8e';
    if (es) window.cargarMetricas();
  };
})();
