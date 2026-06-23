/**
 * /api/phrases/build.js  →  POST /api/phrases/build
 * Encontra frases reais contendo os caracteres selecionados.
 */

// 1. Importação moderna (ESM)
import { phraseData } from '../_data/phraseData.js';

function findPhrases(charsInput, limit = 300) {
  if (!charsInput || charsInput.length === 0) return [];

  const srsMap = new Map();
  const targetSet = new Set();

  charsInput.forEach(item => {
    if (item && typeof item === 'object' && item.char) {
      targetSet.add(item.char);
      srsMap.set(item.char, item.srs_level || 1);
    } else if (typeof item === 'string') {
      targetSet.add(item);
      srsMap.set(item, 1);
    }
  });

  const scored = phraseData.map(entry => {
    const matchCount = entry.chars.filter(c => targetSet.has(c)).length;
    const coverage = entry.chars.length > 0 ? (matchCount / entry.chars.length) : 0;
    
    // Calcula srsPriority como a soma de (6 - srs_level) de cada ideograma da frase.
    // Ideogramas mais fracos (srs_level = 1) adicionam 5 pontos, etc.
    // Isso prioriza frases contendo múltiplos caracteres fracos.
    let srsPriority = 0;
    entry.chars.forEach(c => {
      if (targetSet.has(c)) {
        const lvl = srsMap.get(c) || 1;
        srsPriority += (6 - lvl);
      }
    });

    return { ...entry, matchCount, coverage, srsPriority };
  });

  return scored
    .filter(e => e.coverage >= 0.8)
    .sort((a, b) => b.srsPriority - a.srsPriority || b.coverage - a.coverage || a.hsk - b.hsk)
    .slice(0, limit);
}

// 2. Exportação padrão (O que o seu server.js está esperando)
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Note: Se o seu frontend estiver enviando um GET, mude aqui para GET
  // Mas o comentário original dizia POST.
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Pega os caracteres tanto do body (POST) quanto da query (GET) por garantia
  const chars = req.body?.chars || req.query?.chars;

  if (!chars || !Array.isArray(chars) || chars.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide a non-empty array of characters.' });
  }

  try {
    const results = findPhrases(chars);
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Phrase build error:', err);
    return res.status(500).json({ success: false, message: 'Phrase search failed.' });
  }
}