module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const password = body.password || '';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password && password === expectedPassword) {
      return res.status(200).json({ success: true, token: expectedPassword });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid security key' });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Invalid request payload' });
  }
};
