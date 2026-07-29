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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = await conectar();
    const db  = client.db('grupos_db');
    const col = db.collection('destacados');
    const grp = db.collection('grupos');

    // GET - listar solicitudes
    if (req.method === 'GET') {
      const { estado } = req.query;
      const filtro = estado ? { estado } : {};
      const lista = await col.find(filtro).sort({ fecha: -1 }).toArray();
      return res.status(200).json({
        destacados: lista.map(d => ({ ...d, id: d._id.toString(), _id: undefined }))
      });
    }

    // POST - crear solicitud (publico)
    if (req.method === 'POST') {
      const { plan, precio, link, nombre, contacto, mensaje } = req.body;
      if (!link || !nombre || !contacto) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
      }
      const nueva = {
        plan, precio, link: link.trim(), nombre: nombre.trim(),
        contacto: contacto.trim(), mensaje: mensaje || '',
        estado: 'pendiente',
        fecha: new Date().toISOString()
      };
      await col.insertOne(nueva);
      return res.status(201).json({ success: true });
    }

    // PUT - aprobar/rechazar (admin)
    if (req.method === 'PUT') {
      const token = req.headers['x-admin-token'];
      if (!token) return res.status(401).json({ error: 'No autorizado' });

      const { id, accion } = req.body;
      if (!id || !accion) return res.status(400).json({ error: 'Faltan datos' });

      const solicitud = await col.findOne({ _id: new ObjectId(id) });
      if (!solicitud) return res.status(404).json({ error: 'No encontrado' });

      if (accion === 'aprobar') {
        // Buscar grupo por link y activar destacado
        const linkBase = solicitud.link.split('?')[0];
        const todosGrupos = await grp.find({}).toArray();
        const grupo = todosGrupos.find(g => g.link && g.link.split('?')[0] === linkBase);

        // Quitar destacado anterior
      await grp.updateMany({}, { $set: { destacado: false } });

      if (grupo) {
          // Grupo existe — activar destacado
          await grp.updateOne(
            { _id: new ObjectId(grupo._id) },
            { $set: { destacado: true } }
          );
        } else {
          // Grupo no existe — crearlo y destacarlo
          await grp.insertOne({
            nombre:      solicitud.nombre,
            descripcion: '',
            ubicacion:   'Bolivia',
            link:        solicitud.link,
            plataforma:  'whatsapp',
            categoria:   'compra-venta',
            miembros:    0,
            activos:     0,
            destacado:   true,
            imagen:      '',
            visitas:     0,
            reportes:    0,
            fecha:       new Date().toISOString()
          });
        }
        await col.updateOne({ _id: new ObjectId(id) }, { $set: { estado: 'aprobado' } });
        return res.status(200).json({ success: true, grupoEncontrado: !!grupo });
      }

      if (accion === 'rechazar') {
        await col.updateOne({ _id: new ObjectId(id) }, { $set: { estado: 'rechazado' } });
        return res.status(200).json({ success: true });
      }
    }

    // DELETE
    if (req.method === 'DELETE') {
      const token = req.headers['x-admin-token'];
      if (!token) return res.status(401).json({ error: 'No autorizado' });
      const { id } = req.body;
      await col.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
