import { MongoClient, ObjectId } from 'mongodb';

const PLATAFORMAS_VALIDAS = ['whatsapp', 'telegram', 'facebook', 'discord', 'otro'];
const CATEGORIAS_VALIDAS  = ['compra-venta', 'empleos', 'inmuebles', 'transporte', 'educacion', 'deportes', 'otro'];

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

      if (accion === 'visita' && id) {
        await col.updateOne({ _id: new ObjectId(id) }, { $inc: { visitas: 1 } });
        return res.status(200).json({ success: true });
      }

      if (accion === 'reporte' && id) {
        await col.updateOne({ _id: new ObjectId(id) }, { $inc: { reportes: 1 } });
        return res.status(200).json({ success: true });
      }

      if (!grupo?.nombre || !grupo?.link) {
        return res.status(400).json({ error: 'Faltan nombre o link' });
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
