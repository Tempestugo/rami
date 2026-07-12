import { hanziData } from '../_data/hanziData.js';

function buildGraph(maxHsk = 6, context = null, mode = 'evo', quickRoot = null) {
  let baseUniverse = hanziData.filter(n => n.hsk <= maxHsk || n.id === quickRoot);

  let universe = [];
  if (context) {
    const contextNodes = baseUniverse.filter(n => n.tags && n.tags.includes(context));
    const contextIds = new Set(contextNodes.map(n => n.id));
    const relatedIds = new Set();
    
    contextNodes.forEach(n => {
      if (mode === 'evo' || mode === 'dag') {
        if (n.components) {
          n.components.forEach(c => relatedIds.add(c));
        }
      } else if (mode === 'sim') {
        if (n.visual_parents) {
          n.visual_parents.forEach(vp => relatedIds.add(vp));
        }
      }
    });

    universe = baseUniverse.filter(n => contextIds.has(n.id) || relatedIds.has(n.id));
  } else {
    universe = baseUniverse;
  }

  if (quickRoot) {
    if (mode === 'evo' || mode === 'dag') {
      universe = universe.filter(n => n.id === quickRoot || (n.components && n.components.includes(quickRoot)));
    } else if (mode === 'sim') {
      universe = universe.filter(n => {
        if (n.id === quickRoot) return true;
        if (n.visual_parents && n.visual_parents.includes(quickRoot)) return true;
        const rootData = hanziData.find(h => h.id === quickRoot);
        if (rootData && rootData.visual_parents && rootData.visual_parents.includes(n.id)) return true;
        return false;
      });
    }
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

  let finalEdges = edges;
  if (quickRoot) {
    finalEdges = edges.filter(e => e.from === quickRoot || e.to === quickRoot);
  }

  return { nodes, edges: finalEdges };
}

export default function handler(req, res) {
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
  const quickRoot = req.query.quickRoot || null;

  try {
    const graph = buildGraph(maxHsk, context, mode, quickRoot);
    return res.status(200).json({ success: true, data: graph });
  } catch (err) {
    console.error('Graph build error:', err);
    return res.status(500).json({ success: false, message: 'Failed to build graph.' });
  }
}