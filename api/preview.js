import crypto from 'crypto';
import { MongoClient } from 'mongodb';

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

let cachedMongo = null;
async function conectarMongo() {
  if (cachedMongo) return cachedMongo;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedMongo = client;
  return client;
}

function normalizarLink(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    let h = u.hostname.toLowerCase().replace(/^www\./, '');
    if (h === 'telegram.me' || h === 'telegram.dog') h = 't.me';
    if (h === 'm.facebook.com' || h === 'web.facebook.com' || h === 'fb.com') h = 'facebook.com';
    let p = u.pathname.replace(/\/+$/, '');
    // Los codigos de invitacion privados (WhatsApp, t.me/+codigo) distinguen mayusculas
    if ((h === 't.me' && !/^\/(\+|joinchat\/)/i.test(p)) || h === 'facebook.com') p = p.toLowerCase();
    return h + p;
  } catch (e) {
    return String(raw || '').trim().split('?')[0].replace(/\/+$/, '').toLowerCase();
  }
}

function detectarPlataforma(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch (e) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  u.protocol = 'https:';
  u.username = '';
  u.password = '';
  u.port = '';
  const h = u.hostname.toLowerCase().replace(/^www\./, '');
  let plataforma = null;
  if (h === 'chat.whatsapp.com' || h === 'whatsapp.com') plataforma = 'whatsapp';
  else if (h === 't.me' || h === 'telegram.me' || h === 'telegram.dog') plataforma = 'telegram';
  else if (h === 'facebook.com' || h === 'm.facebook.com' || h === 'web.facebook.com' || h === 'fb.com' || h === 'fb.me') plataforma = 'facebook';
  if (!plataforma) return null;
  return { plataforma, url: u.toString() };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { url, omitirDuplicado } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requerida' });
  const info = detectarPlataforma(url);
  if (!info) return res.status(200).json({ success: false, error: 'Enlace no válido: usa WhatsApp, Telegram o Facebook' });

  // Duplicados: avisar ANTES de leer el enlace y subir la foto a Cloudinary
  if (!omitirDuplicado) {
    try {
      const db = (await conectarMongo()).db('grupos_db');
      const linkNorm = normalizarLink(info.url);
      const grupos = await db.collection('grupos').find({}, { projection: { link: 1 } }).toArray();
      if (grupos.some(g => g.link && normalizarLink(g.link) === linkNorm)) {
        return res.status(200).json({ success: false, duplicado: true, error: 'Este grupo ya está publicado en el directorio' });
      }
      const sols = await db.collection('solicitudes').find({ estado: 'pendiente' }, { projection: { link: 1 } }).toArray();
      if (sols.some(s => s.link && normalizarLink(s.link) === linkNorm)) {
        return res.status(200).json({ success: false, duplicado: true, error: 'Este grupo ya tiene una solicitud pendiente de revisión' });
      }
    } catch (e) {
      // si Mongo falla, seguimos sin revisar duplicados
    }
  }

  try {
    const response = await fetch(info.url, {
      headers: {
        'User-Agent': info.plataforma === 'facebook' ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' : 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return res.status(200).json({ success: false, error: 'No se pudo acceder al enlace' });
    }

    const html = await response.text();
    if (!detectarPlataforma(response.url || info.url)) {
      return res.status(200).json({ success: false, error: 'El enlace redirige a otro sitio' });
    }

    // Función para decodificar entidades HTML
    function decodeHtml(str) {
      if (!str) return str;
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
          const code = parseInt(hex, 16);
          // Handle surrogate pairs for emojis (code points > 0xFFFF)
          if (code > 0xFFFF) {
            const offset = code - 0x10000;
            return String.fromCharCode(
              0xD800 + (offset >> 10),
              0xDC00 + (offset & 0x3FF)
            );
          }
          return String.fromCharCode(code);
        })
        .replace(/&#(\d+);/g, (_, dec) => {
          const code = parseInt(dec);
          if (code > 0xFFFF) {
            const offset = code - 0x10000;
            return String.fromCharCode(
              0xD800 + (offset >> 10),
              0xDC00 + (offset & 0x3FF)
            );
          }
          return String.fromCharCode(code);
        })
        .trim();
    }

    // Extraer nombre
    let nombre = null;
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i)
      || html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      nombre = decodeHtml(titleMatch[1])
        .replace(' - WhatsApp', '')
        .replace(' | WhatsApp', '')
        .trim();
    }

    // Validaciones y datos extra por plataforma
    let miembros = null;
    if (info.plataforma === 'facebook') {
      const pideLogin = /\/login|checkpoint/i.test(response.url || '') || /^(facebook|log into facebook|log in to facebook|iniciar sesi[oó]n en facebook)$/i.test(nombre || '');
      if (pideLogin || !nombre) {
        return res.status(200).json({ success: false, error: 'Facebook pide iniciar sesión: escribe el nombre y sube la foto a mano' });
      }
    }
    if (info.plataforma === 'telegram') {
      if (!nombre || /^telegram:/i.test(nombre)) {
        return res.status(200).json({ success: false, error: 'Enlace de Telegram no válido o no es un grupo/canal público' });
      }
      const extra = html.match(/<div class="tgme_page_extra">([\s\S]*?)<\/div>/i);
      if (extra) {
        const t = extra[1].replace(/&nbsp;|&#160;/g, ' ').replace(/<[^>]*>/g, ' ');
        const m = t.match(/(\d[\d\s\u00a0,.]*)\s*(members|miembros|subscribers|suscriptores)/i);
        if (m) {
          const n = parseInt(m[1].replace(/\D/g, ''), 10);
          if (n > 0) miembros = n;
        }
      }
    }
    if (nombre) nombre = nombre.replace(/\s*\|\s*Facebook\s*$/i, '').replace(/\s*-\s*Telegram\s*$/i, '').trim();

    // Extraer imagen
    let imagen = null;
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (imageMatch) {
      const imgUrl = decodeHtml(imageMatch[1]);
      // No subir logos genericos de Telegram/Facebook
      if (!/t_logo|telegram\.org\/img|static\.xx\.fbcdn\.net\/rsrc|facebook\.com\/images/i.test(imgUrl)) {
        imagen = await subirACloudinary(imgUrl);
      }
    }

    // Extraer descripción
    let descripcion = null;
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i)
      || html.match(/<meta name="description" content="([^"]+)"/i);
    if (descMatch) {
      descripcion = decodeHtml(descMatch[1]).replace(/\s+/g, ' ').trim();
      // Ignorar descripciones genéricas de WhatsApp
      const genericas = ['invitación a grupo', 'invitation to group', 'join my whatsapp', 'right away', 'ahora mismo', 'log in or sign up', 'inicia sesión'];
      if (genericas.some(g => descripcion.toLowerCase().includes(g))) {
        descripcion = null;
      }
    }

    if (!nombre && !imagen) {
      return res.status(200).json({ success: false, error: 'No se encontró información del grupo' });
    }

    return res.status(200).json({ success: true, nombre, imagen, descripcion, miembros, plataforma: info.plataforma });

  } catch (error) {
    return res.status(200).json({ success: false, error: 'Error: ' + error.message });
  }
}
