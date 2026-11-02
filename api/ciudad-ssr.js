import { MongoClient } from 'mongodb';

const PLATAFORMA_ICONO = { whatsapp:'fab fa-whatsapp', telegram:'fab fa-telegram', facebook:'fab fa-facebook', instagram:'fab fa-instagram', otro:'fas fa-link' };
const PLATAFORMA_COLOR = { whatsapp:'#25D366', telegram:'#229ED9', facebook:'#1877F2', instagram:'#E1306C', otro:'#8ba0ae' };
const PLATAFORMA_LABEL = { whatsapp:'WhatsApp', telegram:'Telegram', facebook:'Facebook', instagram:'Instagram', otro:'Otro' };

const CIUDADES = {
  'santa-cruz':  'Santa Cruz',
  'la-paz':      'La Paz',
  'cochabamba':  'Cochabamba',
  'sucre':       'Sucre',
  'tarija':      'Tarija',
  'potosi':      'Potosí',
  'oruro':       'Oruro',
  'beni':        'Beni',
  'pando':       'Pando'
};

let cachedClient = null;
async function conectar() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta la variable de entorno MONGODB_URI');
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

function optimizarImg(url) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_100,h_100,c_fill/');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return String(str || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugGrupo(grupo) {
  return `${slugify(grupo.nombre) || 'grupo'}-${grupo.id}`;
}

function redirUrl(grupo) {
  return `/redir.html?url=${encodeURIComponent(grupo.link||'#')}&nombre=${encodeURIComponent(grupo.nombre||'Grupo')}&plat=${encodeURIComponent((grupo.plataforma||'whatsapp').toLowerCase())}&id=${encodeURIComponent(grupo.id||'')}`;
}

function tarjetaHtml(grupo) {
  const plat  = (grupo.plataforma || 'whatsapp').toLowerCase();
  const icono = PLATAFORMA_ICONO[plat] || PLATAFORMA_ICONO.otro;
  const label = PLATAFORMA_LABEL[plat] || 'Otro';
  const nombreSeguro = escapeHtml(grupo.nombre);
  const tieneImagen = grupo.imagen && grupo.imagen.trim() && !grupo.imagen.includes('undefined');
  const redir = redirUrl(grupo);
  const ciudadTxt = escapeHtml(grupo.ubicacion || 'Bolivia');
  const inicial = (String(grupo.nombre || '').match(/[\p{L}\p{N}]/u) || ['G'])[0].toUpperCase();
  const catKey = grupo.categoria || '';
  let catTxt = '';
  if (typeof CATEGORIA_LABEL !== 'undefined' && CATEGORIA_LABEL[catKey]) catTxt = CATEGORIA_LABEL[catKey];
  else if (typeof CAT_NOMBRE_URL !== 'undefined' && CAT_NOMBRE_URL[catKey]) catTxt = CAT_NOMBRE_URL[catKey];

  return `
  <article class="grupo-card" data-plat="${plat}">
    <div class="card-header">
      ${tieneImagen
        ? `<img src="${escapeHtml(optimizarImg(grupo.imagen))}" alt="${nombreSeguro}" class="grupo-foto" width="52" height="52" loading="lazy">`
        : `<div class="grupo-foto-placeholder" aria-hidden="true">${escapeHtml(inicial)}</div>`}
      <div class="card-info">
        <h3><a href="/grupo/${slugGrupo(grupo)}">${nombreSeguro||'Sin nombre'}</a></h3>
        <div class="card-meta">
          <span><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${ciudadTxt}</span>
          <span><i class="fas fa-users" aria-hidden="true"></i> ${grupo.miembros||0} miembros</span>
        </div>
      </div>
    </div>
    <div class="card-tags">
      ${catTxt ? `<span class="pill">${escapeHtml(catTxt)}</span>` : ''}
      <span class="pill"><i class="${icono}" aria-hidden="true"></i> ${label}</span>
    </div>
    ${grupo.descripcion?`<p class="descripcion">${escapeHtml(grupo.descripcion)}</p>`:''}
    <div class="card-actions">
      <a href="${redir}" rel="nofollow" class="join-btn">Unirse al grupo</a>
      <button type="button" class="report-btn" onclick="reportarLinkSSR('${grupo.id}','${nombreSeguro}')" title="Reportar link caído" aria-label="Reportar link caído"><i class="fas fa-flag"></i></button>
    </div>
  </article>`;
}

export default async function handler(req, res) {
  try {
    const { slug, categoria: categoriaQuery, plataforma: plataformaFiltro, cat: catPath } = req.query;
    const categoriaFiltro = catPath || categoriaQuery;
    const nombreCiudad = CIUDADES[slug];
    if (!nombreCiudad) {
      res.status(404).send('Ciudad no encontrada');
      return;
    }

    const client = await conectar();
    const db = client.db('grupos_db');
    const col = db.collection('grupos');

    const localesRaw = await col.find({ ubicacion: nombreCiudad }).limit(50).toArray();

    let locales = localesRaw.map(g => ({ ...g, id: g._id.toString() }));

    // Paginas ciudad + categoria: solo con 3+ grupos y max 70% de la ciudad
    const CAT_NOMBRE_URL = { 'compra-venta': 'Compra y Venta', empleos: 'Empleos', inmuebles: 'Inmuebles', ropa: 'Ropa', citas: 'Citas y Amigos', futbol: 'Fútbol' };
    const conteoTodos = {};
    localesRaw.forEach(g => { const c = g.categoria || 'compra-venta'; conteoTodos[c] = (conteoTodos[c] || 0) + 1; });
    const calificaCat = (c) => !!CAT_NOMBRE_URL[c] && (conteoTodos[c] || 0) >= 3 && conteoTodos[c] / localesRaw.length <= 0.7;
    if (catPath && !calificaCat(catPath)) {
      res.setHeader('Location', `/grupos-whatsapp/${slug}`);
      return res.status(302).end();
    }
    const catsConPagina = Object.keys(conteoTodos).filter(calificaCat).sort((a, b) => conteoTodos[b] - conteoTodos[a]);
    const catNombre = catPath ? CAT_NOMBRE_URL[catPath] : null;

    // Aplicar filtros que llegan desde el panel de Filtros del home (opcionales)
    if (categoriaFiltro) {
      locales = locales.filter(g => (g.categoria || 'compra-venta') === categoriaFiltro);
    }
    if (plataformaFiltro) {
      locales = locales.filter(g => (g.plataforma || 'whatsapp').toLowerCase() === plataformaFiltro);
    }

    const localesHtml = locales.length
      ? locales.map(tarjetaHtml).join('')
      : (categoriaFiltro || plataformaFiltro)
        ? `<div class="empty-message">No hay grupos que coincidan con ese filtro en ${escapeHtml(nombreCiudad)}</div>`
        : `<div class="empty-message">Todavía no hay grupos locales en ${escapeHtml(nombreCiudad)}</div>`;

    const totalGrupos = locales.length;
    const plataformaLabelH1 = plataformaFiltro ? (PLATAFORMA_LABEL[plataformaFiltro] || 'WhatsApp') : 'WhatsApp, Telegram y Facebook';
    const catCanon = catPath || ((categoriaQuery && calificaCat(categoriaQuery)) ? categoriaQuery : null);
    const canonicalUrl = `https://www.qigruposbo.online/grupos-whatsapp/${slug}${catCanon ? '/' + catCanon : ''}`;
    const tituloBase = catNombre ? `Grupos de WhatsApp de ${catNombre} en ${nombreCiudad}` : `Grupos de WhatsApp en ${nombreCiudad}, Bolivia`;
    const titulo = (tituloBase + ' | Qigrupos').length <= 60 ? tituloBase + ' | Qigrupos' : tituloBase;
    const descripcion = catNombre ? `Únete a grupos de WhatsApp de ${catNombre.toLowerCase()} en ${nombreCiudad}, Bolivia: ${conteoTodos[catPath]} grupos activos. También Telegram y Facebook.` : `Únete a grupos de WhatsApp en ${nombreCiudad}, Bolivia: compra y venta, empleos, inmuebles y más. También Telegram y Facebook.${totalGrupos ? ` ${totalGrupos} grupos activos.` : ''}`;

    const CAT_TXT = { 'compra-venta': 'compra y venta', empleos: 'empleos', inmuebles: 'inmuebles', ropa: 'ropa', citas: 'citas y amigos', futbol: 'fútbol', otro: 'otros' };
    const conteoCat = {};
    locales.forEach(g => { const c = g.categoria || 'compra-venta'; conteoCat[c] = (conteoCat[c] || 0) + 1; });
    const resumenCat = Object.entries(conteoCat).filter(([c]) => c !== 'otro').sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${CAT_TXT[c] || c} (${n})`).join(', ');
    const introCiudad = (!categoriaFiltro && !plataformaFiltro && totalGrupos)
      ? `<p class="intro-ciudad" style="margin:0 0 1rem;font-size:.95rem;line-height:1.5;color:#4a5a6a;">Directorio de grupos de WhatsApp, Telegram y Facebook en ${escapeHtml(nombreCiudad)}${nombreCiudad === 'Santa Cruz' ? ' (Santa Cruz de la Sierra)' : ''}, Bolivia. ${totalGrupos} grupos publicados${resumenCat ? ': ' + resumenCat : ''}. Elige un grupo y únete con un solo toque.</p>`
      : '';

    const scTxt = nombreCiudad === 'Santa Cruz' ? ' (Santa Cruz de la Sierra)' : '';
    const introCategoria = (catNombre && !plataformaFiltro && totalGrupos)
      ? `<p class="intro-ciudad" style="margin:0 0 1rem;font-size:.95rem;line-height:1.5;color:#4a5a6a;">Directorio de grupos de WhatsApp de ${escapeHtml(catNombre.toLowerCase())} en ${escapeHtml(nombreCiudad)}${scTxt}, Bolivia. ${totalGrupos} grupos publicados. ¿Buscas otro tema? <a href="/grupos-whatsapp/${slug}" style="color:#075E54;">Ver todos los grupos de ${escapeHtml(nombreCiudad)}</a>.</p>`
      : '';
    const otrasCats = catsConPagina.filter(c => c !== catPath);
    const enlacesCats = ((!categoriaFiltro || catNombre) && !plataformaFiltro && (otrasCats.length || catNombre))
      ? `<nav aria-label="Categorías en ${escapeHtml(nombreCiudad)}" style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 1rem;">${catNombre ? `<a href="/grupos-whatsapp/${slug}" style="background:#e9f9ef;color:#075E54;padding:6px 14px;border-radius:20px;font-size:.85rem;text-decoration:none;">Todos (${localesRaw.length})</a>` : ''}${otrasCats.map(c => `<a href="/grupos-whatsapp/${slug}/${c}" style="background:#f0f4f8;color:#1a2c3e;padding:6px 14px;border-radius:20px;font-size:.85rem;text-decoration:none;">${escapeHtml(CAT_NOMBRE_URL[c])} (${conteoTodos[c]})</a>`).join('')}</nav>`
      : '';

    const nombreItem = (n) => (String(n || '').replace(/[^\p{L}\p{N}\s.,&'()-]/gu, '').replace(/\s+/g, ' ').trim() || 'Grupo');
    const jsonLdLista = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: titulo,
      url: canonicalUrl,
      description: descripcion,
      inLanguage: 'es-BO',
      isPartOf: { '@type': 'WebSite', name: 'Qigrupos Bolivia', url: 'https://www.qigruposbo.online/' },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: locales.length,
        itemListElement: locales.slice(0, 20).map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: nombreItem(g.nombre),
          url: 'https://www.qigruposbo.online/grupo/' + slugGrupo(g)
        }))
      }
    }).replace(/</g, '\\u003c');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes">
  <title>${escapeHtml(titulo)}</title>
  <meta name="description" content="${escapeHtml(descripcion)}">
  <meta name="robots" content="${localesRaw.length ? "index, follow" : "noindex, follow"}">
  <meta name="geo.region" content="BO">
  <meta name="geo.country" content="Bolivia">
  <meta property="og:title" content="${escapeHtml(titulo)}">
  <meta property="og:description" content="${escapeHtml(descripcion)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:locale" content="es_BO">
  <meta property="og:site_name" content="Qigrupos Bolivia">
  <meta property="og:image" content="https://www.qigruposbo.online/css/images/og-image.jpg">
  <link rel="canonical" href="${canonicalUrl}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Inicio","item":"https://www.qigruposbo.online/"},
      {"@type":"ListItem","position":2,"name":"${escapeHtml(nombreCiudad)}","item":"https://www.qigruposbo.online/grupos-whatsapp/${slug}"}${catNombre ? `,
      {"@type":"ListItem","position":3,"name":"${escapeHtml(catNombre)}","item":"${canonicalUrl}"}` : ''}
    ]
  }
  </script>
  <script type="application/ld+json">${jsonLdLista}</script>
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" media="print" onload="this.media='all'">
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">
  </noscript>
  <link rel="stylesheet" href="/css/styles.css?v=20261102a">
</head>
<body>
<div class="container">
  <div class="hero hero-v2 hero-int">
    <nav class="migas" aria-label="Migas de pan"><ol><li><a href="/">Inicio</a></li>${catNombre ? `<li><a href="/grupos-whatsapp/${slug}">${escapeHtml(nombreCiudad)}</a></li><li aria-current="page">${escapeHtml(catNombre)}</li>` : `<li aria-current="page">${escapeHtml(nombreCiudad)}</li>`}</ol></nav>
    <h1>Grupos de ${plataformaFiltro ? plataformaLabelH1 : 'WhatsApp'}${catNombre ? ' de ' + escapeHtml(catNombre) : ''} en <span>${escapeHtml(nombreCiudad)}</span></h1>
    <p>${totalGrupos} grupos de WhatsApp, Telegram y Facebook</p>
  </div>

  <div class="plataforma-filtros" id="filtroPlataforma">
    <div class="filter-chip${!plataformaFiltro ? ' active' : ''}" data-platform="todos">🌐 Todas</div>
    <div class="filter-chip${plataformaFiltro === 'whatsapp' ? ' active' : ''}" data-platform="whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</div>
    <div class="filter-chip${plataformaFiltro === 'telegram' ? ' active' : ''}" data-platform="telegram"><i class="fab fa-telegram"></i> Telegram</div>
    <div class="filter-chip${plataformaFiltro === 'facebook' ? ' active' : ''}" data-platform="facebook"><i class="fab fa-facebook"></i> Facebook</div>
    <div class="filter-chip${plataformaFiltro === 'instagram' ? ' active' : ''}" data-platform="instagram"><i class="fab fa-instagram"></i> Instagram</div>
  </div>

  ${(categoriaFiltro && !catNombre) ? `<div style="display:flex;align-items:center;gap:8px;background:#e9f9ef;border-radius:10px;padding:0.6rem 0.9rem;margin-bottom:1rem;font-size:0.85rem;color:#075E54;">
    <i class="fas fa-filter"></i> Categoría: <strong>${escapeHtml(categoriaFiltro)}</strong>
    <a href="/grupos-whatsapp/${slug}${plataformaFiltro ? `?plataforma=${encodeURIComponent(plataformaFiltro)}` : ''}" style="margin-left:auto;color:#075E54;text-decoration:none;font-weight:600;">Quitar &times;</a>
  </div>` : ''}

  ${introCiudad}${introCategoria}${enlacesCats}
  <div id="gruposContainer" class="grupos-grid">${localesHtml}</div>


  <footer class="site-footer">
    <p class="footer-brand"><strong>Qigrupos Bolivia</strong> · Gratis y sin registro</p>
    <details class="footer-col"><summary><h2>Grupos por ciudad</h2></summary><ul class="footer-links"><li><a href="/grupos-whatsapp/santa-cruz">Santa Cruz</a></li><li><a href="/grupos-whatsapp/la-paz">La Paz</a></li><li><a href="/grupos-whatsapp/cochabamba">Cochabamba</a></li><li><a href="/grupos-whatsapp/sucre">Sucre</a></li><li><a href="/grupos-whatsapp/tarija">Tarija</a></li><li><a href="/grupos-whatsapp/potosi">Potosí</a></li><li><a href="/grupos-whatsapp/oruro">Oruro</a></li><li><a href="/grupos-whatsapp/beni">Beni</a></li><li><a href="/grupos-whatsapp/pando">Pando</a></li></ul></details>
    <details class="footer-col"><summary><h2>Categorías</h2></summary><ul class="footer-links"><li><a href="/categoria/compra-venta">Compra y venta</a></li><li><a href="/categoria/empleos">Empleos</a></li><li><a href="/categoria/inmuebles">Inmuebles</a></li><li><a href="/categoria/ropa">Ropa</a></li><li><a href="/categoria/citas">Citas y amigos</a></li></ul></details>
    <h2>Información</h2>
    <ul class="footer-links"><li><a href="/quienes-somos.html">Quiénes somos</a></li><li><a href="/contacto.html">Contacto</a></li><li><a href="/privacidad.html">Privacidad</a></li><li><a href="/terminos.html">Términos</a></li><li><a href="/contacto.html#reportar">Reportar un grupo</a></li><li><a href="/anadir.html">Añadir mi grupo</a></li></ul>
    <p class="footer-aviso">Directorio independiente. No estamos afiliados a WhatsApp, Telegram ni Facebook.</p>
  </footer>
</div>

<div id="confirmReporteModal" class="modal-confirm">
  <div class="modal-confirm-content">
    <div class="modal-confirm-icon"><i class="fas fa-flag"></i></div>
    <h3>¿Reportar este enlace?</h3>
    <p id="confirmReporteTexto"></p>
    <div class="modal-confirm-actions">
      <button class="btn-confirm-cancelar" id="cancelReporteBtn">Cancelar</button>
      <button class="btn-confirm-aceptar" id="aceptarReporteBtn"><i class="fas fa-flag"></i> Si, reportar</button>
    </div>
  </div>
</div>

<script>
let reporteIdPendienteSSR = null;

function reportarLinkSSR(id, nombre) {
  if (!id) return;
  reporteIdPendienteSSR = id;
  document.getElementById('confirmReporteTexto').textContent = 'Reportar el enlace de "' + nombre + '" como caido?';
  document.getElementById('confirmReporteModal').style.display = 'flex';
}

function cerrarConfirmReporteSSR() {
  document.getElementById('confirmReporteModal').style.display = 'none';
  reporteIdPendienteSSR = null;
}

async function confirmarReporteSSR() {
  const id = reporteIdPendienteSSR;
  cerrarConfirmReporteSSR();
  if (!id) return;
  try {
    const res = await fetch('/api/grupos', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({accion:'reporte',id}) });
    if (res.ok) alert('Reporte enviado, gracias por avisar');
  } catch(e) { alert('Error al enviar el reporte'); }
}

document.getElementById('cancelReporteBtn')?.addEventListener('click', cerrarConfirmReporteSSR);
document.getElementById('aceptarReporteBtn')?.addEventListener('click', confirmarReporteSSR);
document.getElementById('confirmReporteModal')?.addEventListener('click', function(e) {
  if (e.target === this) cerrarConfirmReporteSSR();
});
</script>
<script>
document.querySelectorAll('#filtroPlataforma .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#filtroPlataforma .filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const plat = chip.dataset.platform;
    document.querySelectorAll('.grupo-card').forEach(card => {
      card.style.display = (plat === 'todos' || card.dataset.plat === plat) ? '' : 'none';
    });
  });
});
</script>
<script src="/js/track.js" defer></script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="31f20884-a3cb-4060-9bbd-c835aec913c7" data-domains="www.qigruposbo.online,qigruposbo.online"></script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (totalGrupos > 0) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error SSR ciudad:', error.message);
    return res.status(500).send('Error generando la página: ' + error.message);
  }
}
