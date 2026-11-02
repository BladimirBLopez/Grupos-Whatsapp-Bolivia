import { MongoClient, ObjectId } from 'mongodb';

const PLATAFORMA_ICONO = { whatsapp:'fab fa-whatsapp', telegram:'fab fa-telegram', facebook:'fab fa-facebook', instagram:'fab fa-instagram', otro:'fas fa-link' };
const PLATAFORMA_COLOR = { whatsapp:'#25D366', telegram:'#229ED9', facebook:'#1877F2', instagram:'#E1306C', otro:'#8ba0ae' };
const PLATAFORMA_LABEL = { whatsapp:'WhatsApp', telegram:'Telegram', facebook:'Facebook', instagram:'Instagram', otro:'Otro' };


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

const CIUDADES_VALIDAS = ['santa-cruz', 'la-paz', 'cochabamba', 'sucre', 'tarija', 'potosi', 'oruro', 'beni', 'pando'];
const CAT_TXT = { 'compra-venta': 'compra y venta', empleos: 'empleos', inmuebles: 'inmuebles', ropa: 'ropa', citas: 'citas y amigos', futbol: 'fútbol', streaming: 'streaming' };

function limpiarTexto(str) {
  return String(str || '')
    .normalize('NFKD')
    .replace(/[\u{1F150}-\u{1F169}]/gu, c => String.fromCharCode(65 + c.codePointAt(0) - 0x1F150))
    .replace(/[\u{1F170}-\u{1F189}]/gu, c => String.fromCharCode(65 + c.codePointAt(0) - 0x1F170))
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u200D\uFE0E\uFE0F]/gu, '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function limpiarNombreGrupo(nombre) {
  let n = limpiarTexto(nombre)
    .replace(/\s*\|\s*/g, ' - ')
    .replace(/\.(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s\-_.*•·~]+|[\s\-_.*•·~]+$/g, '')
    .replace(/\s+/g, ' ');
  return n.length >= 3 ? n : '';
}

function armarTituloGrupo(nombre, label, ciudad) {
  if (!nombre) return `Grupo de ${label} en ${ciudad} | Qigrupos`;
  const sufijo = ` - Grupo de ${label} en ${ciudad}`;
  let n = nombre;
  const max = Math.max(62 - sufijo.length, 18);
  if (n.length > max) {
    n = n.slice(0, max).replace(/\s+\S*$/, '').trim() || n.slice(0, max);
    n = n.replace(/[\s,;:\-]+$/, '').replace(/(\s+(de|del|y|e|o|la|las|el|los|en|a|por|para|con))+$/i, '').replace(/[\s,;:\-]+$/, '');
  }
  let t = n + sufijo;
  if ((t + ' | Qigrupos').length <= 66) t += ' | Qigrupos';
  return t;
}

function armarMetaDescGrupo(grupo, label, catTxt, ciudad) {
  const miembros = Number(grupo.miembros) || 0;
  let d = `Grupo de ${label}${catTxt ? ' de ' + catTxt : ''} en ${ciudad}${ciudad === 'Bolivia' ? '' : ', Bolivia'}${miembros > 0 ? ' con ' + miembros + ' miembros' : ''}.`;
  const extra = limpiarTexto(grupo.descripcion);
  const repetido = /^grupo de /i.test(extra) && extra.length < 70;
  if (extra.length >= 25 && !/group invite/i.test(extra) && !repetido) d += ' ' + extra;
  else d += ' Únete desde Qigrupos Bolivia.';
  if (d.length > 158) d = d.slice(0, 155).replace(/\s+\S*$/, '') + '...';
  return d;
}

function slugGrupo(grupo) {
  return `${slugify(grupo.nombre) || 'grupo'}-${grupo.id}`;
}

function redirUrl(grupo) {
  return `/redir.html?url=${encodeURIComponent(grupo.link||'#')}&nombre=${encodeURIComponent(grupo.nombre||'Grupo')}&plat=${encodeURIComponent((grupo.plataforma||'whatsapp').toLowerCase())}&id=${encodeURIComponent(grupo.id||'')}`;
}

function tarjetaRelacionada(grupo) {
  const inicial = (String(grupo.nombre || '').match(/[\p{L}\p{N}]/u) || ['G'])[0].toUpperCase();
  return `
  <a href="/grupo/${slugGrupo(grupo)}" class="grupo-card grupo-mini">
    ${grupo.imagen ? `<img src="${escapeHtml(optimizarImg(grupo.imagen))}" alt="" class="grupo-foto" width="52" height="52" loading="lazy">` : `<div class="grupo-foto-placeholder" aria-hidden="true">${escapeHtml(inicial)}</div>`}
    <div class="card-info">
      <h3>${escapeHtml(grupo.nombre)}</h3>
      <div class="card-meta"><span><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${escapeHtml(grupo.ubicacion||'Bolivia')}</span></div>
    </div>
  </a>`;
}

export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    const match = String(slug || '').match(/([a-f0-9]{24})$/i);
    if (!match) {
      res.status(404).send('Grupo no encontrado');
      return;
    }
    const id = match[1];

    const client = await conectar();
    const db = client.db('grupos_db');
    const col = db.collection('grupos');
    const colCats = db.collection('categorias');

    const catsDb = await colCats.find({}).toArray();
    const catInfo = (slug) => catsDb.find(c => c.slug === slug) || { emoji: '🗂️', label: 'Otros' };

    const doc = await col.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      res.status(404).send('Grupo no encontrado');
      return;
    }
    const grupo = { ...doc, id: doc._id.toString() };

    const slugCorrecto = slugGrupo(grupo);
    if (String(slug) !== slugCorrecto) {
      res.setHeader('Location', `/grupo/${slugCorrecto}`);
      res.setHeader('Cache-Control', 's-maxage=3600');
      return res.status(301).end();
    }

    const plat   = (grupo.plataforma || 'whatsapp').toLowerCase();
    const icono  = PLATAFORMA_ICONO[plat] || PLATAFORMA_ICONO.otro;
    const color  = PLATAFORMA_COLOR[plat] || PLATAFORMA_COLOR.otro;
    const label  = PLATAFORMA_LABEL[plat] || 'Otro';
    const cat    = grupo.categoria || 'compra-venta';
    const infoCat = catInfo(cat);
    const emoji  = infoCat.emoji || '🗂️';
    const catLabel = infoCat.label || 'Otros';
    const nombreSeguro = escapeHtml(grupo.nombre);
    const descSegura = escapeHtml(grupo.descripcion || `Únete a este grupo de ${label} en ${grupo.ubicacion || 'Bolivia'}.`);
    const canonicalUrl = `https://www.qigruposbo.online/grupo/${slugGrupo(grupo)}`;
    const imagenOg = (grupo.imagen && grupo.imagen.trim()) ? escapeHtml(grupo.imagen) : 'https://www.qigruposbo.online/css/images/og-image.jpg';
    const redir = redirUrl(grupo);
    const ciudadSlug = slugify(grupo.ubicacion);
    const ciudadUrl = CIUDADES_VALIDAS.includes(ciudadSlug) ? `/grupos-whatsapp/${ciudadSlug}` : null;
    const ciudadTxt = (grupo.ubicacion && grupo.ubicacion !== 'Nacional') ? grupo.ubicacion : 'Bolivia';
    const nombreLimpio = limpiarNombreGrupo(grupo.nombre);
    const nombreH = escapeHtml(nombreLimpio || grupo.nombre);
    const tituloSeo = armarTituloGrupo(nombreLimpio, label, ciudadTxt);
    const metaDesc = armarMetaDescGrupo(grupo, label, CAT_TXT[cat], ciudadTxt);
    const crumb2Name = ciudadUrl ? escapeHtml(grupo.ubicacion) : catLabel;
    const crumb2Url = ciudadUrl ? `https://www.qigruposbo.online${ciudadUrl}` : `https://www.qigruposbo.online/categoria/${cat}`;

    // Más grupos: de la misma ciudad (misma categoría primero); si no hay, de la misma categoría
    let relacionadosDocs = [];
    let tituloRel = `Más grupos de ${catLabel} en Bolivia`;
    let relEsCiudad = false;
    if (ciudadUrl) {
      relacionadosDocs = await col.find({ categoria: cat, ubicacion: grupo.ubicacion, _id: { $ne: doc._id } }).limit(6).toArray();
      if (relacionadosDocs.length < 6) {
        const yaIds = [doc._id, ...relacionadosDocs.map(g => g._id)];
        const mas = await col.find({ ubicacion: grupo.ubicacion, _id: { $nin: yaIds } }).limit(6 - relacionadosDocs.length).toArray();
        relacionadosDocs = relacionadosDocs.concat(mas);
      }
      if (relacionadosDocs.length) {
        tituloRel = `Más grupos en ${grupo.ubicacion}`;
        relEsCiudad = true;
      }
    }
    if (!relacionadosDocs.length) {
      relacionadosDocs = await col.find({ categoria: cat, _id: { $ne: doc._id } }).limit(6).toArray();
    }
    const relacionados = relacionadosDocs.map(g => ({ ...g, id: g._id.toString() }));

    const relacionadosHtml = relacionados.length
      ? `<section class="relacionados" aria-labelledby="rel-titulo">
          <h2 id="rel-titulo">${escapeHtml(tituloRel)}</h2>
          <div class="grupos-grid">${relacionados.map(tarjetaRelacionada).join('')}</div>
          ${relEsCiudad ? `<a class="ver-todos" href="${ciudadUrl}">Ver todos los grupos de ${escapeHtml(grupo.ubicacion)}</a>` : ''}
        </section>`
      : '';

    const jsonLdGrupo = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: tituloSeo,
      url: canonicalUrl,
      description: metaDesc,
      inLanguage: 'es-BO',
      isPartOf: { '@type': 'WebSite', name: 'Qigrupos Bolivia', url: 'https://www.qigruposbo.online/' },
      about: { '@type': 'Thing', name: nombreLimpio || grupo.nombre }
    }).replace(/</g, '\\u003c');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes">
  <title>${escapeHtml(tituloSeo)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <meta name="robots" content="index, follow">
  <meta name="geo.region" content="BO">
  <meta name="geo.country" content="Bolivia">
  <meta property="og:title" content="${nombreSeguro} | Qigrupos Bolivia">
  <meta property="og:description" content="${descSegura}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:locale" content="es_BO">
  <meta property="og:site_name" content="Qigrupos Bolivia">
  <meta property="og:image" content="${imagenOg}">
  <link rel="canonical" href="${canonicalUrl}">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Inicio","item":"https://www.qigruposbo.online/"},
      {"@type":"ListItem","position":2,"name":"${crumb2Name}","item":"${crumb2Url}"},
      {"@type":"ListItem","position":3,"name":"${nombreH}","item":"${canonicalUrl}"}
    ]
  }
  </script>
  <script type="application/ld+json">${jsonLdGrupo}</script>
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
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
<div class="container">
  <div class="hero hero-v2 hero-int hero-grupo">
    <nav class="migas" aria-label="Migas de pan"><ol>
      <li><a href="/">Inicio</a></li>
      <li><a href="${crumb2Url}">${crumb2Name}</a></li>
      <li aria-current="page">${nombreH}</li>
    </ol></nav>
  </div>

  <article class="grupo-card grupo-detalle">
    <div class="card-header">
      ${grupo.imagen
        ? `<img src="${escapeHtml(optimizarImg(grupo.imagen))}" alt="${nombreSeguro}" class="grupo-foto" width="52" height="52">`
        : `<div class="grupo-foto-placeholder" aria-hidden="true">${escapeHtml((String(limpiarNombreGrupo(grupo.nombre) || grupo.nombre || '').match(/[\p{L}\p{N}]/u) || ['G'])[0].toUpperCase())}</div>`}
      <div class="card-info">
        <h1>${nombreH}</h1>
        <div class="card-meta">
          <span><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${ciudadUrl ? `<a href="${ciudadUrl}">${escapeHtml(grupo.ubicacion)}</a>` : escapeHtml(grupo.ubicacion||'Bolivia')}</span>
          <span><i class="fas fa-users" aria-hidden="true"></i> ${grupo.miembros||0} miembros</span>
        </div>
      </div>
    </div>
    <div class="card-tags">
      <span class="pill">${catLabel}</span>
      <span class="pill"><i class="${icono}" aria-hidden="true"></i> ${label}</span>
    </div>
    <p class="descripcion descripcion-full">${descSegura}</p>
    <div class="card-actions">
      <a href="${redir}" rel="nofollow" class="join-btn">Unirse al grupo</a>
    </div>
  </article>

  ${relacionadosHtml}

  <footer class="site-footer">
    <p class="footer-brand"><strong>Qigrupos Bolivia</strong> · Gratis y sin registro</p>
    <details class="footer-col"><summary><h2>Grupos por ciudad</h2></summary><ul class="footer-links"><li><a href="/grupos-whatsapp/santa-cruz">Santa Cruz</a></li><li><a href="/grupos-whatsapp/la-paz">La Paz</a></li><li><a href="/grupos-whatsapp/cochabamba">Cochabamba</a></li><li><a href="/grupos-whatsapp/sucre">Sucre</a></li><li><a href="/grupos-whatsapp/tarija">Tarija</a></li><li><a href="/grupos-whatsapp/potosi">Potosí</a></li><li><a href="/grupos-whatsapp/oruro">Oruro</a></li><li><a href="/grupos-whatsapp/beni">Beni</a></li><li><a href="/grupos-whatsapp/pando">Pando</a></li></ul></details>
    <details class="footer-col"><summary><h2>Categorías</h2></summary><ul class="footer-links"><li><a href="/categoria/compra-venta">Compra y venta</a></li><li><a href="/categoria/empleos">Empleos</a></li><li><a href="/categoria/inmuebles">Inmuebles</a></li><li><a href="/categoria/ropa">Ropa</a></li><li><a href="/categoria/citas">Citas y amigos</a></li></ul></details>
    <h2>Información</h2>
    <ul class="footer-links"><li><a href="/quienes-somos.html">Quiénes somos</a></li><li><a href="/contacto.html">Contacto</a></li><li><a href="/privacidad.html">Privacidad</a></li><li><a href="/terminos.html">Términos</a></li><li><a href="/contacto.html#reportar">Reportar un grupo</a></li><li><a href="/anadir.html">Añadir mi grupo</a></li></ul>
    <p class="footer-aviso">Directorio independiente. No estamos afiliados a WhatsApp, Telegram ni Facebook.</p>
  </footer>
</div>
<script src="/js/track.js" defer></script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="31f20884-a3cb-4060-9bbd-c835aec913c7" data-domains="www.qigruposbo.online,qigruposbo.online"></script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error SSR grupo:', error.message);
    return res.status(500).send('Error generando la página: ' + error.message);
  }
}
