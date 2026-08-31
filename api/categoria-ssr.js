import { MongoClient } from 'mongodb';

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

function tarjetaHtml(grupo) {
  const plat  = (grupo.plataforma || 'whatsapp').toLowerCase();
  const icono = PLATAFORMA_ICONO[plat] || PLATAFORMA_ICONO.otro;
  const color = PLATAFORMA_COLOR[plat] || PLATAFORMA_COLOR.otro;
  const label = PLATAFORMA_LABEL[plat] || 'Otro';
  const nombreSeguro = escapeHtml(grupo.nombre);
  const tieneImagen = grupo.imagen && grupo.imagen.trim() && !grupo.imagen.includes('undefined');
  const redir = redirUrl(grupo);

  return `
  <div class="grupo-card" data-plat="${plat}">
    <div class="card-header">
      ${tieneImagen ? `
      <img src="${escapeHtml(optimizarImg(grupo.imagen))}" alt="${nombreSeguro}" class="grupo-foto" loading="lazy">
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
    <div style="display:flex;gap:0.5rem;padding:0 0.7rem 0.7rem;">
      <a href="${redir}" class="join-btn" style="background:${color};flex:1;margin:0;">
        <i class="${icono}"></i> Unirse al grupo
      </a>
      <button onclick="reportarLinkSSR('${grupo.id}','${nombreSeguro}')"
        style="background:#fff;border:1.5px solid #e0e0e0;color:#8ba0ae;border-radius:50px;padding:0 12px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;gap:4px;"
        title="Reportar link caido"><i class="fas fa-flag"></i>
      </button>
    </div>
  </div>`;
}

export default async function handler(req, res) {
  try {
    const { slug } = req.query;

    const client = await conectar();
    const db = client.db('grupos_db');
    const colCats = db.collection('categorias');
    const col = db.collection('grupos');

    const categoria = await colCats.findOne({ slug: slug });
    if (!categoria) {
      res.status(404).send('Categoría no encontrada');
      return;
    }

    const grupos = (await col.find({ categoria: slug }).limit(50).toArray())
      .map(g => ({ ...g, id: g._id.toString() }));

    const tarjetasHtml = grupos.length
      ? grupos.map(tarjetaHtml).join('')
      : `<div class="empty-message">Todavía no hay grupos en esta categoría</div>`;

    const catLabel = categoria.label || 'Otros';
    const canonicalUrl = `https://www.qigruposbo.online/categoria/${slug}`;
    const titulo = `Grupos de ${catLabel} en Bolivia - WhatsApp, Telegram y Facebook | Qigrupos Bolivia`;
    const descripcion = `Encuentra grupos de ${catLabel} en Bolivia. ${grupos.length} grupos activos de WhatsApp, Telegram y Facebook en Santa Cruz, La Paz, Cochabamba y más.`;

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
      {"@type":"ListItem","position":2,"name":"${escapeHtml(catLabel)}","item":"${canonicalUrl}"}
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
    <h1 style="font-size:1.3rem;">${categoria.emoji || '🗂️'} Grupos de ${escapeHtml(catLabel)}<span> en Bolivia</span></h1>
    <p>${grupos.length} grupos activos de WhatsApp, Telegram y Facebook</p>
  </div>

  <div class="plataforma-filtros" id="filtroPlataforma">
    <div class="filter-chip active" data-platform="todos">🌐 Todas</div>
    <div class="filter-chip" data-platform="whatsapp"><i class="fab fa-whatsapp"></i> WhatsApp</div>
    <div class="filter-chip" data-platform="telegram"><i class="fab fa-telegram"></i> Telegram</div>
    <div class="filter-chip" data-platform="facebook"><i class="fab fa-facebook"></i> Facebook</div>
    <div class="filter-chip" data-platform="instagram"><i class="fab fa-instagram"></i> Instagram</div>
  </div>

  <div id="gruposContainer" class="grupos-grid">${tarjetasHtml}</div>

  <div class="footer-note" style="margin-top:2rem;">🇧🇴 Qigrupos Bolivia &mdash; Grupos verificados</div>
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
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (grupos.length > 0) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error SSR categoria:', error.message);
    return res.status(500).send('Error generando la página: ' + error.message);
  }
}
