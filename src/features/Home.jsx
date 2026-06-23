import React, { useState, useEffect, useCallback } from 'react';
import { hanziData } from '@/data/hanziData.js';
import { grammarData } from '@/data/grammarData.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const hanziMap = new Map(hanziData.map(h => [h.id, h]));

/** Estima nível HSK baseado na quantidade de cartas conhecidas */
function estimateHskLevel(count) {
  if (count < 50)   return 1;
  if (count < 150)  return 2;
  if (count < 300)  return 3;
  if (count < 600)  return 4;
  if (count < 1200) return 5;
  return 6;
}

/** Seleciona o ponto gramatical do dia (rotação determinística baseada na data) */
function getDailyGrammarPoint(hskLevel, dateObj = new Date()) {
  const pool = grammarData.filter(g => g.hsk <= hskLevel);
  if (pool.length === 0) return grammarData[0];
  // Usa o timezone offset local para calcular o índice do dia local de forma estável
  const localTime = dateObj.getTime() - dateObj.getTimezoneOffset() * 60000;
  const dayIndex = Math.floor(localTime / 86400000);
  return pool[dayIndex % pool.length];
}

/** Carrega e salva o streak no localStorage */
function loadStreak() {
  try {
    const raw = localStorage.getItem('rami_streak');
    if (!raw) return { count: 0, lastDate: null };
    return JSON.parse(raw);
  } catch { return { count: 0, lastDate: null }; }
}

function updateStreak() {
  const today = new Date().toDateString();
  const streak = loadStreak();
  if (streak.lastDate === today) return streak.count;

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
  localStorage.setItem('rami_streak', JSON.stringify({ count: newCount, lastDate: today }));
  return newCount;
}

// ─── Modal de Gramática ──────────────────────────────────────────────────────
function GrammarModal({ point, onClose }) {
  if (!point) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-ink-900 border border-azure-500/30 rounded-2xl shadow-2xl shadow-azure-500/10 flex flex-col gap-0 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-azure-500/10 border-b border-azure-500/20 px-6 py-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] text-azure-400 font-mono uppercase tracking-widest">HSK {point.hsk} — Gramática do Dia</span>
            <h2 className="text-white font-display font-bold text-lg mt-0.5 leading-tight">{point.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-white transition text-xl leading-none mt-0.5"
          >✕</button>
        </div>

        {/* Estrutura */}
        <div className="px-6 py-4 border-b border-white/5">
          <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Estrutura</span>
          <p className="text-gold-300 font-mono text-sm font-bold mt-1 bg-gold-500/5 border border-gold-500/15 rounded-lg px-3 py-2">
            {point.structure}
          </p>
        </div>

        {/* Exemplos */}
        <div className="px-6 py-4 flex flex-col gap-3">
          <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Exemplos</span>
          {point.examples.map((ex, i) => (
            <div key={i} className="bg-black/30 rounded-xl p-3 border border-white/5">
              <p className="text-white font-display text-xl font-bold">{ex.chinese}</p>
              <p className="text-azure-300 font-mono text-xs mt-1">{ex.pinyin}</p>
              <p className="text-ink-300 text-xs font-body mt-1 italic">"{ex.translation}"</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex justify-between items-center bg-black/20">
          <span className="text-[9px] text-ink-600 font-mono">
            Chinese Grammar Wiki © AllSet Learning — CC BY-NC-SA 3.0
          </span>
          <a
            href={point.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-azure-400 hover:text-azure-300 font-mono transition underline underline-offset-2"
          >
            Ver no Wiki ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Lição do Dia ────────────────────────────────────────────────────────────
function LessonModal({ chars, knownChars, onLearn, onClose }) {
  const [learned, setLearned] = useState({});

  const handleLearn = (char) => {
    setLearned(prev => ({ ...prev, [char]: true }));
    onLearn(char);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-ink-900 border border-gold-500/30 rounded-2xl shadow-2xl shadow-gold-500/10 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gold-500/10 border-b border-gold-500/20 px-6 py-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] text-gold-400 font-mono uppercase tracking-widest">Lição do Dia</span>
            <h2 className="text-white font-display font-bold text-lg mt-0.5">Novos Ideogramas</h2>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-white transition text-xl leading-none mt-0.5">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {chars.map(char => {
            const data = hanziMap.get(char);
            const isLearned = learned[char];
            return (
              <div key={char} className={`rounded-xl border p-4 transition-all ${isLearned ? 'border-jade-500/40 bg-jade-500/5' : 'border-white/10 bg-black/20'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-display font-bold text-white">{char}</span>
                  <div className="flex-1">
                    <p className="text-azure-300 font-mono text-sm">{data?.pinyin || '—'}</p>
                    <p className="text-ink-300 text-sm font-body mt-0.5">{data?.meaning_pt || data?.meaning || '—'}</p>
                    {data?.tags?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {data.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-ink-400">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleLearn(char)}
                    disabled={isLearned}
                    className={`px-3 py-2 rounded-lg text-xs font-bold font-mono transition border ${
                      isLearned
                        ? 'border-jade-500/40 text-jade-400 bg-jade-500/10 cursor-default'
                        : 'border-gold-400/50 text-gold-300 bg-gold-500/10 hover:bg-gold-500/20'
                    }`}
                  >
                    {isLearned ? '✓ Aprendi' : 'Aprendi!'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t border-white/5 bg-black/20">
          <p className="text-[10px] text-ink-500 font-body italic">
            Clicar "Aprendi!" adiciona o caractere à sua coleção SRS no nível 1.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function Home({ onNavigate }) {
  const [knownCards, setKnownCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [grammarModal, setGrammarModal] = useState(false);
  const [lessonModal, setLessonModal] = useState(false);
  const [addingChar, setAddingChar] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyDone, setDailyDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rami_daily_done') || '{}'); }
    catch { return {}; }
  });

  // Carrega cartas conhecidas
  const loadCards = useCallback(() => {
    setLoading(true);
    fetch('/api/cards/1')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { if (data.success) setKnownCards(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCards();
    setStreak(updateStreak());
  }, [loadCards]);

  // Derivados
  const hskLevel = estimateHskLevel(knownCards.length);
  const grammarPoint = getDailyGrammarPoint(hskLevel, selectedDate);
  const knownSet = new Set(knownCards.map(c => c.char));
  const today = new Date().toDateString();

  // Gera os últimos 7 dias (terminando em hoje)
  const getLast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d);
    }
    return list;
  };
  const last7Days = getLast7Days();

  const getDayName = (date) => {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return names[date.getDay()];
  };

  // Lição do Dia: próximos 5 ideogramas do menor nível HSK com cartas faltando.
  let lessonChars = [];
  let lessonHskLevel = hskLevel; // Fallback para o nível estimado
  for (let level = 1; level <= 6; level++) {
    const missingChars = hanziData
      .filter(h => h.hsk === level && !knownSet.has(h.id))
      .map(h => h.id);

    if (missingChars.length > 0) {
      lessonChars = missingChars.slice(0, 5);
      lessonHskLevel = level;
      break; // Encontrou o primeiro nível com cartas para aprender
    }
  }
  // Se o loop terminar e não encontrar nada, o usuário sabe tudo. lessonChars será [].


  // Cards SRS com revisão pendente (aproximado: nível <= 3 como "pendentes para hoje")
  const srsReviewCount = knownCards.filter(c => c.srs_level <= 3).length;

  // Marcar pilar como feito na data selecionada
  const markDone = (key) => {
    const dateStr = selectedDate.toDateString();
    const updated = { ...dailyDone, [dateStr + ':' + key]: true };
    setDailyDone(updated);
    localStorage.setItem('rami_daily_done', JSON.stringify(updated));
  };

  const isDone = (key) => {
    const dateStr = selectedDate.toDateString();
    return !!dailyDone[dateStr + ':' + key];
  };

  const isDoneForDate = (key, date) => {
    return !!dailyDone[date.toDateString() + ':' + key];
  };

  const getCompletionsForDate = (date) => {
    return ['srs', 'lesson', 'practice', 'grammar'].filter(k => isDoneForDate(k, date)).length;
  };

  const doneCount = ['srs', 'lesson', 'practice', 'grammar'].filter(k => isDone(k)).length;
  const progressPct = Math.round((doneCount / 4) * 100);

  // Adiciona char ao SRS
  const handleLearnChar = async (char) => {
    setAddingChar(char);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ char, srs_level: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setKnownCards(prev => [...prev, { char, srs_level: 1 }]);
      }
    } catch (e) { console.error(e); }
    finally { setAddingChar(null); }
  };

  const getWeeklyPracticeCount = () => {
    const now = new Date();
    const year = now.getFullYear();
    const week = Math.ceil(((now - new Date(year,0,1)) / 86400000 + new Date(year,0,1).getDay()+1)/7);
    const weekKey = `practice_week_${year}_W${week}`;
    return parseInt(localStorage.getItem(weekKey) || '0', 10);
  };
  const weeklyPracticeCount = getWeeklyPracticeCount();
  const isPracticeLimitReached = weeklyPracticeCount >= 3;

  // ─── Render ───────────────────────────────────────────────────────────────
  const pillars = [
    {
      key: 'srs',
      icon: '🔴',
      label: 'Revisão SRS',
      sublabel: srsReviewCount > 0 ? `${srsReviewCount} cartas para revisar` : 'Tudo em dia! ✓',
      desc: 'Revise os caracteres que você já conhece antes que os esqueça.',
      color: 'border-red-500/25 hover:border-red-500/50',
      accent: 'text-red-400',
      bg: 'bg-red-500/5',
      btnColor: 'bg-red-500/15 border-red-400/50 text-red-300 hover:bg-red-500/25',
      count: srsReviewCount,
      action: () => { onNavigate('learn'); markDone('srs'); },
      cta: 'Iniciar Revisão →',
    },
    {
      key: 'lesson',
      icon: '🟡',
      label: 'Lição do Dia',
      sublabel: `${lessonChars.length} novos ideogramas • HSK ${lessonHskLevel}`,
      desc: 'Aprenda novos ideogramas do seu nível atual de progressão.',
      color: 'border-gold-500/25 hover:border-gold-500/50',
      accent: 'text-gold-400',
      bg: 'bg-gold-500/5',
      btnColor: 'bg-gold-500/15 border-gold-400/50 text-gold-300 hover:bg-gold-500/25',
      count: lessonChars.length,
      action: () => setLessonModal(true),
      cta: 'Ver Lição →',
    },
    {
      key: 'practice',
      icon: '🟢',
      label: 'Praticar Frases',
      sublabel: isPracticeLimitReached ? 'Limite semanal atingido (3/3)' : `Praticado ${weeklyPracticeCount}/3 vezes esta semana`,
      desc: isPracticeLimitReached 
        ? 'Você atingiu o limite semanal de 3 sessões de prática de frases.' 
        : 'Pratique escrita e leitura com frases reais do nível do seu vocabulário.',
      color: 'border-jade-500/25 hover:border-jade-500/50',
      accent: 'text-jade-400',
      bg: 'bg-jade-500/5',
      btnColor: isPracticeLimitReached 
        ? 'bg-ink-800 border-white/10 text-ink-500 cursor-not-allowed'
        : 'bg-jade-500/15 border-jade-400/50 text-jade-300 hover:bg-jade-500/25',
      count: knownCards.length,
      action: () => { 
        if (isPracticeLimitReached) {
          alert('Você já atingiu o limite semanal de 3 práticas de frases.');
          return;
        }
        onNavigate('learn'); 
        markDone('practice'); 
      },
      cta: isPracticeLimitReached ? 'Limite Atingido' : 'Praticar →',
    },
    {
      key: 'grammar',
      icon: '🔵',
      label: 'Gramática',
      sublabel: grammarPoint.title,
      desc: `Estrutura: ${grammarPoint.structure}`,
      color: 'border-azure-500/25 hover:border-azure-500/50',
      accent: 'text-azure-400',
      bg: 'bg-azure-500/5',
      btnColor: 'bg-azure-500/15 border-azure-400/50 text-azure-300 hover:bg-azure-500/25',
      count: null,
      action: () => { setGrammarModal(true); markDone('grammar'); },
      cta: 'Ver Ponto →',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white font-display font-bold text-2xl">
              {selectedDate.toDateString() === new Date().toDateString() ? 'Bom estudo! 漢字' : 'Revisando Dia Passado 📅'}
            </h1>
            <p className="text-ink-400 font-body text-sm mt-0.5">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <span className="text-lg">🔥</span>
            <div className="text-right">
              <span className="text-orange-300 font-bold font-display text-lg">{streak}</span>
              <p className="text-orange-400/60 font-mono text-[9px] uppercase -mt-0.5">dias seguidos</p>
            </div>
          </div>
        </div>

        {/* ── Agenda / Calendário de Estudos ── */}
        <div className="bg-ink-900 border border-white/10 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-3.5">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider font-mono text-ink-300">
              Agenda de Estudos (Catch-up)
            </h3>
            {selectedDate.toDateString() !== new Date().toDateString() && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-[10px] text-azure-400 hover:text-azure-300 border border-azure-400/30 hover:border-azure-400 bg-azure-500/5 hover:bg-azure-500/10 px-2 py-0.5 rounded font-mono transition"
              >
                Voltar para Hoje ➔
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 gap-2.5">
            {last7Days.map((day) => {
              const dateStr = day.toDateString();
              const isSelected = selectedDate.toDateString() === dateStr;
              const isToday = today === dateStr;
              const dayCompletions = getCompletionsForDate(day);
              const isFullyDone = dayCompletions === 4;

              const pillarsList = ['srs', 'lesson', 'practice', 'grammar'];
              const dotColors = {
                srs: 'bg-red-400',
                lesson: 'bg-gold-400',
                practice: 'bg-jade-400',
                grammar: 'bg-azure-400',
              };

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center gap-2 py-2.5 px-1 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-azure-500 text-azure-300 bg-azure-500/10 shadow-[0_0_12px_rgba(59,130,246,0.15)] scale-105'
                      : isToday
                        ? 'border-white/20 text-white bg-white/5 hover:bg-white/10'
                        : 'border-transparent text-ink-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-85">
                    {getDayName(day)}
                  </span>
                  
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-sm font-bold border transition-all ${
                    isFullyDone
                      ? 'bg-jade-500/20 border-jade-500 text-jade-300'
                      : isToday
                        ? 'border-azure-400 text-azure-300 font-extrabold'
                        : 'border-white/10 text-ink-300'
                  }`}>
                    {day.getDate()}
                  </div>

                  {/* 4 mini dots for the pillars */}
                  <div className="flex gap-1 justify-center mt-0.5">
                    {pillarsList.map((p) => {
                      const completed = !!dailyDone[dateStr + ':' + p];
                      return (
                        <div
                          key={p}
                          title={`${p.toUpperCase()} ${completed ? 'Concluído' : 'Pendente'}`}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            completed ? dotColors[p] : 'bg-ink-700'
                          }`}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Progresso do Dia ── */}
        <div className="bg-ink-900 border border-white/8 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-ink-300 font-mono text-xs uppercase tracking-wider">
              {selectedDate.toDateString() === new Date().toDateString() ? 'Progresso de Hoje' : 'Progresso do Dia'}
            </span>
            <span className="text-white font-bold font-mono text-sm">{doneCount}/4 pilares</span>
          </div>
          <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-azure-500 to-jade-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            {['srs', 'lesson', 'practice', 'grammar'].map((k, i) => {
              const labels = ['🔴', '🟡', '🟢', '🔵'];
              return (
                <div
                  key={k}
                  className={`flex-1 h-1 rounded-full transition-all duration-500 ${isDone(k) ? 'bg-jade-400' : 'bg-ink-700'}`}
                />
              );
            })}
          </div>

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Coleção', value: loading ? '…' : knownCards.length, sub: 'ideogramas', icon: '📚' },
              { label: 'Nível HSK', value: `HSK ${hskLevel}`, sub: 'estimado', icon: '🏮' },
              { label: 'Para Revisar', value: loading ? '…' : srsReviewCount, sub: 'cartas SRS', icon: '♻️' },
            ].map(stat => (
              <div key={stat.label} className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
                <span className="text-lg">{stat.icon}</span>
                <p className="text-white font-bold font-display text-xl mt-1">{stat.value}</p>
                <p className="text-ink-500 font-mono text-[9px] uppercase">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4 Pilares ── */}
        <div>
          <h2 className="text-ink-300 font-mono text-xs uppercase tracking-wider mb-4">Pilares de Hoje</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pillars.map(p => (
              <div
                key={p.key}
                className={`relative flex flex-col gap-3 p-5 rounded-2xl bg-ink-900 border transition-all duration-200 ${p.color} ${isDone(p.key) ? 'opacity-60' : ''}`}
              >
                {isDone(p.key) && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-jade-500/20 border border-jade-500/40 flex items-center justify-center">
                    <span className="text-jade-400 text-xs">✓</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <h3 className={`font-bold font-display text-base ${p.accent}`}>{p.label}</h3>
                    <p className="text-ink-400 font-mono text-[10px] truncate max-w-[200px]">{p.sublabel}</p>
                  </div>
                </div>
                <p className="text-ink-400 text-xs font-body leading-relaxed">{p.desc}</p>
                <button
                  onClick={p.action}
                  className={`mt-auto px-4 py-2 rounded-lg text-xs font-bold font-mono border transition-all self-start ${p.btnColor}`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pré-visualização Gramática ── */}
        <div
          className="bg-ink-900 border border-azure-500/15 rounded-2xl p-5 cursor-pointer hover:border-azure-500/35 transition group"
          onClick={() => { setGrammarModal(true); markDone('grammar'); }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="text-[10px] text-azure-400 font-mono uppercase tracking-widest">HSK {grammarPoint.hsk} — Gramática do Dia</span>
              <h3 className="text-white font-display font-bold text-base mt-1">{grammarPoint.title}</h3>
              <p className="text-gold-300 font-mono text-xs mt-1.5 bg-gold-500/5 border border-gold-500/15 inline-block px-2 py-0.5 rounded">
                {grammarPoint.structure}
              </p>
              {grammarPoint.examples[0] && (
                <p className="text-ink-300 text-sm font-display mt-2">
                  "{grammarPoint.examples[0].chinese}"
                  <span className="text-ink-500 text-xs font-body font-normal ml-2 italic">{grammarPoint.examples[0].translation}</span>
                </p>
              )}
            </div>
            <span className="text-2xl group-hover:scale-110 transition-transform">🔵</span>
          </div>
        </div>

        {/* Atribuição */}
        <p className="text-center text-[10px] text-ink-700 font-mono pb-4">
          Gramática: Chinese Grammar Wiki © AllSet Learning — CC BY-NC-SA 3.0 •{' '}
          <a href="https://resources.allsetlearning.com/chinese/grammar/" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-500 transition">
            resources.allsetlearning.com
          </a>
        </p>
      </div>

      {/* Modals */}
      {grammarModal && (
        <GrammarModal point={grammarPoint} onClose={() => setGrammarModal(false)} />
      )}
      {lessonModal && (
        <LessonModal
          chars={lessonChars}
          knownChars={knownSet}
          onLearn={handleLearnChar}
          onClose={() => { setLessonModal(false); markDone('lesson'); loadCards(); }}
        />
      )}
    </div>
  );
}
