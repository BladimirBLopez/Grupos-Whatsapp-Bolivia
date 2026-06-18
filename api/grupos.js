import { MongoClient, ObjectId } from 'mongodb';

let cachedClient = null;

async function conectar() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta MONGODB_URI');
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
    const col = client.db('grupos_db').collection('grupos');

    if (req.method === 'GET') {
      const grupos = await col.find({}).toArray();
      const data = grupos.map(g => ({ ...g, id: g._id.toString(), _id: undefined }));
      return res.status(200).json({ grupos: data });
    }

    if (req.method === 'POST') {
      const { grupo } = req.body;
      if (!grupo?.nombre || !grupo?.link) return res.status(400).json({ error: 'Faltan datos' });
      const result = await col.insertOne({ ...grupo, fecha: new Date().toISOString() });
      return res.status(201).json({ success: true, grupo: { ...grupo, id: result.insertedId.toString() } });
    }

    if (req.method === 'PUT') {
      const { id, datos } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      const { _id, id: i, fecha, ...campos } = datos || {};
      await col.updateOne({ _id: new ObjectId(id) }, { $set: campos });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await col.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}