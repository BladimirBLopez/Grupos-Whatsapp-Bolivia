// Rate limiting simple en memoria
const intentos = new Map();
const MAX_INTENTOS = 5;
const BLOQUEO_MS   = 15 * 60 * 1000; // 15 minutos

export default async function handler(req, res) {
  const origen = process.env.ALLOWED_ORIGIN || 'https://qigruposbo.online';
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // Rate limiting por IP
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ahora = Date.now();
  const registro = intentos.get(ip) || { count: 0, desde: ahora };

  if (ahora - registro.desde > BLOQUEO_MS) {
    registro.count = 0;
    registro.desde = ahora;
  }

  if (registro.count >= MAX_INTENTOS) {
    const restante = Math.ceil((BLOQUEO_MS - (ahora - registro.desde)) / 60000);
    return res.status(429).json({ error: `Demasiados intentos. Espera ${restante} minutos.` });
  }

  const { usuario, password } = req.body;
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return res.status(500).json({ error: 'Variables de entorno no configuradas' });
  }

  if (usuario === adminUser && password === adminPass) {
    // Reset intentos al login exitoso
    intentos.delete(ip);
    // Token con expiración (8 horas)
    const expira = Date.now() + (8 * 60 * 60 * 1000);
    const token  = Buffer.from(`${adminUser}:${expira}:${adminPass}`).toString('base64');
    return res.status(200).json({ success: true, token });
  }

  // Registrar intento fallido
  registro.count++;
  intentos.set(ip, registro);
  return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
}
