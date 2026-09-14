const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dataPath = path.join(process.cwd(), 'data.json');
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ success: false, error: 'data.json not found' });
    }
    const raw = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(raw);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to read data.json: ' + err.message });
  }
};
