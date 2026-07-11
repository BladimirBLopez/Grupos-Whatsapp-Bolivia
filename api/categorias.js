import { MongoClient, ObjectId } from 'mongodb';

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

// Categorías por defecto si no hay ninguna en MongoDB
const CATEGORIAS_DEFAULT = [
  { emoji: '🛒', label: 'Compra/Venta', slug: 'compra-venta', orden: 0 },
  { emoji: '💼', label: 'Empleos',       slug: 'empleos',      orden: 1 },
  { emoji: '🏠', label: 'Inmuebles',     slug: 'inmuebles',    orden: 2 },
  { emoji: '👕', label: 'Ropas',         slug: 'ropa',         orden: 3 },
  { emoji: '💬', label: 'Citas/Amigos',  slug: 'citas',        orden: 4 },
  { emoji: '⚽', label: 'Fútbol',        slug: 'futbol',       orden: 5 },
  { emoji: '🗂️', label: 'Otros',         slug: 'otro',         orden: 6 },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = await conectar();
    const db  = client.db('grupos_db');
    const col = db.collection('categorias');

    // ── GET: obtener todas ordenadas ────────────────────────────────
    if (req.method === 'GET') {
      let cats = await col.find({}).sort({ orden: 1 }).toArray();

      // Si no hay categorías, insertar las por defecto
      if (cats.length === 0) {
        await col.insertMany(CATEGORIAS_DEFAULT);
        cats = await col.find({}).sort({ orden: 1 }).toArray();
      }

      const data = cats.map(c => ({
        ...c,
        id: c._id.toString(),
        _id: undefined
      }));
      return res.status(200).json({ categorias: data });
    }

    // ── POST: crear categoría ───────────────────────────────────────
    if (req.method === 'POST') {
      const { label, emoji, slug } = req.body;

      if (!label || !slug) {
        return res.status(400).json({ error: 'Faltan label o slug' });
      }

      // Verificar que el slug no exista
      const existe = await col.findOne({ slug });
      if (existe) {
        return res.status(400).json({ error: 'Ya existe una categoría con ese slug' });
      }

      // Obtener el mayor orden actual
      const ultima = await col.find({}).sort({ orden: -1 }).limit(1).toArray();
      const orden  = ultima.length > 0 ? ultima[0].orden + 1 : 0;

      const nueva = { label: label.trim(), emoji: emoji || '📌', slug: slug.trim(), orden };
      const result = await col.insertOne(nueva);

      return res.status(201).json({
        success: true,
        categoria: { ...nueva, id: result.insertedId.toString() }
      });
    }

    // ── PUT: actualizar orden (drag & drop) o editar ────────────────
    if (req.method === 'PUT') {
      const { id, datos, reordenar } = req.body;

      // Reordenar múltiples categorías de una vez
      if (reordenar && Array.isArray(reordenar)) {
        const ops = reordenar.map((item, index) =>
          col.updateOne(
            { _id: new ObjectId(item.id) },
            { $set: { orden: index } }
          )
        );
        await Promise.all(ops);
        return res.status(200).json({ success: true });
      }

      // Editar una categoría
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      const { _id, id: ignoredId, ...campos } = datos || {};
      await col.updateOne({ _id: new ObjectId(id) }, { $set: campos });
      return res.status(200).json({ success: true });
    }

    // ── DELETE: eliminar categoría ──────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      await col.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('Error MongoDB categorias:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
