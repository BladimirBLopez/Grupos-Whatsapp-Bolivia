import { MongoClient } from 'mongodb';

// Revisa enlaces de WhatsApp y Telegram y MARCA los muertos (no oculta nada).
// Cada corrida revisa los grupos que llevan mas tiempo sin revisarse.
// Uso manual: /api/revisar-enlaces?token=SECRETO[&limite=30]
//             /api/revisar-enlaces?token=SECRETO&listar=1   (muestra muertos y dudosos)
// Cron de Vercel: manda "Authorization: Bearer <CRON_SECRET>".

let cachedClient = null;

async function conectar() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1)';

function plataformaDe(link) {
  try {
    const h = new URL(String(link).trim()).hostname.toLowerCase().replace(/^www\./, '');
    if (h === 'chat.whatsapp.com' || h === 'whatsapp.com') return 'whatsapp';
    if (h === 't.me' || h === 'telegram.me' || h === 'telegram.dog') return 'telegram';
  } catch (e) {}
  return null;
}

// Devuelve 'vivo' | 'muerto' | 'desconocido'
async function revisarEnlace(link) {
  const plat = plataformaDe(link);
  if (!plat) return 'desconocido';
  try {
    const res = await fetch(String(link).trim(), {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'es-ES,es;q=0.9' },
      signal: AbortSignal.timeout(8000)
    });
    if (res.status === 404 || res.status === 410) return 'muerto';
    if (!res.ok) return 'desconocido';
    const html = await res.text();
    const m = html.match(/<meta property="og:title" content="([^"]*)"/i);
    if (!m) return 'desconocido';
    const titulo = m[1].trim();
    // WhatsApp: enlace revocado => og:title vacio
    if (plat === 'whatsapp') return titulo === '' ? 'muerto' : 'vivo';
    // Telegram: inexistente => "Telegram: Contact @..."
    if (!titulo || /^telegram:/i.test(titulo)) return 'muerto';
    return 'vivo';
  } catch (e) {
    return 'desconocido';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const secreto = process.env.SYNC_SECRET || process.env.ADMIN_PASS;
  const cron = process.env.CRON_SECRET;
  const okToken = !!secreto && req.query.token === secreto;
  const okCron = !!cron && req.headers.authorization === `Bearer ${cron}`;
  if (!okToken && !okCron) return res.status(401).json({ error: 'No autorizado' });

  try {
    const client = await conectar();
    const col = client.db('grupos_db').collection('grupos');

    if (req.query.listar === '1') {
      const lista = await col.find(
        { enlaceEstado: { $in: ['muerto', 'dudoso'] } },
        { projection: { nombre: 1, link: 1, enlaceEstado: 1, enlaceFallos: 1, enlaceRevisado: 1 } }
      ).toArray();
      return res.status(200).json({ total: lista.length, grupos: lista });
    }

    const limite = Math.min(parseInt(req.query.limite) || 30, 40);
    const filtro = { link: { $regex: 'whatsapp\\.com|t\\.me|telegram\\.(me|dog)', $options: 'i' } };
    const grupos = await col.find(filtro).sort({ enlaceRevisado: 1 }).limit(limite).toArray();

    const inicio = Date.now();
    const resultados = [];
    for (let i = 0; i < grupos.length; i += 5) {
      if (Date.now() - inicio > 45000) break;
      const lote = grupos.slice(i, i + 5);
      const estados = await Promise.all(lote.map(g => revisarEnlace(g.link)));
      lote.forEach((g, j) => resultados.push({ g, estado: estados[j] }));
      await new Promise(r => setTimeout(r, 300));
    }

    // Proteccion: si casi todo sale "muerto", probablemente nos estan bloqueando
    const muertosBrutos = resultados.filter(r => r.estado === 'muerto').length;
    const anomalia = resultados.length >= 6 && muertosBrutos / resultados.length > 0.5;

    const ahora = new Date();
    let vivos = 0, dudosos = 0, muertos = 0, desconocidos = 0;
    const problemas = [];
    for (const { g, estado } of resultados) {
      const set = { enlaceRevisado: ahora };
      let e = estado;
      if (e === 'muerto' && anomalia) e = 'desconocido';
      if (e === 'vivo') {
        set.enlaceEstado = 'vivo';
        set.enlaceFallos = 0;
        vivos++;
      } else if (e === 'muerto') {
        const f = (g.enlaceFallos || 0) + 1;
        set.enlaceFallos = f;
        set.enlaceEstado = f >= 2 ? 'muerto' : 'dudoso';
        if (f >= 2) muertos++; else dudosos++;
        problemas.push({ id: g._id, nombre: g.nombre, link: g.link, estado: set.enlaceEstado });
      } else {
        desconocidos++;
      }
      await col.updateOne({ _id: g._id }, { $set: set });
    }

    return res.status(200).json({
      success: true,
      revisados: resultados.length,
      vivos, dudosos, muertos, desconocidos,
      anomalia,
      problemas
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
