import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

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

async function subirACloudinary(imageUrl) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dkq95jus0';
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) return imageUrl;

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'qigruposbo';
    const aFirmar = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(aFirmar).digest('hex');

    const body = new URLSearchParams({
      file: imageUrl,
      api_key: apiKey,
      timestamp: String(timestamp),
      folder,
      signature
    });

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(15000)
    });
    const data = await res.json();
    return data.secure_url || imageUrl;
  } catch (e) {
    return imageUrl;
  }
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
    let imagen = imageMatch ? decodeHtml(imageMatch[1]) : null;
    if (imagen) imagen = await subirACloudinary(imagen);

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
  if (req.method !== 'GET') return res.status(405).end();

  // Proteger con token secreto
  const token  = req.query.token;
  const secreto = process.env.SYNC_SECRET || process.env.ADMIN_PASS;
  if (!token || token !== secreto) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const client = await conectar();
    const col = client.db('grupos_db').collection('grupos');

    // Obtener grupos sin imagen (o todos, si se pide ?todos=1)
    const todos = req.query.todos === '1';
    const filtro = todos ? {} : {
      $or: [
        { imagen: { $exists: false } },
        { imagen: '' },
        { imagen: null }
      ]
    };
    const grupos = await col.find(filtro).toArray();

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
