/**
 * /api/graph/tags.js  →  GET /api/graph/tags
 * Returns all available semantic tags for the sidebar filter buttons.
 */

const { hanziData } = require('../_data/hanziData');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const tagSet = new Set();
  hanziData.forEach(n => n.tags.forEach(t => tagSet.add(t)));
  const tags = Array.from(tagSet).sort();

  return res.status(200).json({ success: true, data: tags });
};
