/**
 * /api/graph/index.js  →  GET /api/graph
 * Vercel Serverless Function (Node.js runtime, CommonJS)
 * Query params: maxHsk, context, mode
 */

const { hanziData } = require('../_data/hanziData');

function buildGraph(maxHsk = 6, context = null, mode = 'evo') {
  let universe = hanziData.filter(n => n.hsk <= maxHsk);

  if (context) {
    universe = universe.filter(n => n.tags.includes(context));
  }

  const activeIds = new Set(universe.map(n => n.id));

  const nodes = universe.map(n => ({
    id: n.id,
    pinyin: n.pinyin,
    meaning: n.meaning,
    hsk: n.hsk,
    tags: n.tags,
  }));

  const edges = [];
  const seen = new Set();

  universe.forEach(n => {
    if (mode === 'dag') {
      n.components.forEach(comp => {
        if (activeIds.has(comp)) {
          const key = `${n.id}>${comp}`;
          if (!seen.has(key)) { seen.add(key); edges.push({ from: n.id, to: comp }); }
        }
      });
    } else if (mode === 'evo') {
      universe.forEach(target => {
        if (target.components.includes(n.id)) {
          const key = `${n.id}>${target.id}`;
          if (!seen.has(key)) { seen.add(key); edges.push({ from: n.id, to: target.id }); }
        }
      });
    } else if (mode === 'sim') {
      n.visual_parents.forEach(vp => {
        if (activeIds.has(vp)) {
          const key = `${vp}>${n.id}`;
          if (!seen.has(key)) { seen.add(key); edges.push({ from: vp, to: n.id }); }
        }
      });
    }
  });

  return { nodes, edges };
}

module.exports = function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const maxHsk = parseInt(req.query.maxHsk) || 6;
  const context = req.query.context || null;
  const mode = req.query.mode || 'evo';

  try {
    const graph = buildGraph(maxHsk, context, mode);
    return res.status(200).json({ success: true, data: graph });
  } catch (err) {
    console.error('Graph build error:', err);
    return res.status(500).json({ success: false, message: 'Failed to build graph.' });
  }
};
