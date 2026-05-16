/**
 * useStore.js
 * Zustand global state — single source of truth.
 * Covers: graph mode, HSK filter, context tag, selected character, phrase selection tray.
 */
import { create } from 'zustand';

const useStore = create((set, get) => ({
  // === GRAPH CONTROLS ===
  mode: 'evo',           // 'dag' | 'evo' | 'sim'
  maxHsk: 6,
  context: null,          // e.g. 'cozinha' or null

  setMode: (mode) => set({ mode }),
  setMaxHsk: (maxHsk) => set({ maxHsk }),
  setContext: (context) => set({ context }),
  clearContext: () => set({ context: null }),

  // === ACTIVE CHARACTER (details panel) ===
  activeChar: null,       // full character object from API
  setActiveChar: (char) => set({ activeChar: char }),

  // === PHRASE BUILDER TRAY ===
  // Array of character IDs selected for phrase building
  phraseSelection: [],

  togglePhraseSelection: (charId) => {
    const current = get().phraseSelection;
    if (current.includes(charId)) {
      set({ phraseSelection: current.filter(c => c !== charId) });
    } else {
      set({ phraseSelection: [...current, charId] });
    }
  },

  clearPhraseSelection: () => set({ phraseSelection: [] }),

  // === PHRASE RESULTS ===
  phraseResults: [],
  setPhraseResults: (results) => set({ phraseResults: results }),
  clearPhraseResults: () => set({ phraseResults: [] }),

  // === UI STATE ===
  isPhraseModalOpen: false,
  setIsPhraseModalOpen: (open) => set({ isPhraseModalOpen: open }),
}));

export default useStore;
