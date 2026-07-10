export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { usuario, password } = req.body;

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return res.status(500).json({ error: 'Variables de entorno no configuradas' });
  }

  if (usuario === adminUser && password === adminPass) {
    const token = Buffer.from(`${adminUser}:${Date.now()}:${adminPass}`).toString('base64');
    return res.status(200).json({ success: true, token });
  }

  return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
}
