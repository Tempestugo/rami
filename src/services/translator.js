/**
 * src/services/translator.js
 * Serviço para tradução automática on-demand de inglês para português.
 */

// Simple in-memory cache for the session
const translationCache = new Map();

/**
 * Traduz um texto de inglês para português.
 * @param {string} text - O texto em inglês.
 * @returns {Promise<string>} - O texto traduzido em português.
 */
export async function translateEnToPt(text) {
  if (!text) return '';
  
  const trimmed = text.trim();
  
  // 1. Check in-memory cache
  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed);
  }
  
  // 2. Check localStorage cache
  try {
    const localCache = localStorage.getItem(`trans_${trimmed}`);
    if (localCache) {
      translationCache.set(trimmed, localCache);
      return localCache;
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // 3. Fetch from our backend API translation service (which caches in DB)
  try {
    const url = `/api/translate?text=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.success && data.translated) {
      const translated = data.translated;
      
      // Save to caches
      translationCache.set(trimmed, translated);
      try {
        localStorage.setItem(`trans_${trimmed}`, translated);
      } catch (e) {}
      
      return translated;
    }
  } catch (err) {
    console.error('Translation failed (backend):', err);
  }

  // Fallback se a API falhar: retorna o original
  return trimmed;
}
