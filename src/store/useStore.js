import { create } from 'zustand';

const useStore = create((set, get) => ({
  // === GRAPH CONTROLS ===
  mode: 'evo',       // 'evo' | 'sim'
  maxHsk: 6,
  context: null,     // e.g. 'cozinha' or null
  quickRoot: null,   // e.g. '一' or null
  knownOnly: false,  // show only user's known cards in the graph
  initialPracticeType: null,

  setMode: (mode) => set({ mode }),
  setMaxHsk: (maxHsk) => set({ maxHsk }),
  setContext: (context) => set({ context, quickRoot: null }),
  clearContext: () => set({ context: null }),
  setQuickRoot: (root) => set({ quickRoot: root, context: null }),
  clearQuickRoot: () => set({ quickRoot: null }),
  setKnownOnly: (knownOnly) => set({ knownOnly }),
  setInitialPracticeType: (type) => set({ initialPracticeType: type }),

  // === ACTIVE CHARACTER (details panel) ===
  activeChar: null,
  setActiveChar: (char) => set({ activeChar: char }),

  // === PHRASE BUILDER TRAY ===
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

  // === AUTH STATE ===
  user: JSON.parse(localStorage.getItem('rami_user') || 'null'),
  login: (userData) => {
    localStorage.setItem('rami_user', JSON.stringify(userData));
    set({ user: userData });
  },
  logout: () => {
    localStorage.removeItem('rami_user');
    set({ user: null });
  },
}));

export default useStore;
