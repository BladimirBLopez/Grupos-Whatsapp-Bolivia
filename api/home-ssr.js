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
  <article class="grupo-card">
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
    </div>
  </article>`;
}

export default async function handler(req, res) {
  try {
    const client = await conectar();
    const db = client.db('grupos_db');
    const col = db.collection('grupos');
    const colCats = db.collection('categorias');

    const grupos = (await col.find({}).toArray()).map(g => ({ ...g, id: g._id.toString() }));
    const categorias = await colCats.find({}).sort({ orden: 1 }).toArray();
    const normales = grupos.filter(g => !g.destacado).slice(0, 20);

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

    const CIUDADES_EXPLORA = [
      ['santa-cruz','Santa Cruz'], ['la-paz','La Paz'], ['cochabamba','Cochabamba'],
      ['sucre','Sucre'], ['tarija','Tarija'], ['potosi','Potosí'],
      ['oruro','Oruro'], ['beni','Beni'], ['pando','Pando']
    ];

    const linksCategorias = categorias.map(c =>
      `<a href="/categoria/${c.slug}" style="display:inline-block;background:#f0f4f8;color:#1a2c3e;padding:6px 14px;border-radius:50px;font-size:0.75rem;text-decoration:none;margin:0 6px 6px 0;">${c.emoji||''} ${c.label}</a>`
    ).join('');

    const linksCiudades = CIUDADES_EXPLORA.map(([slug, nombre]) =>
      `<a href="/grupos-whatsapp/${slug}" style="display:inline-block;background:#f0f4f8;color:#1a2c3e;padding:6px 14px;border-radius:50px;font-size:0.75rem;text-decoration:none;margin:0 6px 6px 0;">📍 ${nombre}</a>`
    ).join('');

    const exploraHtml = `
      <div style="margin:2rem 0;">
        <h2 style="font-size:0.95rem;margin-bottom:0.6rem;">Explora por categoría</h2>
        <div>${linksCategorias}</div>
        <h2 style="font-size:0.95rem;margin:1.2rem 0 0.6rem;">Explora por ciudad</h2>
        <div>${linksCiudades}</div>
      </div>`;

    html = html.replace(
      '<div id="exploraSeo"></div>',
      `<div id="exploraSeo">${exploraHtml}</div>`
    );

    // Chips de ciudades con conteo (enlaces reales, solo ciudades con grupos)
    const conteoCiudad = {};
    grupos.forEach(g => {
      const s = slugify(g.ubicacion);
      conteoCiudad[s] = (conteoCiudad[s] || 0) + 1;
    });
    const chipsCiudades = CIUDADES_EXPLORA
      .filter(([s]) => conteoCiudad[s])
      .sort((a, b) => conteoCiudad[b[0]] - conteoCiudad[a[0]])
      .map(([s, n]) => `<a href="/grupos-whatsapp/${s}" class="ciudad-chip">${n} <span>${conteoCiudad[s]}</span></a>`)
      .join('');
    html = html.replace(
      '<nav class="ciudad-chips" id="ciudadChips" aria-label="Grupos por ciudad" onclick="event.stopPropagation();"></nav>',
      chipsCiudades ? `<nav class="ciudad-chips" id="ciudadChips" aria-label="Grupos por ciudad">${chipsCiudades}</nav>` : ''
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
