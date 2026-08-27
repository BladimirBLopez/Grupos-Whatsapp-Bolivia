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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugGrupo(grupo) {
  return `${slugify(grupo.nombre) || 'grupo'}-${grupo.id}`;
}

function tarjetaHtml(grupo) {
  const plat  = (grupo.plataforma || 'whatsapp').toLowerCase();
  const icono = PLATAFORMA_ICONO[plat] || PLATAFORMA_ICONO.otro;
  const color = PLATAFORMA_COLOR[plat] || PLATAFORMA_COLOR.otro;
  const label = PLATAFORMA_LABEL[plat] || 'Otro';
  const nombreSeguro = escapeHtml(grupo.nombre);
  const tieneImagen = grupo.imagen && grupo.imagen.trim() && !grupo.imagen.includes('undefined');

  return `
  <div class="grupo-card" data-plat="${plat}">
    <div class="card-header">
      ${tieneImagen ? `
      <img src="${grupo.imagen}" alt="${nombreSeguro}" class="grupo-foto" loading="lazy">
      ` : `
      <div class="grupo-foto-placeholder" style="background:${color}22;">
        <i class="${icono}" style="color:${color};font-size:1.1rem;"></i>
      </div>
      `}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <h3 style="margin:0;flex:1;min-width:0;"><a href="/grupo/${slugGrupo(grupo)}" style="color:inherit;text-decoration:none;">${nombreSeguro||'Sin nombre'}</a></h3>
          <span class="badge-whatsapp" style="background:${color}20;color:${color};border:1px solid ${color}40;flex-shrink:0;">
            <i class="${icono}"></i> ${label}
          </span>
        </div>
      </div>
    </div>
    ${grupo.descripcion?`<div class="descripcion">${escapeHtml(grupo.descripcion)}</div>`:''}
    <div class="ubicacion">
      <i class="fas fa-map-marker-alt"></i> ${escapeHtml(grupo.ubicacion||'Bolivia')}
    </div>
    <div class="stats">
      <span class="stat-item"><i class="fas fa-users"></i> ${grupo.miembros||0}</span>
      <span class="stat-item"><i class="fas fa-eye"></i> ${grupo.visitas||0}</span>
    </div>
  </div>`;
}

export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    const nombreCiudad = CIUDADES[slug];
    if (!nombreCiudad) {
      res.status(404).send('Ciudad no encontrada');
      return;
    }

    const client = await conectar();
    const db = client.db('grupos_db');
    const col = db.collection('grupos');

    const localesRaw = await col.find({ ubicacion: nombreCiudad }).limit(50).toArray();
    const nacionalesRaw = await col.find({ ubicacion: 'Nacional' }).limit(20).toArray();

    const locales = localesRaw.map(g => ({ ...g, id: g._id.toString() }));
    const nacionales = nacionalesRaw.map(g => ({ ...g, id: g._id.toString() }));

    const localesHtml = locales.length
      ? locales.map(tarjetaHtml).join('')
      : `<div class="empty-message">Todavía no hay grupos locales en ${escapeHtml(nombreCiudad)}</div>`;

    const nacionalesHtml = nacionales.length
      ? `<div style="margin-top:2rem;">
          <h2 style="font-size:1rem;margin-bottom:0.8rem;">📍 Grupos que atienden todo Bolivia</h2>
          <div class="grupos-grid">${nacionales.map(tarjetaHtml).join('')}</div>
        </div>`
      : '';

    const totalGrupos = locales.length + nacionales.length;
    const canonicalUrl = `https://www.qigruposbo.online/ciudad/${slug}`;
    const titulo = `Grupos de WhatsApp, Telegram y Facebook en ${nombreCiudad} | Qigrupos Bolivia`;
    const descripcion = `Encuentra grupos de WhatsApp, Telegram y Facebook en ${nombreCiudad}, Bolivia. Compra/venta, empleos, inmuebles y más. ${totalGrupos} grupos activos.`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes">
  <title>${escapeHtml(titulo)}</title>
  <meta name="description" content="${escapeHtml(descripcion)}">
  <meta name="robots" content="index, follow">
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
      {"@type":"ListItem","position":2,"name":"${escapeHtml(nombreCiudad)}","item":"${canonicalUrl}"}
    ]
  }
  </script>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🇧🇴</text></svg>">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
<div class="container">
  <div style="padding:1rem 0 0.5rem;">
    <a href="/" style="color:#8ba0ae;font-size:0.8rem;text-decoration:none;"><i class="fas fa-arrow-left"></i> Volver al directorio</a>
  </div>

  <div class="hero" style="padding-top:0.5rem;">
    <h1 style="font-size:1.3rem;">📍 Grupos en <span>${escapeHtml(nombreCiudad)}</span></h1>
    <p>${totalGrupos} grupos activos de WhatsApp, Telegram y Facebook</p>
  </div>

  <div class="plataforma-filtros" id="filtroPlataforma">
    <div class="filter-chip active" data-platform="todos">🌐 Todas</div>
    <div class="filter-chip" data-platform="whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</div>
    <div class="filter-chip" data-platform="telegram"><i class="fab fa-telegram"></i> Telegram</div>
    <div class="filter-chip" data-platform="facebook"><i class="fab fa-facebook"></i> Facebook</div>
    <div class="filter-chip" data-platform="instagram"><i class="fab fa-instagram"></i> Instagram</div>
  </div>

  <div id="gruposContainer" class="grupos-grid">${localesHtml}</div>

  ${nacionalesHtml}

  <div class="footer-note" style="margin-top:2rem;">🇧🇴 Qigrupos Bolivia &mdash; Grupos verificados</div>
</div>
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
