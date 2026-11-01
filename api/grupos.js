import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

const PLATAFORMAS_VALIDAS = ['whatsapp', 'telegram', 'facebook', 'discord', 'otro'];
const CATEGORIAS_VALIDAS  = ['compra-venta', 'empleos', 'inmuebles', 'ropa', 'citas', 'futbol', 'otro'];

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

function verificarToken(req) {
  const token = req.headers['x-admin-token'] || req.body?.token;
  if (!token) return false;
  try {
    const [payloadB64, firma] = token.split('.');
    if (!payloadB64 || !firma) return false;
    const payload = Buffer.from(payloadB64, 'base64').toString('utf8');
    const [usuario, expira] = payload.split(':');
    if (!usuario || !expira) return false;
    const firmaEsperada = crypto.createHmac('sha256', process.env.ADMIN_PASS).update(payload).digest('hex');
    if (firma.length !== firmaEsperada.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(firmaEsperada))) return false;
    if (Date.now() > parseInt(expira)) return false;
    return usuario === process.env.ADMIN_USER;
  } catch(e) { return false; }
}

export default async function handler(req, res) {
  const origen = process.env.ALLOWED_ORIGIN || 'https://qigruposbo.online';
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = await conectar();
    const db = client.db('grupos_db');
    const col = db.collection('grupos');

    // ── GET ─────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { plataforma, categoria } = req.query;
      if (req.query.metricas === 'eventos') return await resumenEventos(req, res, db);
      if (req.query.metricas) return await resumenMetricas(req, res, db);
      const filtro = {};
      if (plataforma && PLATAFORMAS_VALIDAS.includes(plataforma)) filtro.plataforma = plataforma;
      if (categoria  && CATEGORIAS_VALIDAS.includes(categoria))   filtro.categoria  = categoria;

      const grupos = await col.find(filtro).toArray();
      const data = grupos.map(g => ({
        ...g,
        id: g._id.toString(),
        _id: undefined
      }));
      return res.status(200).json({ grupos: data });
    }

    // ── POST ─────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { grupo, accion, id } = req.body;
      if (accion === 'track') return await registrarTrack(req, res, db);
      if (accion === 'evento') return await registrarEvento(req, res, db);
      if (accion !== 'visita' && accion !== 'reporte' && !verificarToken(req)) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      if (accion === 'visita' && id) {
        await col.updateOne({ _id: new ObjectId(id) }, { $inc: { visitas: 1 } });
        return res.status(200).json({ success: true });
      }

      if (accion === 'reporte' && id) {
        await col.updateOne({ _id: new ObjectId(id) }, { $inc: { reportes: 1 } });
        return res.status(200).json({ success: true });
      }

      if (accion === 'resetear-reportes' && id) {
        await col.updateOne({ _id: new ObjectId(id) }, { $set: { reportes: 0 } });
        return res.status(200).json({ success: true });
      }

      if (!grupo?.nombre || !grupo?.link) {
        return res.status(400).json({ error: 'Faltan nombre o link' });
      }

      // Verificar link duplicado
      const linkExistente = await col.findOne({ link: grupo.link.trim() });
      if (linkExistente) {
        return res.status(400).json({ error: 'Este enlace ya está registrado en el directorio' });
      }

      const nuevo = {
        nombre:      grupo.nombre.trim(),
        descripcion: grupo.descripcion?.trim() || '',
        ubicacion:   grupo.ubicacion   || '',
        link:        grupo.link.trim(),
        miembros:    Number(grupo.miembros)  || 0,
        activos:     Number(grupo.activos)   || 0,
        destacado:   Boolean(grupo.destacado),
        plataforma:  PLATAFORMAS_VALIDAS.includes(grupo.plataforma) ? grupo.plataforma : 'whatsapp',
        categoria:   CATEGORIAS_VALIDAS.includes(grupo.categoria)   ? grupo.categoria  : 'compra-venta',
        imagen:      grupo.imagen?.trim() || '',
        visitas:     0,
        reportes:    0,
        fecha:       new Date().toISOString()
      };

      const result = await col.insertOne(nuevo);
      return res.status(201).json({
        success: true,
        grupo: { ...nuevo, id: result.insertedId.toString() }
      });
    }

    // ── PUT ──────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      if (!verificarToken(req)) return res.status(401).json({ error: 'No autorizado' });
      const { id, datos } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const { _id, id: ignoredId, fecha, ...camposLimpios } = datos || {};

      if (camposLimpios.miembros   !== undefined) camposLimpios.miembros   = Number(camposLimpios.miembros);
      if (camposLimpios.activos    !== undefined) camposLimpios.activos    = Number(camposLimpios.activos);
      if (camposLimpios.plataforma !== undefined && !PLATAFORMAS_VALIDAS.includes(camposLimpios.plataforma)) camposLimpios.plataforma = 'otro';
      if (camposLimpios.categoria  !== undefined && !CATEGORIAS_VALIDAS.includes(camposLimpios.categoria))  camposLimpios.categoria  = 'otro';

      await col.updateOne({ _id: new ObjectId(id) }, { $set: camposLimpios });
      return res.status(200).json({ success: true });
    }

    // ── DELETE ───────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      if (!verificarToken(req)) return res.status(401).json({ error: 'No autorizado' });
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      await col.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('Error MongoDB:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// ── MÉTRICAS PROPIAS (sin IP ni cookies) ─────────────────────────────
let indiceMetricasCreado = false;

function clasificarFuente(ref) {
  let host = '';
  try { host = new URL(ref).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) {}
  if (!host) return 'directo';
  if (host === 'qigruposbo.online' || host.endsWith('.qigruposbo.online')) return 'interno';
  if (/(^|\.)google\./.test(host)) return 'Google';
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return 'Facebook';
  if (/instagram\.com$/.test(host)) return 'Instagram';
  if (/(whatsapp\.com|wa\.me)$/.test(host)) return 'WhatsApp';
  if (/(t\.me|telegram\.org)$/.test(host)) return 'Telegram';
  if (/(bing\.com|duckduckgo\.com|yahoo\.com)$/.test(host)) return host;
  if (/(^|\.)(x\.com|twitter\.com|t\.co)$/.test(host)) return 'X';
  if (/tiktok\.com$/.test(host)) return 'TikTok';
  return host.slice(0, 60);
}

async function registrarTrack(req, res, db) {
  try {
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|curl|wget|python|node-fetch/i.test(ua)) {
      return res.status(204).end();
    }
    const b = req.body || {};
    const p = String(b.p || '').split('?')[0].split('#')[0].slice(0, 200);
    if (!/^\/[A-Za-z0-9\-_\/.%]*$/.test(p)) return res.status(204).end();
    let ciudad = '';
    try { ciudad = decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')).slice(0, 60); } catch (e) {}
    const doc = {
      t: new Date(),
      p,
      f: clasificarFuente(String(b.r || '').slice(0, 300)),
      c: String(req.headers['x-vercel-ip-country'] || '').slice(0, 2).toUpperCase(),
      ci: ciudad,
      d: b.m === 'movil' ? 'movil' : 'pc',
      s: String(b.s || '').replace(/[^a-z0-9]/gi, '').slice(0, 16)
    };
    const m = db.collection('metricas');
    if (!indiceMetricasCreado) {
      await m.createIndex({ t: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
      indiceMetricasCreado = true;
    }
    await m.insertOne(doc);
    return res.status(204).end();
  } catch (e) {
    return res.status(204).end();
  }
}

async function resumenMetricas(req, res, db) {
  if (!verificarToken(req)) return res.status(401).json({ error: 'No autorizado' });
  const d = parseInt(req.query.dias, 10);
  const dias = [7, 30, 90].includes(d) ? d : 30;
  const desde = new Date(Date.now() - dias * 86400000);
  const m = db.collection('metricas');
  const match = { t: { $gte: desde } };
  const top = (campo, extra) => m.aggregate([
    { $match: extra ? { ...match, ...extra } : match },
    { $group: { _id: campo, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 10 }
  ]).toArray().then(r => r.map(x => ({ k: x._id, n: x.n })));

  const [porDiaRaw, sesionesRaw, paginas, fuentes, paises, ciudades, dispositivos, topGrupos] = await Promise.all([
    m.aggregate([
      { $match: match },
      { $group: { _id: { dia: { $dateToString: { format: '%Y-%m-%d', date: '$t', timezone: 'America/La_Paz' } }, s: '$s' }, v: { $sum: 1 } } },
      { $group: { _id: '$_id.dia', vistas: { $sum: '$v' }, sesiones: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray(),
    m.aggregate([{ $match: match }, { $group: { _id: '$s' } }, { $count: 'n' }]).toArray(),
    top('$p'),
    top('$f', { f: { $ne: 'interno' } }),
    top('$c'),
    top({ pais: '$c', ciudad: '$ci' }),
    top('$d'),
    db.collection('grupos').find({}, { projection: { nombre: 1, visitas: 1, ubicacion: 1 } }).sort({ visitas: -1 }).limit(10).toArray()
  ]);

  const porDia = porDiaRaw.map(x => ({ dia: x._id, vistas: x.vistas, sesiones: x.sesiones }));
  return res.status(200).json({
    dias,
    totalVistas: porDia.reduce((a, x) => a + x.vistas, 0),
    totalSesiones: sesionesRaw[0] ? sesionesRaw[0].n : 0,
    porDia, paginas, fuentes, paises, ciudades, dispositivos,
    topGrupos: topGrupos.map(g => ({ nombre: g.nombre, visitas: g.visitas || 0, ubicacion: g.ubicacion || '' }))
  });
}

// ── EVENTOS: clics en Unirse y búsquedas (colección aparte) ─────────
let indiceEventosCreado = false;

function limpiarBusqueda(q) {
  q = String(q || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  if (q.length < 2) return '';
  const plano = q.replace(/[\s.\-]/g, '');
  if (/@|www|https?:|\d{6,}/.test(plano)) return '';
  return q;
}

async function registrarEvento(req, res, db) {
  try {
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|curl|wget|python|node-fetch/i.test(ua)) {
      return res.status(204).end();
    }
    const b = req.body || {};
    if (!['join', 'go', 'busq'].includes(b.e)) return res.status(204).end();
    const doc = {
      t: new Date(),
      e: b.e,
      s: String(b.s || '').replace(/[^a-z0-9]/gi, '').slice(0, 16),
      c: String(req.headers['x-vercel-ip-country'] || '').slice(0, 2).toUpperCase()
    };
    if (b.e === 'busq') {
      const q = limpiarBusqueda(b.q);
      if (!q) return res.status(204).end();
      doc.q = q;
      doc.r = b.r === 0 ? 0 : 1;
    } else {
      const g = String(b.g || '').trim().slice(0, 80);
      if (!g) return res.status(204).end();
      const pl = String(b.pl || '').toLowerCase();
      doc.g = g;
      doc.pl = ['whatsapp', 'telegram', 'facebook', 'discord'].includes(pl) ? pl : 'otro';
      doc.o = ['home', 'ciudad', 'categoria', 'grupo'].includes(b.o) ? b.o : 'otro';
    }
    const ev = db.collection('eventos');
    if (!indiceEventosCreado) {
      await ev.createIndex({ t: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
      indiceEventosCreado = true;
    }
    await ev.insertOne(doc);
    return res.status(204).end();
  } catch (e) {
    return res.status(204).end();
  }
}

async function resumenEventos(req, res, db) {
  if (!verificarToken(req)) return res.status(401).json({ error: 'No autorizado' });
  const d = parseInt(req.query.dias, 10);
  const dias = [7, 30, 90].includes(d) ? d : 30;
  const desde = new Date(Date.now() - dias * 86400000);
  const ev = db.collection('eventos');
  const base = { t: { $gte: desde } };
  const topQ = (extra) => ev.aggregate([
    { $match: { ...base, e: 'busq', ...extra } },
    { $group: { _id: '$q', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 10 }
  ]).toArray().then(r => r.map(x => ({ k: x._id, n: x.n })));

  const [grupos, origenes, busquedas, sinResultados, tot] = await Promise.all([
    ev.aggregate([
      { $match: { ...base, e: { $in: ['join', 'go'] } } },
      { $group: { _id: { g: '$g', pl: '$pl' },
          clics: { $sum: { $cond: [{ $eq: ['$e', 'join'] }, 1, 0] } },
          confirmados: { $sum: { $cond: [{ $eq: ['$e', 'go'] }, 1, 0] } } } },
      { $sort: { clics: -1, confirmados: -1 } },
      { $limit: 10 }
    ]).toArray(),
    ev.aggregate([
      { $match: { ...base, e: 'join' } },
      { $group: { _id: '$o', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 8 }
    ]).toArray(),
    topQ({}),
    topQ({ r: 0 }),
    ev.aggregate([{ $match: base }, { $group: { _id: '$e', n: { $sum: 1 } } }]).toArray()
  ]);

  const totales = {};
  tot.forEach(x => { totales[x._id] = x.n; });
  return res.status(200).json({
    dias,
    totales,
    grupos: grupos.map(x => ({ g: x._id.g, pl: x._id.pl, clics: x.clics, confirmados: x.confirmados })),
    origenes: origenes.map(x => ({ k: x._id, n: x.n })),
    busquedas,
    sinResultados
  });
}
