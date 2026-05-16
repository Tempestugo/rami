/**
 * api.js
 * Centralized API service — all fetch calls go through here.
 * Single Responsibility: components never call fetch() directly.
 */
import axios from 'axios';

const BASE = '/api';

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config) {
      console.error(
        `Axios Error: ${error.config.method.toUpperCase()} ${error.config.baseURL || ''}${error.config.url} failed.`,
        error.message
      );
    }
    return Promise.reject(error);
  }
);

export const graphApi = {
  /**
   * Fetch graph nodes and edges.
   * @param {{ maxHsk, context, mode }} params
   */
  getGraph: ({ maxHsk = 6, context = null, mode = 'evo', rootsOnly = false } = {}) => {
    const params = { maxHsk, mode };
    if (context) params.context = context;
    if (rootsOnly) params.rootsOnly = true;
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

  /**
   * Expand graph specific node
   */
  expandNode: (id, mode, maxHsk = 6) => {
    const params = { mode, maxHsk };
    return axios.get(`${BASE}/graph/expand/${encodeURIComponent(id)}`, { params }).then(r => r.data.data);
  },
};

export const phraseApi = {
  /**
   * Find phrases containing the provided characters.
   * @param {string[]} chars - array of character IDs
   */
  buildPhrase: (chars) =>
    axios.post(`${BASE}/phrases/build`, { chars }).then(r => r.data.data),
};

export const dictApi = {
  getDefinition: (char) =>
    fetch(`https://www.moedict.tw/uni/${encodeURIComponent(char)}.json`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
};
