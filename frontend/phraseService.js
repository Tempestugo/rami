import { phraseData } from '../../data/phraseData';

export function getPhrasesForCharacters(characters) {
  if (!characters || characters.length === 0) return [];
  return phraseData.filter(p => p.characters.some(c => characters.includes(c)));
}