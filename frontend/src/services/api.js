/**
 * api.js
 * Centralized API service — all fetch calls go through here.
 * Single Responsibility: components never call fetch() directly.
 */
import { buildGraph, expandNode, getCharacterDetail, getAllTags } from './local/graphService';
import { findPhrases } from './local/phraseService';

export const graphApi = {
  /**
   * Fetch graph nodes and edges.
   * @param {{ maxHsk, context, mode }} params
   */
  getGraph: async ({ maxHsk = 6, context = null, mode = 'evo', rootsOnly = false } = {}) => {
    return buildGraph(maxHsk, context, mode, rootsOnly);
  },

  /**
   * Fetch full character detail by ID.
   */
  getCharacter: async (id) => {
    const char = getCharacterDetail(id);
    if (!char) throw new Error("Character not found");
    return char;
  },

  /**
   * Fetch all semantic tags.
   */
  getTags: async () => {
    return getAllTags();
  },

  /**
   * Expand graph specific node
   */
  expandNode: async (id, mode, maxHsk = 6) => {
    return expandNode(id, mode, maxHsk);
  },
};

export const phraseApi = {
  /**
   * Find phrases containing the provided characters.
   * @param {string[]} chars - array of character IDs
   */
  buildPhrase: async (chars) => {
    return findPhrases(chars);
  },
};

export const dictApi = {
  getDefinition: (char) =>
    fetch(`https://www.moedict.tw/uni/${encodeURIComponent(char)}.json`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
};
