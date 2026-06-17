// api/grupos.js - Con MongoDB Atlas
import { MongoClient } from 'mongodb';

// ============================================
// CONFIGURACIÓN DE MONGODB
// ============================================
const uri = 'mongodb+srv://admin:admin123@cluster0.wkzzcug.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await client.connect();
    const db = client.db('grupos_db');
    const collection = db.collection('grupos');

    // GET - Obtener todos los grupos
    if (req.method === 'GET') {
      const data = await collection.find({}).toArray();
      return res.status(200).json({ grupos: data });
    }

    // POST - Crear nuevo grupo
    if (req.method === 'POST') {
      const { grupo } = req.body;
      if (!grupo || !grupo.nombre || !grupo.link) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }

      const nuevoGrupo = {
        ...grupo,
        plataforma: grupo.plataforma || 'whatsapp',
        fecha: new Date().toISOString()
      };

      const result = await collection.insertOne(nuevoGrupo);
      return res.status(201).json({ 
        success: true, 
        grupo: { id: result.insertedId, ...nuevoGrupo }
      });
    }

    // PUT - Actualizar grupo
    if (req.method === 'PUT') {
      const { id, datos } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const { ObjectId } = await import('mongodb');
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: datos }
      );
      
      return res.status(200).json({ success: true });
    }

    // DELETE - Eliminar grupo
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const { ObjectId } = await import('mongodb');
      await collection.deleteOne({ _id: new ObjectId(id) });
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
}