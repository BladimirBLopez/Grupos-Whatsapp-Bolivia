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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

function tarjetaRelacionada(grupo) {
  const plat  = (grupo.plataforma || 'whatsapp').toLowerCase();
  const color = PLATAFORMA_COLOR[plat] || PLATAFORMA_COLOR.otro;
  const icono = PLATAFORMA_ICONO[plat] || PLATAFORMA_ICONO.otro;
  return `
  <a href="/grupo/${slugGrupo(grupo)}" style="display:block;text-decoration:none;color:inherit;">
    <div class="grupo-card">
      <div class="card-header">
        <div class="grupo-foto-placeholder" style="background:${color}22;">
          <i class="${icono}" style="color:${color};font-size:1.1rem;"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0;">${escapeHtml(grupo.nombre)}</h3>
        </div>
      </div>
      <div class="ubicacion"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(grupo.ubicacion||'Bolivia')}</div>
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

    // Grupos relacionados: misma categoría, excluyendo este, máx 6
    const relacionados = (await col.find({ categoria: cat, _id: { $ne: doc._id } }).limit(6).toArray())
      .map(g => ({ ...g, id: g._id.toString() }));

    const relacionadosHtml = relacionados.length
      ? `<div style="margin-top:2rem;">
          <h2 style="font-size:1rem;margin-bottom:0.8rem;">Más grupos de ${catLabel} en Bolivia</h2>
          <div class="grupos-grid">${relacionados.map(tarjetaRelacionada).join('')}</div>
        </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes">
  <title>${nombreSeguro} - Grupo de ${label} en ${escapeHtml(grupo.ubicacion||'Bolivia')} | Qigrupos Bolivia</title>
  <meta name="description" content="${descSegura}">
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
      {"@type":"ListItem","position":2,"name":"${catLabel}","item":"https://www.qigruposbo.online/categoria/${cat}"},
      {"@type":"ListItem","position":3,"name":"${nombreSeguro}","item":"${canonicalUrl}"}
    ]
  }
  </script>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🇧🇴</text></svg>">
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
  <div style="padding:1rem 0 0.5rem;">
    <a href="/" style="color:#8ba0ae;font-size:0.8rem;text-decoration:none;"><i class="fas fa-arrow-left"></i> Volver al directorio</a>
  </div>

  <div class="grupo-card" style="margin-top:0.5rem;">
    <div class="card-header">
      ${grupo.imagen ? `<img src="${escapeHtml(optimizarImg(grupo.imagen))}" alt="${nombreSeguro}" class="grupo-foto">` : `
      <div class="grupo-foto-placeholder" style="background:${color}22;">
        <i class="${icono}" style="color:${color};font-size:1.3rem;"></i>
      </div>`}
      <div style="flex:1;min-width:0;">
        <h1 style="margin:0;font-size:1.2rem;">${nombreSeguro}</h1>
        <span class="badge-whatsapp" style="background:${color}20;color:${color};border:1px solid ${color}40;">
          <i class="${icono}"></i> ${label}
        </span>
      </div>
    </div>
    <div class="descripcion">${descSegura}</div>
    <div class="ubicacion">
      <i class="fas fa-map-marker-alt"></i> ${escapeHtml(grupo.ubicacion||'Bolivia')}
      <span style="margin-left:auto;font-size:0.65rem;color:#8ba0ae;">${emoji} ${catLabel}</span>
    </div>
    <div class="stats">
      <span class="stat-item"><i class="fas fa-users"></i> ${grupo.miembros||0} miembros</span>
      <span class="stat-item"><i class="fas fa-eye"></i> ${grupo.visitas||0} visitas</span>
    </div>
    <div style="padding:0 0.7rem 0.7rem;">
      <a href="${redir}" class="join-btn" style="background:${color};width:100%;">
        <i class="${icono}"></i> Unirse al grupo
      </a>
    </div>
  </div>

  ${relacionadosHtml}

  <div class="footer-note" style="margin-top:2rem;">🇧🇴 Qigrupos Bolivia &mdash; Grupos verificados</div>
</div>
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
