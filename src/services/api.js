/**
 * api.js — Centralized API service.
 * All paths are relative (/api/...) so they work both:
 *   - In dev: proxied by Vite to localhost:3000 (Vercel dev)
 *   - In prod: served by Vercel serverless functions directly
 */
import axios from 'axios';

const BASE = '/api';

export const graphApi = {
  getGraph: ({ maxHsk = 6, context = null, mode = 'evo' } = {}) => {
    const params = { maxHsk, mode };
    if (context) params.context = context;
    return axios.get(`${BASE}/graph`, { params }).then(r => r.data.data);
  },

  getCharacter: (id) =>
    axios.get(`${BASE}/graph/character/${encodeURIComponent(id)}`).then(r => r.data.data),

  getTags: () =>
    axios.get(`${BASE}/graph/tags`).then(r => r.data.data),
};

export const phraseApi = {
  buildPhrase: (chars) =>
    axios.post(`${BASE}/phrases/build`, { chars }).then(r => r.data.data),
};
