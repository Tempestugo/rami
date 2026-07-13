import { create } from 'zustand';

// ── Helpers de atividade (streak, daily_done, grammar_done, arena_score) ──────

/** Salva no banco em background (fire-and-forget). Nunca trava a UI. */
async function persistActivity(userId, payload) {
  if (!userId) return;
  try {
    await fetch(`/api/activity/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Silencioso — o localStorage já salvou localmente
  }
}

/**
 * Carrega a atividade do banco e mescla com o localStorage.
 * Retorna o estado unificado e salva tudo de volta nos dois lugares.
 * Estratégia: DB ganha para streak e grammar_done; local ganha para
 * daily_done se a data for hoje (o usuário pode ter trabalhado offline).
 */
async function syncActivity(userId) {
  if (!userId) return {};
  try {
    const res = await fetch(`/api/activity/${userId}`);
    const json = await res.json();
    if (!json.success) return {};
    const remote = json.data;

    const today = new Date().toDateString();

    // streak — DB vence se tiver streak maior ou mais recente
    const localStreakRaw = localStorage.getItem('rami_streak');
    const localStreak = localStreakRaw ? JSON.parse(localStreakRaw) : { count: 0, lastDate: null };
    const remoteStreakDate = remote.streak_date ? new Date(remote.streak_date).toDateString() : null;

    let finalStreak = { count: remote.streak_count, lastDate: remoteStreakDate };
    if (localStreak.count > remote.streak_count) {
      finalStreak = localStreak;
    }

    // daily_done — local vence se for de hoje, senão DB
    const localDailyRaw = localStorage.getItem('rami_daily_done');
    const localDaily = localDailyRaw ? JSON.parse(localDailyRaw) : {};
    const localDailyDate = localDaily._date;
    const remoteDailyDone = remote.daily_done || {};

    let finalDaily = remoteDailyDone;
    if (localDailyDate === today) {
      // Mescla: união das chaves de hoje
      finalDaily = { ...remoteDailyDone, ...localDaily };
    }
    finalDaily._date = today;

    // grammar_done — DB vence (acúmulo histórico)
    const localGrammarRaw = localStorage.getItem('rami_grammar_done');
    const localGrammar = localGrammarRaw ? JSON.parse(localGrammarRaw) : {};
    const finalGrammar = { ...localGrammar, ...(remote.grammar_done || {}) };

    // arena_score — DB vence (pontuação máxima histórica)
    const finalArenaScore = remote.arena_score || 0;

    // Persiste o estado unificado nos dois lugares
    localStorage.setItem('rami_streak', JSON.stringify({ count: finalStreak.count, lastDate: finalStreak.lastDate }));
    localStorage.setItem('rami_daily_done', JSON.stringify(finalDaily));
    localStorage.setItem('rami_grammar_done', JSON.stringify(finalGrammar));

    await persistActivity(userId, {
      streak_count: finalStreak.count,
      streak_date: finalStreak.lastDate ? new Date(finalStreak.lastDate).toISOString().split('T')[0] : null,
      daily_done: finalDaily,
      grammar_done: finalGrammar,
      arena_score: finalArenaScore,
    });

    return { streak: finalStreak, daily_done: finalDaily, grammar_done: finalGrammar, arena_score: finalArenaScore };
  } catch (e) {
    // Falha silenciosa — o app continua funcionando com localStorage
    return {};
  }
}

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
    // Sincroniza a atividade com o banco ao fazer login
    syncActivity(userData.id).catch(() => {});
  },
  logout: () => {
    localStorage.removeItem('rami_user');
    set({ user: null });
  },

  // === ACTIVITY SYNC (streak, daily, grammar, arena) ===
  syncActivity: () => {
    const userId = get().user?.id;
    return syncActivity(userId);
  },
  persistActivity: (payload) => {
    const userId = get().user?.id;
    return persistActivity(userId, payload);
  },
}));

export default useStore;
