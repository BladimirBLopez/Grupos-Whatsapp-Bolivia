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
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
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
      imagen = decodeHtml(imageMatch[1]);
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
