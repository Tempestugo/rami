/**
 * graphService.js
 * Business logic for graph node retrieval and edge building.
 * Decoupled from Express so it's independently testable.
 */

const { hanziData } = require('../data/hanziData');

/**
 * Returns all characters filtered by HSK level and optional semantic tag.
 * @param {number} maxHsk  - Maximum HSK level to include
 * @param {string|null} context - Semantic tag filter (e.g. 'cozinha', 'natureza')
 * @param {string} mode - Edge-building mode: 'dag' | 'evo' | 'sim'
 */
function buildGraph(maxHsk = 6, context = null, mode = 'evo') {
  // Step 1: Filter universe by HSK level
  let universe = hanziData.filter(n => n.hsk <= maxHsk);

  // Step 2: Apply semantic tag filter (mock vector intersection)
  if (context) {
    universe = universe.filter(n => n.tags.includes(context));
  }

  const activeIds = new Set(universe.map(n => n.id));

  // Step 3: Build nodes
  const nodes = universe.map(n => ({
    id: n.id,
    pinyin: n.pinyin,
    meaning: n.meaning,
    hsk: n.hsk,
    tags: n.tags,
  }));

  // Step 4: Build edges depending on mode
  const edges = [];
  const seen = new Set();

  universe.forEach(n => {
    if (mode === 'dag') {
      // Analytical: complex character → constituent radicals
      n.components.forEach(comp => {
        if (activeIds.has(comp)) {
          const key = `${n.id}>${comp}`;
          if (!seen.has(key)) { seen.add(key); edges.push({ from: n.id, to: comp }); }
        }
      });
    } else if (mode === 'evo') {
      // Evolution: radical → derived characters
      universe.forEach(target => {
        if (target.components.includes(n.id)) {
          const key = `${n.id}>${target.id}`;
          if (!seen.has(key)) { seen.add(key); edges.push({ from: n.id, to: target.id }); }
        }
      });
    } else if (mode === 'sim') {
      // Visual similarity: visual parent → visual child (+ 1 stroke)
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

/**
 * Returns full character data for a single character.
 */
function getCharacterDetail(id) {
  return hanziData.find(n => n.id === id) || null;
}

/**
 * Returns all available semantic tags for the sidebar filter buttons.
 */
function getAllTags() {
  const db = getDb();
  const tagSet = new Set();
  if (db) {
    const rows = db.prepare('SELECT tags FROM characters').all();
    rows.forEach(r => {
      const tgs = JSON.parse(r.tags);
      tgs.forEach(t => tagSet.add(t));
    });
  } else {
    hanziData.forEach(n => n.tags.forEach(t => tagSet.add(t)));
  }
  return Array.from(tagSet).sort();
}

module.exports = { buildGraph, expandNode, getCharacterDetail, getAllTags };
