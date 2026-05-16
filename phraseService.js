/**
 * phraseService.js (Local Frontend Version)
 */
import { phraseData } from '../../data/phraseData';

/**
 * Given an array of character IDs, finds phrases that contain the most of them.
 * Returns top matches sorted by coverage (descending).
 */
export function findPhrases(charIds, limit = 5) {
  if (!charIds || charIds.length === 0) return [];

  const targetSet = new Set(charIds);

  const scored = phraseData.map(entry => {
    // Count how many of the target chars appear in this phrase
    const matchCount = entry.chars.filter(c => targetSet.has(c)).length;
    const coverage = matchCount / targetSet.size; // 0.0 → 1.0

    return { ...entry, matchCount, coverage };
  });

  // Sort by coverage desc, then by HSK level asc (simpler phrases first)
  return scored
    .filter(e => e.matchCount > 0)
    .sort((a, b) => b.coverage - a.coverage || a.hsk - b.hsk)
    .slice(0, limit);
}