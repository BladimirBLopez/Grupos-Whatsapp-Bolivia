// api/grupos.js - Versión con require (más compatible con Vercel)
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const jsonPath = path.join(process.cwd(), 'data', 'grupos.json');

  // GET
  if (req.method === 'GET') {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Error al obtener grupos' });
    }
  }

  // POST
  if (req.method === 'POST') {
    try {
      const { grupo } = req.body;
      if (!grupo || !grupo.nombre || !grupo.link) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }

      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const nuevoId = data.grupos.length > 0 ? Math.max(...data.grupos.map(g => g.id)) + 1 : 1;
      const nuevoGrupo = { id: nuevoId, ...grupo, plataforma: 'whatsapp', fecha: new Date().toISOString() };
      data.grupos.push(nuevoGrupo);
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      
      return res.status(201).json({ success: true, grupo: nuevoGrupo });
    } catch (error) {
      return res.status(500).json({ error: 'Error al crear grupo' });
    }
  }

  // PUT
  if (req.method === 'PUT') {
    try {
      const { id, datos } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const index = data.grupos.findIndex(g => g.id === id);
      if (index === -1) return res.status(404).json({ error: 'Grupo no encontrado' });
      
      data.grupos[index] = { ...data.grupos[index], ...datos };
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Error al actualizar' });
    }
  }

  // DELETE
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      data.grupos = data.grupos.filter(g => g.id !== id);
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Error al eliminar' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
};