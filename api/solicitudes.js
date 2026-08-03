import { MongoClient, ObjectId } from 'mongodb';

let cachedClient = null;

async function conectar() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  const origen = process.env.ALLOWED_ORIGIN || 'https://qigruposbo.online';
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = await conectar();
    const db  = client.db('grupos_db');
    const sol = db.collection('solicitudes');
    const grp = db.collection('grupos');

    // ── GET: obtener solicitudes pendientes ──
    if (req.method === 'GET') {
      const { estado } = req.query;
      const filtro = estado ? { estado } : { estado: 'pendiente' };
      const lista = await sol.find(filtro).sort({ fecha: -1 }).toArray();
      const data  = lista.map(s => ({ ...s, id: s._id.toString(), _id: undefined }));
      return res.status(200).json({ solicitudes: data });
    }

    // ── POST: crear solicitud pública ──
    if (req.method === 'POST') {
      const { nombre, descripcion, ubicacion, link, plataforma, categoria, miembros, contacto, imagen } = req.body;

      if (!nombre || !link || !ubicacion) {
        return res.status(400).json({ error: 'Nombre, enlace y ciudad son requeridos' });
      }

      // Limpiar link antes de comparar
      const linkBase = link.trim().split('?')[0];

      // Verificar link duplicado en grupos y solicitudes pendientes
      const todosGrupos = await grp.find({}).toArray();
      const todasSols   = await sol.find({ estado: 'pendiente' }).toArray();

      const enGrupos     = todosGrupos.find(g => g.link && g.link.split('?')[0] === linkBase);
      const enSolicitudes = todasSols.find(s => s.link && s.link.split('?')[0] === linkBase);

      if (enGrupos) {
        return res.status(400).json({ error: 'Este grupo ya está publicado en el directorio' });
      }
      if (enSolicitudes) {
        return res.status(400).json({ error: 'Este grupo ya tiene una solicitud pendiente de revisión' });
      }

      const nueva = {
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || '',
        ubicacion,
        link:        link.trim(),
        plataforma:  plataforma || 'whatsapp',
        categoria:   categoria  || 'compra-venta',
        miembros:    Number(miembros) || 0,
        contacto:    contacto?.trim() || '',
        imagen:      imagen?.trim() || '',
        estado:      'pendiente',
        fecha:       new Date().toISOString()
      };

      await sol.insertOne(nueva);
      return res.status(201).json({ success: true, mensaje: 'Solicitud enviada, será revisada pronto.' });
    }

    // ── PUT: aprobar o rechazar ──
    if (req.method === 'PUT') {
      const { id, accion } = req.body;
      if (!id || !accion) return res.status(400).json({ error: 'ID y acción requeridos' });

      const solicitud = await sol.findOne({ _id: new ObjectId(id) });
      if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

      if (accion === 'aprobar') {
        // Mover a grupos
        await grp.insertOne({
          nombre:      solicitud.nombre,
          descripcion: solicitud.descripcion,
          ubicacion:   solicitud.ubicacion,
          link:        solicitud.link,
          plataforma:  solicitud.plataforma,
          categoria:   solicitud.categoria,
          miembros:    solicitud.miembros,
          activos:     0,
          destacado:   false,
          imagen:      solicitud.imagen || '',
          visitas:     0,
          reportes:    0,
          fecha:       new Date().toISOString()
        });
        await sol.updateOne({ _id: new ObjectId(id) }, { $set: { estado: 'aprobado' } });
        return res.status(200).json({ success: true, mensaje: 'Grupo aprobado y publicado' });
      }

      if (accion === 'rechazar') {
        await sol.updateOne({ _id: new ObjectId(id) }, { $set: { estado: 'rechazado' } });
        return res.status(200).json({ success: true, mensaje: 'Solicitud rechazada' });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    }

    // ── DELETE: eliminar solicitud ──
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await sol.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
