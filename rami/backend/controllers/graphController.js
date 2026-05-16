/**
 * graphController.js
 * Handles all /api/graph requests. Delegates business logic to graphService.
 */

const { buildGraph, getCharacterDetail, getAllTags } = require('../services/graphService');

/**
 * GET /api/graph
 * Query params: maxHsk (number), context (string|null), mode ('dag'|'evo'|'sim')
 */
function getGraph(req, res) {
  const maxHsk = parseInt(req.query.maxHsk) || 6;
  const context = req.query.context || null;
  const mode = req.query.mode || 'evo';

  try {
    const graph = buildGraph(maxHsk, context, mode);
    res.json({ success: true, data: graph });
  } catch (err) {
    console.error('Graph build error:', err);
    res.status(500).json({ success: false, message: 'Failed to build graph.' });
  }
}

/**
 * GET /api/graph/character/:id
 * Returns full detail for a single character.
 */
function getCharacter(req, res) {
  const id = req.params.id;
  const char = getCharacterDetail(id);
  if (!char) return res.status(404).json({ success: false, message: 'Character not found.' });
  res.json({ success: true, data: char });
}

/**
 * GET /api/graph/tags
 * Returns all available semantic tags for filter buttons.
 */
function getTags(req, res) {
  const tags = getAllTags();
  res.json({ success: true, data: tags });
}

module.exports = { getGraph, getCharacter, getTags };
