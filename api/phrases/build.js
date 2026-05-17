/**
 * /api/phrases/build.js  →  POST /api/phrases/build
 * Encontra frases reais contendo os caracteres selecionados.
 */

// 1. Importação moderna (ESM)
import { phraseData } from '../_data/phraseData.js';

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