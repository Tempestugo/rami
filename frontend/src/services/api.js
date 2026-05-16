import { buildGraph, expandNode, getCharacterDetail } from './local/graphService';
import { getPhrasesForCharacters } from './local/phraseService';

export const graphApi = {
  getGraph: async ({ maxHsk, context, mode, rootsOnly }) => {
    return buildGraph(maxHsk, context, mode, rootsOnly);
  },
  
  expandNode: async (id, mode, maxHsk) => {
    return expandNode(id, mode, maxHsk);
  },
  
  getCharacterDetail: async (id) => {
    const char = getCharacterDetail(id);
    if (!char) throw new Error("Character not found");
    return char;
  },
};

export const phraseApi = {
  getPhrases: async (characters) => {
    return getPhrasesForCharacters(characters);
  }
};
