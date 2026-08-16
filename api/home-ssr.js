import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

const PLATAFORMA_ICONO = { whatsapp:'fab fa-whatsapp', telegram:'fab fa-telegram', facebook:'fab fa-facebook', instagram:'fab fa-instagram', otro:'fas fa-link' };
const PLATAFORMA_COLOR = { whatsapp:'#25D366', telegram:'#229ED9', facebook:'#1877F2', instagram:'#E1306C', otro:'#8ba0ae' };
const PLATAFORMA_LABEL = { whatsapp:'WhatsApp', telegram:'Telegram', facebook:'Facebook', instagram:'Instagram', otro:'Otro' };
const CATEGORIA_EMOJI  = { 'compra-venta':'🛒', empleos:'💼', inmuebles:'🏠', ropa:'👕', citas:'💬', futbol:'⚽', otro:'🗂️' };
const CATEGORIA_LABEL  = { 'compra-venta':'Compra/Venta', empleos:'Empleos', inmuebles:'Inmuebles', ropa:'Ropas', citas:'Citas/Amigos', futbol:'Fútbol', otro:'Otros' };

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

function redirUrl(grupo) {
  return `/redir.html?url=${encodeURIComponent(grupo.link||'#')}&nombre=${encodeURIComponent(grupo.nombre||'Grupo')}&plat=${encodeURIComponent((grupo.plataforma||'whatsapp').toLowerCase())}&id=${encodeURIComponent(grupo.id||'')}`;
}

function tarjetaHtml(grupo) {
  const plat  = (grupo.plataforma || 'whatsapp').toLowerCase();
  const icono = PLATAFORMA_ICONO[plat] || PLATAFORMA_ICONO.otro;
  const color = PLATAFORMA_COLOR[plat] || PLATAFORMA_COLOR.otro;
  const label = PLATAFORMA_LABEL[plat] || 'Otro';
  const cat   = grupo.categoria || 'compra-venta';
  const emoji = CATEGORIA_EMOJI[cat] || '🗂️';
  const catLabel = CATEGORIA_LABEL[cat] || 'Otros';
  const redir = redirUrl(grupo);
  const nombreSeguro = escapeHtml(grupo.nombre);
  const tieneImagen = grupo.imagen && grupo.imagen.trim() && !grupo.imagen.includes('undefined');

  return `
  <div class="grupo-card">
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
          <h3 style="margin:0;flex:1;min-width:0;">${nombreSeguro||'Sin nombre'}</h3>
          <span class="badge-whatsapp" style="background:${color}20;color:${color};border:1px solid ${color}40;flex-shrink:0;">
            <i class="${icono}"></i> ${label}
          </span>
        </div>
      </div>
    </div>
    ${grupo.descripcion?`<div class="descripcion">${escapeHtml(grupo.descripcion)}</div>`:''}
    <div class="ubicacion">
      <i class="fas fa-map-marker-alt"></i> ${escapeHtml(grupo.ubicacion||'Bolivia')}
      <span style="margin-left:auto;font-size:0.65rem;color:#8ba0ae;">${emoji} ${catLabel}</span>
    </div>
    <div class="stats">
      <span class="stat-item"><i class="fas fa-users"></i> ${grupo.miembros||0}</span>
      <span class="stat-item"><i class="fas fa-chart-line"></i> ${grupo.activos||0}</span>
      <span class="stat-item"><i class="fas fa-eye"></i> ${grupo.visitas||0}</span>
    </div>
    <div style="display:flex;gap:0.5rem;margin:0 0.7rem 0.7rem;">
      <a href="${redir}" class="join-btn" style="background:${color};flex:1;margin:0;">
        <i class="${icono}"></i> Unirse al grupo
      </a>
    </div>
  </div>`;
}

export default async function handler(req, res) {
  try {
    const client = await conectar();
    const db = client.db('grupos_db');
    const col = db.collection('grupos');

    const grupos = (await col.find({}).toArray()).map(g => ({ ...g, id: g._id.toString() }));
    const normales = grupos.filter(g => !g.destacado).slice(0, 10);

    const tarjetasHtml = normales.length
      ? normales.map(tarjetaHtml).join('')
      : `<div class="empty-message">No se encontraron grupos</div>`;

    const templatePath = path.join(process.cwd(), 'template-home.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    html = html.replace(
      '<div id="gruposContainer" class="grupos-grid"></div>',
      `<div id="gruposContainer" class="grupos-grid">${tarjetasHtml}</div>`
    );

    html = html.replace(
      '<span id="heroCount">0</span>',
      `<span id="heroCount">${grupos.length}</span>`
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Solo cacheamos si realmente trajimos grupos.
    // Si vino vacío (hiccup transitorio de Mongo), no lo guardamos en caché
    // para que el próximo visitante fuerce una consulta fresca en vez de heredar el error.
    if (grupos.length > 0) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error SSR home:', error.message);
    return res.status(500).send('Error generando la página: ' + error.message);
  }
}
