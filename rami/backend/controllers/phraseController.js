/**
 * phraseController.js
 * Handles all /api/phrases requests. Delegates to phraseService.
 */

const { findPhrases } = require('../services/phraseService');

/**
 * POST /api/phrases/build
 * Body: { chars: ['我', '吃', '水', '果'] }
 */
function buildPhrase(req, res) {
  const { chars } = req.body;

  if (!Array.isArray(chars) || chars.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide a non-empty array of characters.' });
  }

  try {
    const results = findPhrases(chars);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Phrase build error:', err);
    res.status(500).json({ success: false, message: 'Phrase search failed.' });
  }
}

module.exports = { buildPhrase };
