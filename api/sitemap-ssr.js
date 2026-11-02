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

function urlEntry(loc, changefreq, priority, lastmod) {
  const lm = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lm}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

// Fecha real de creacion del grupo (viene del _id de Mongo). null si no se puede leer.
function fechaGrupo(g) {
  try { return g._id.getTimestamp().toISOString().slice(0, 10); } catch (e) { return null; }
}

// Devuelve la fecha mas reciente entre dos (formato YYYY-MM-DD se compara como texto).
function masReciente(a, b) {
  if (!b) return a || null;
  if (!a) return b;
  return b > a ? b : a;
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

    let fechaSitio = null;
    const fechaPorCat = {};
    const fechaPorCiudad = {};

    grupos.forEach(g => {
      const f = fechaGrupo(g);
      fechaSitio = masReciente(fechaSitio, f);
      if (g.categoria) {
        fechaPorCat[g.categoria] = masReciente(fechaPorCat[g.categoria], f);
      }
      const cs = slugify(g.ubicacion);
      if (CIUDADES_SLUGS.includes(cs)) {
        fechaPorCiudad[cs] = masReciente(fechaPorCiudad[cs], f);
      }
    });

    entries.push(urlEntry(`${base}/`, 'daily', '1.0', fechaSitio));
    entries.push(urlEntry(`${base}/anadir.html`, 'monthly', '0.6', null));
    entries.push(urlEntry(`${base}/destacar.html`, 'monthly', '0.5', null));
    entries.push(urlEntry(`${base}/quienes-somos.html`, 'yearly', '0.3', null));
    entries.push(urlEntry(`${base}/contacto.html`, 'yearly', '0.3', null));
    entries.push(urlEntry(`${base}/privacidad.html`, 'yearly', '0.3', null));
    entries.push(urlEntry(`${base}/terminos.html`, 'yearly', '0.3', null));

    // Solo categorias con al menos 1 grupo (mismo criterio que el noindex de categoria-ssr)
    categorias.forEach(c => {
      if (!(c.slug in fechaPorCat)) return;
      entries.push(urlEntry(`${base}/categoria/${c.slug}`, 'daily', '0.8', fechaPorCat[c.slug]));
    });

    // Solo ciudades con al menos 1 grupo (mismo criterio que el noindex de ciudad-ssr)
    CIUDADES_SLUGS.forEach(slug => {
      if (!(slug in fechaPorCiudad)) return;
      entries.push(urlEntry(`${base}/grupos-whatsapp/${slug}`, 'daily', '0.8', fechaPorCiudad[slug]));
    });

    // Paginas ciudad + categoria (mismo criterio que ciudad-ssr: 3+ grupos y max 70% de la ciudad)
    const CAT_URL = ['compra-venta', 'empleos', 'inmuebles', 'ropa', 'citas', 'futbol'];
    const porCiudad = {};
    grupos.forEach(g => {
      const cs = slugify(g.ubicacion);
      if (!CIUDADES_SLUGS.includes(cs)) return;
      const c = g.categoria || 'compra-venta';
      porCiudad[cs] = porCiudad[cs] || { total: 0, cats: {}, fechas: {} };
      porCiudad[cs].total++;
      porCiudad[cs].cats[c] = (porCiudad[cs].cats[c] || 0) + 1;
      porCiudad[cs].fechas[c] = masReciente(porCiudad[cs].fechas[c], fechaGrupo(g));
    });
    CIUDADES_SLUGS.forEach(cs => {
      const info = porCiudad[cs];
      if (!info) return;
      CAT_URL.forEach(c => {
        const n = info.cats[c] || 0;
        if (n >= 3 && n / Math.min(info.total, 50) <= 0.7) {
          entries.push(urlEntry(`${base}/grupos-whatsapp/${cs}/${c}`, 'daily', '0.7', info.fechas[c]));
        }
      });
    });

    grupos.forEach(g => {
      const slug = `${slugify(g.nombre) || 'grupo'}-${g._id.toString()}`;
      entries.push(urlEntry(`${base}/grupo/${slug}`, 'weekly', '0.6', fechaGrupo(g)));
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
