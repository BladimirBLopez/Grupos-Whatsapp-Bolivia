import { MongoClient } from 'mongodb';

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

function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CIUDADES_SLUGS = ['santa-cruz','la-paz','cochabamba','sucre','tarija','potosi','oruro','beni','pando'];

function urlEntry(loc, changefreq, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export default async function handler(req, res) {
  try {
    const client = await conectar();
    const db = client.db('grupos_db');
    const col = db.collection('grupos');
    const colCats = db.collection('categorias');

    const grupos = await col.find({}).toArray();
    const categorias = await colCats.find({}).toArray();

    const base = 'https://www.qigruposbo.online';
    const entries = [];

    entries.push(urlEntry(`${base}/`, 'daily', '1.0'));
    entries.push(urlEntry(`${base}/anadir.html`, 'monthly', '0.6'));
    entries.push(urlEntry(`${base}/destacar.html`, 'monthly', '0.5'));

    categorias.forEach(c => {
      entries.push(urlEntry(`${base}/categoria/${c.slug}`, 'daily', '0.8'));
    });

    CIUDADES_SLUGS.forEach(slug => {
      entries.push(urlEntry(`${base}/ciudad/${slug}`, 'daily', '0.8'));
    });

    grupos.forEach(g => {
      const slug = `${slugify(g.nombre) || 'grupo'}-${g._id.toString()}`;
      entries.push(urlEntry(`${base}/grupo/${slug}`, 'weekly', '0.6'));
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);

  } catch (error) {
    console.error('Error generando sitemap:', error.message);
    return res.status(500).send('Error generando el sitemap');
  }
}
