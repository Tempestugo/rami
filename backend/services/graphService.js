/**
 * graphService.js
 */
const { hanziData } = require('../data/hanziData');

function buildGraph(maxHsk = 6, context = null, mode = 'evo', rootsOnly = false) {
  let universe = hanziData.filter(n => n.hsk <= maxHsk);

  // Filtro de contexto ou Modo tela limpa (Lazy Loading)
  if (context) {
    universe = universe.filter(n => n.tags.includes(context));
  } else if (rootsOnly) {
    const roots = ['一', '人', '木', '口', '水', '火', '日', '女'];
    universe = universe.filter(n => roots.includes(n.id));
  }

  const activeIds = new Set(universe.map(n => n.id));

  const nodes = universe.map(n => ({
    id: n.id, pinyin: n.pinyin, meaning: n.meaning, hsk: n.hsk, tags: n.tags
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

// ESSA FUNÇÃO ESTAVA FALTANDO COMPLETAMENTE NA IA
function expandNode(id, mode, maxHsk = 6) {
  let universe = hanziData.filter(n => n.hsk <= maxHsk);
  const activeIds = new Set(universe.map(n => n.id));

  const nodes = [];
  const edges = [];
  const n = universe.find(char => char.id === id);

  if (!n) return { nodes, edges };

  nodes.push({ id: n.id, pinyin: n.pinyin, meaning: n.meaning, hsk: n.hsk, tags: n.tags });

  if (mode === 'dag') {
    n.components.forEach(comp => {
      if (activeIds.has(comp)) {
        const child = universe.find(c => c.id === comp);
        if (child) {
          nodes.push({ id: child.id, pinyin: child.pinyin, meaning: child.meaning, hsk: child.hsk, tags: child.tags });
          edges.push({ from: n.id, to: comp });
        }
      }
    });
  } else if (mode === 'evo') {
    universe.forEach(target => {
      if (target.components.includes(n.id)) {
         nodes.push({ id: target.id, pinyin: target.pinyin, meaning: target.meaning, hsk: target.hsk, tags: target.tags });
         edges.push({ from: n.id, to: target.id });
      }
    });
  } else if (mode === 'sim') {
    universe.forEach(target => {
      if (target.visual_parents.includes(n.id)) {
         nodes.push({ id: target.id, pinyin: target.pinyin, meaning: target.meaning, hsk: target.hsk, tags: target.tags });
         edges.push({ from: n.id, to: target.id }); 
      }
    });
  }

  return { nodes, edges };
}

function getCharacterDetail(id) {
  return hanziData.find(n => n.id === id) || null;
}

function getAllTags() {
  const tagSet = new Set();
  hanziData.forEach(n => n.tags.forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

module.exports = { buildGraph, expandNode, getCharacterDetail, getAllTags };
