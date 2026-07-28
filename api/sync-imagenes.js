import { MongoClient, ObjectId } from 'mongodb';

let cachedClient = null;

async function conectar() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

function decodeHtml(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .trim();
}

async function fetchGrupoInfo(url) {
  try {
    if (!url || !url.includes('whatsapp.com')) return null;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    const html = await res.text();

    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    const imagen = imageMatch ? decodeHtml(imageMatch[1]) : null;

    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
    let descripcion = descMatch ? decodeHtml(descMatch[1]) : null;
    const genericas = ['invitación a grupo', 'invitation to group', 'join my whatsapp', 'whatsapp group invite', 'group invite'];
    if (descripcion && genericas.some(g => descripcion.toLowerCase().includes(g))) {
      descripcion = null;
    }

    return { imagen, descripcion };
  } catch(e) {
    return null;
  }
}

export default async function handler(req, res) {
  // Solo GET para activarlo fácilmente
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const client = await conectar();
    const col = client.db('grupos_db').collection('grupos');

    // Obtener grupos sin imagen
    const grupos = await col.find({
      $or: [
        { imagen: { $exists: false } },
        { imagen: '' },
        { imagen: null }
      ]
    }).toArray();

    const resultados = { total: grupos.length, actualizados: 0, errores: 0 };

    for (const grupo of grupos) {
      const info = await fetchGrupoInfo(grupo.link);
      if (info?.imagen) {
        const update = { imagen: info.imagen };
        // Solo actualizar descripción si está vacía
        if (!grupo.descripcion && info.descripcion) {
          update.descripcion = info.descripcion;
        }
        await col.updateOne(
          { _id: new ObjectId(grupo._id) },
          { $set: update }
        );
        resultados.actualizados++;
      } else {
        resultados.errores++;
      }
      // Pequeña pausa para no saturar
      await new Promise(r => setTimeout(r, 300));
    }

    return res.status(200).json({
      success: true,
      mensaje: `Proceso completado`,
      ...resultados
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
