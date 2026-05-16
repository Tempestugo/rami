/**
 * api.js
 * Centralized API service — all fetch calls go through here.
 * Single Responsibility: components never call fetch() directly.
 */
import axios from 'axios';

const BASE = '/api';

export const graphApi = {
  /**
   * Fetch graph nodes and edges.
   * @param {{ maxHsk, context, mode }} params
   */
  getGraph: ({ maxHsk = 6, context = null, mode = 'evo' } = {}) => {
    const params = { maxHsk, mode };
    if (context) params.context = context;
    return axios.get(`${BASE}/graph`, { params }).then(r => r.data.data);
  },

  /**
   * Fetch full character detail by ID.
   */
  getCharacter: (id) =>
    axios.get(`${BASE}/graph/character/${encodeURIComponent(id)}`).then(r => r.data.data),

  /**
   * Fetch all semantic tags.
   */
  getTags: () =>
    axios.get(`${BASE}/graph/tags`).then(r => r.data.data),
};

export const phraseApi = {
  /**
   * Find phrases containing the provided characters.
   * @param {string[]} chars - array of character IDs
   */
  buildPhrase: (chars) =>
    axios.post(`${BASE}/phrases/build`, { chars }).then(r => r.data.data),
};
