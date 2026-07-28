export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL requerida' });

  try {
    // Fetch la página pública del grupo
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

    // Extraer nombre del grupo
    let nombre = null;
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i)
      || html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      nombre = titleMatch[1]
        .replace(' - WhatsApp', '')
        .replace(' | WhatsApp', '')
        .trim();
    }

    // Extraer imagen del grupo
    let imagen = null;
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (imageMatch) {
      imagen = imageMatch[1];
    }

    // Extraer descripción
    let descripcion = null;
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i)
      || html.match(/<meta name="description" content="([^"]+)"/i);
    if (descMatch) {
      descripcion = descMatch[1].trim();
    }

    if (!nombre && !imagen) {
      return res.status(200).json({ success: false, error: 'No se encontró información del grupo' });
    }

    return res.status(200).json({
      success: true,
      nombre,
      imagen,
      descripcion
    });

  } catch (error) {
    return res.status(200).json({ success: false, error: 'Error al obtener información: ' + error.message });
  }
}
