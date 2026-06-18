// scripts/importar.js
// Importa los grupos del JSON local a MongoDB Atlas
// Uso: node scripts/importar.js

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

const uri = process.env.MONGODB_URI || 'TU_URI_AQUI';

async function importar() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db('grupos_db');
    const col = db.collection('grupos');
    
    // Leer el JSON local
    const raw = readFileSync('./data/grupos.json', 'utf-8');
    const { grupos } = JSON.parse(raw);
    
    // Limpiar IDs numéricos (MongoDB usará ObjectId automáticamente)
    const docs = grupos.map(({ id, ...resto }) => ({
      ...resto,
      fecha: new Date().toISOString()
    }));
    
    // Borrar colección existente e importar
    await col.deleteMany({});
    const result = await col.insertMany(docs);
    
    console.log(`✅ ${result.insertedCount} grupos importados a MongoDB`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

importar();
