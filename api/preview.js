import crypto from 'crypto';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requerida' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return res.status(200).json({ success: false, error: 'No se pudo acceder al enlace' });
    }

    const html = await response.text();

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

    // Extraer imagen
    let imagen = null;
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (imageMatch) {
      imagen = await subirACloudinary(decodeHtml(imageMatch[1]));
    }

    // Extraer descripción
    let descripcion = null;
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i)
      || html.match(/<meta name="description" content="([^"]+)"/i);
    if (descMatch) {
      descripcion = decodeHtml(descMatch[1]);
      // Ignorar descripciones genéricas de WhatsApp
      const genericas = ['invitación a grupo', 'invitation to group', 'join my whatsapp'];
      if (genericas.some(g => descripcion.toLowerCase().includes(g))) {
        descripcion = null;
      }
    }

    if (!nombre && !imagen) {
      return res.status(200).json({ success: false, error: 'No se encontró información del grupo' });
    }

    return res.status(200).json({ success: true, nombre, imagen, descripcion });

  } catch (error) {
    return res.status(200).json({ success: false, error: 'Error: ' + error.message });
  }
}
