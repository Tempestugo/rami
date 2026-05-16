/**
 * /api/phrases/build.js  →  POST /api/phrases/build
 * Finds real phrases containing the selected characters.
 * Body: { chars: ['我', '吃', '水', '果'] }
 */

const { phraseData } = require('../_data/phraseData');

function findPhrases(charIds, limit = 5) {
  if (!charIds || charIds.length === 0) return [];

  const targetSet = new Set(charIds);

  const scored = phraseData.map(entry => {
    const matchCount = entry.chars.filter(c => targetSet.has(c)).length;
    const coverage = matchCount / targetSet.size;
    return { ...entry, matchCount, coverage };
  });

  return scored
    .filter(e => e.matchCount > 0)
    .sort((a, b) => b.coverage - a.coverage || a.hsk - b.hsk)
    .slice(0, limit);
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { chars } = req.body || {};

  if (!Array.isArray(chars) || chars.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide a non-empty array of characters.' });
  }

  try {
    const results = findPhrases(chars);
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Phrase build error:', err);
    return res.status(500).json({ success: false, message: 'Phrase search failed.' });
  }
};
