/**
 * /api/graph/character/[id].js  →  GET /api/graph/character/:id
 * Returns full character detail for a single character.
 * Vercel dynamic route: the [id] segment becomes req.query.id
 */

const { hanziData } = require('../../_data/hanziData');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const id = req.query.id;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Character ID is required.' });
  }

  const char = hanziData.find(n => n.id === id) || null;

  if (!char) {
    return res.status(404).json({ success: false, message: 'Character not found.' });
  }

  return res.status(200).json({ success: true, data: char });
};
