import React, { useState, useEffect, useCallback, useRef } from 'react';
import { hanziData } from '@/data/hanziData.js';
import { grammarData } from '@/data/grammarData.js';
import useStore from '../store/useStore';
import HanziWriter from 'hanzi-writer';

// ─── Dados estáticos ─────────────────────────────────────────────────────────
const hanziMap = new Map(hanziData.map(h => [h.id, h]));
const hskLevels = [1, 2, 3, 4, 5, 6];
const HSK_COLORS = {
  1: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#93c5fd', dot: '#3b82f6' },
  2: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#6ee7b7', dot: '#10b981' },
  3: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fcd34d', dot: '#f59e0b' },
  4: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#fca5a5', dot: '#ef4444' },
  5: { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)', text: '#d8b4fe', dot: '#a855f7' },
  6: { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)', text: '#f9a8d4', dot: '#ec4899' },
};

// ─── Grammar Modal (replicado do Home.jsx) ────────────────────────────────────
function GrammarModal({ point, onClose, isCompleted, onComplete }) {
  if (!point) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-ink-900 border border-azure-500/30 rounded-2xl shadow-2xl shadow-azure-500/10 flex flex-col gap-0 overflow-hidden max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-azure-500/10 border-b border-azure-500/20 px-6 py-4 flex justify-between items-start shrink-0">
          <div>
            <span className="text-[10px] text-azure-400 font-mono uppercase tracking-widest">HSK {point.hsk} — Gramática</span>
            <h2 className="text-white font-display font-bold text-base mt-0.5 leading-tight">{point.title}</h2>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-white transition text-xl font-bold">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div>
            <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Estrutura</span>
            <p className="text-gold-300 font-mono text-sm font-bold bg-gold-500/5 border border-gold-500/15 rounded-lg px-3 py-2 mt-1">{point.structure}</p>
          </div>
          {point.explanation && (
            <div className="border-t border-white/5 pt-4">
              <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Explicação</span>
              <p className="text-ink-200 text-sm font-body leading-relaxed whitespace-pre-line mt-1">{point.explanation}</p>
            </div>
          )}
          <div className="border-t border-white/5 pt-4">
            <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Exemplos</span>
            <div className="flex flex-col gap-2 mt-1">
              {point.examples.map((ex, i) => (
                <div key={i} className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-white font-display text-xl font-bold">{ex.chinese}</p>
                  <p className="text-azure-300 font-mono text-xs mt-1">{ex.pinyin}</p>
                  <p className="text-ink-300 text-xs font-body mt-1 italic">"{ex.translation}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-black/20 shrink-0 flex-wrap gap-3">
          <a href={point.url} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-azure-400 hover:text-azure-300 font-mono transition underline underline-offset-2">
            Ver no Grammar Wiki ↗
          </a>
          {isCompleted ? (
            <span className="px-3 py-1.5 rounded-lg bg-jade-500/10 border border-jade-500/30 text-jade-400 text-xs font-bold font-mono">
              Concluído
            </span>
          ) : (
            <button
              onClick={() => { onComplete(point.title); onClose(); }}
              className="px-4 py-1.5 rounded-lg bg-azure-500 hover:bg-azure-600 text-white text-xs font-bold font-mono transition border border-azure-400"
            >
              Concluir Leitura
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Char Add Modal (desenha e adiciona à coleção) ───────────────────────────
function AddCharModal({ char, onClose, onAdded }) {
  const { user } = useStore();
  const writerDivRef = useRef(null);
  const writerRef = useRef(null);
  const [status, setStatus] = useState('drawing'); // 'drawing' | 'success' | 'adding'
  const hInfo = hanziMap.get(char);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!writerDivRef.current) return;
      writerDivRef.current.innerHTML = '';
      const w = HanziWriter.create(writerDivRef.current, char, {
        width: 180, height: 180, padding: 16,
        showOutline: true, showCharacter: false,
        strokeColor: '#10b981', outlineColor: 'rgba(255,255,255,0.15)',
        drawingColor: '#10b981', drawingWidth: 6,
      });
      writerRef.current = w;
      setTimeout(() => {
        const svg = writerDivRef.current?.querySelector('svg');
        if (svg) {
          svg.style.pointerEvents = 'auto';
          svg.style.touchAction = 'none';
          svg.style.cursor = 'crosshair';
          svg.querySelectorAll('*').forEach(el => { el.style.pointerEvents = 'auto'; });
        }
        w.quiz({
          onMistake: () => {},
          onComplete: () => setStatus('success'),
        });
      }, 80);
    }, 50);
    return () => clearTimeout(t);
  }, [char]);

  const handleAdd = async () => {
    if (!user?.id) return;
    setStatus('adding');
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, char }),
      });
      const data = await res.json();
      if (data.success) { onAdded(char); onClose(); }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSkipAndAdd = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, char }),
      });
      const data = await res.json();
      if (data.success) { onAdded(char); onClose(); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-ink-900 border border-jade-500/30 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-jade-500/10 border-b border-jade-500/20 px-5 py-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-jade-400 font-mono uppercase tracking-widest">Adicionar à coleção</span>
            <h2 className="text-white font-display font-bold text-lg flex items-center gap-2">
              <span className="text-3xl font-serif">{char}</span>
              {hInfo && <span className="text-sm text-ink-300 font-normal">· {hInfo.pinyin} · {hInfo.meaning}</span>}
            </h2>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-white text-xl font-bold">×</button>
        </div>
        <div className="p-5 flex flex-col items-center gap-4">
          {status !== 'success' && (
            <p className="text-xs text-ink-400 font-body text-center">Desenhe o caractere para adicioná-lo à sua coleção</p>
          )}
          <div ref={writerDivRef} style={{ width: 180, height: 180, borderRadius: 12,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden', display: status === 'success' ? 'none' : 'block' }} />
          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="text-5xl font-serif text-jade-400" style={{ textShadow: '0 0 20px rgba(16,185,129,0.4)' }}>{char}</div>
              <span className="text-jade-300 font-mono text-sm">Perfeito!</span>
            </div>
          )}
          <div className="flex gap-2 w-full">
            <button onClick={handleSkipAndAdd}
              className="flex-1 py-2 rounded-lg text-xs font-mono text-ink-400 border border-white/10 hover:border-white/20 transition">
              Adicionar sem desenhar
            </button>
            {status === 'success' && (
              <button onClick={handleAdd}
                className="flex-1 py-2 rounded-lg text-xs font-bold font-mono text-white bg-jade-500 hover:bg-jade-600 transition">
                Adicionar à coleção
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function UserProfile() {
  const { user } = useStore();
  const [knownCards, setKnownCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vocab'); // 'vocab' | 'grammar'
  const [vocabHskLevel, setVocabHskLevel] = useState(1);
  const [grammarHskLevel, setGrammarHskLevel] = useState(1);
  const [grammarModal, setGrammarModal] = useState(null);
  const [addModal, setAddModal] = useState(null);
  const [completedGrammar, setCompletedGrammar] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rami_grammar_done') || '{}'); }
    catch { return {}; }
  });
  const persistActivity = useStore(state => state.persistActivity);

  const loadCards = useCallback(() => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/cards/${user.id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setKnownCards(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const knownSet = new Set(knownCards.map(c => c.char));

  // ── HSK Progress summary ──
  const hskProgress = hskLevels.map(lvl => {
    const total = hanziData.filter(h => h.hsk === lvl).length;
    const known = knownCards.filter(c => { const h = hanziMap.get(c.char); return h && h.hsk === lvl; }).length;
    return { lvl, total, known, pct: total > 0 ? Math.round((known / total) * 100) : 0 };
  });

  // ── Vocab grid for selected level ──
  const vocabChars = hanziData.filter(h => h.hsk === vocabHskLevel);

  // ── Grammar for selected level ──
  const grammarPoints = grammarData.filter(g => g.hsk === grammarHskLevel);

  const handleGrammarComplete = (title) => {
    const updated = { ...completedGrammar, [title]: true };
    setCompletedGrammar(updated);
    localStorage.setItem('rami_grammar_done', JSON.stringify(updated));
    // Persiste no banco em background
    persistActivity({ grammar_done: updated }).catch(() => {});
  };

  const handleCharAdded = (char) => {
    setKnownCards(prev => [...prev, { char }]);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ink-950 text-jade-300 font-mono text-sm">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 bg-ink-900 border border-white/8 rounded-2xl p-5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-vermillion-600 to-orange-400 flex items-center justify-center text-2xl font-serif text-white shadow-lg">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-xl">{user?.username || 'Estudante'}</h1>
            <p className="text-ink-400 text-xs mt-0.5 font-mono">
              {knownCards.length} caracteres conhecidos
            </p>
          </div>
        </div>

        {/* ── HSK Progress Overview ── */}
        <div className="bg-ink-900 border border-white/8 rounded-2xl p-5">
          <h2 className="text-white font-display font-bold text-sm mb-4 uppercase tracking-widest text-ink-400">Progresso por Nível</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {hskProgress.map(({ lvl, total, known, pct }) => {
              const c = HSK_COLORS[lvl];
              return (
                <div key={lvl} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '12px 10px' }}
                  className="flex flex-col items-center gap-2">
                  <span style={{ fontSize: 10, color: c.text, fontFamily: 'monospace', letterSpacing: '0.08em' }}>HSK {lvl}</span>
                  {/* Radial-ish progress ring */}
                  <div style={{ position: 'relative', width: 48, height: 48 }}>
                    <svg viewBox="0 0 36 36" style={{ width: 48, height: 48, transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={c.dot} strokeWidth="3"
                        strokeDasharray={`${pct * 0.942} 94.2`} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                    </svg>
                    <span style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: c.text,
                    }}>{pct}%</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{known}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 bg-ink-900 border border-white/8 rounded-2xl p-1.5">
          {[
            { key: 'vocab',   label: 'Vocabulário',        sub: 'Caracteres HSK' },
            { key: 'grammar', label: 'Wiki de Gramática',   sub: 'Pontos de Gramática' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex flex-col items-start px-4 py-2.5 rounded-xl transition-all ${
                activeTab === t.key
                  ? 'bg-white/8 text-white'
                  : 'text-ink-500 hover:text-ink-300 hover:bg-white/4'
              }`}>
              <span className="text-sm font-bold font-display">{t.label}</span>
              <span className="text-[10px] font-mono opacity-60 mt-0.5">{t.sub}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: VOCABULÁRIO
        ══════════════════════════════════════════ */}
        {activeTab === 'vocab' && (
          <div className="bg-ink-900 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
            {/* Level picker */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-ink-400 font-mono uppercase tracking-widest shrink-0">Nível:</span>
              <div className="flex gap-1.5 flex-wrap">
                {hskLevels.map(lvl => {
                  const c = HSK_COLORS[lvl];
                  const { known, total } = hskProgress.find(p => p.lvl === lvl);
                  return (
                    <button key={lvl} onClick={() => setVocabHskLevel(lvl)}
                      style={{
                        background: vocabHskLevel === lvl ? c.bg : 'transparent',
                        border: `1px solid ${vocabHskLevel === lvl ? c.border : 'rgba(255,255,255,0.08)'}`,
                        color: vocabHskLevel === lvl ? c.text : '#57534e',
                        borderRadius: 8, padding: '4px 12px', fontSize: 12,
                        fontFamily: 'monospace', cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                      HSK {lvl}
                      <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>{known}/{total}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats bar */}
            {(() => {
              const { known, total, pct } = hskProgress.find(p => p.lvl === vocabHskLevel);
              const c = HSK_COLORS[vocabHskLevel];
              return (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono" style={{ color: c.text }}>
                    <span>{known} de {total} aprendidos</span>
                    <span className="font-bold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%`, background: c.dot, height: '100%', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })()}

            {/* Character grid */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {vocabChars.map(h => {
                const isKnown = knownSet.has(h.id);
                const c = HSK_COLORS[vocabHskLevel];
                return (
                  <button
                    key={h.id}
                    onClick={() => !isKnown && setAddModal(h.id)}
                    title={isKnown ? `${h.pinyin} · ${h.meaning} ✓` : `${h.pinyin} · ${h.meaning} — clique para adicionar`}
                    style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: isKnown ? c.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isKnown ? c.border : 'rgba(255,255,255,0.07)'}`,
                      cursor: isKnown ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontFamily: 'serif',
                      color: isKnown ? c.text : '#3a3835',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isKnown) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#78716c'; } }}
                    onMouseLeave={e => { if (!isKnown) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#3a3835'; } }}
                  >
                    {h.id}
                    {isKnown && (
                      <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 7, color: c.dot, fontFamily: 'monospace' }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-ink-600 font-body mt-1">
              Caracteres em cinza ainda não foram adicionados — clique para aprender e adicionar à sua coleção.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: GRAMÁTICA
        ══════════════════════════════════════════ */}
        {activeTab === 'grammar' && (
          <div className="bg-ink-900 border border-white/8 rounded-2xl p-5 flex flex-col gap-4">
            {/* Level picker */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-ink-400 font-mono uppercase tracking-widest shrink-0">Nível:</span>
              <div className="flex gap-1.5 flex-wrap">
                {hskLevels.map(lvl => {
                  const count = grammarData.filter(g => g.hsk === lvl).length;
                  const done = grammarData.filter(g => g.hsk === lvl && completedGrammar[g.title]).length;
                  return (
                    <button key={lvl} onClick={() => setGrammarHskLevel(lvl)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono transition border ${
                        grammarHskLevel === lvl
                          ? 'bg-azure-500/15 border-azure-500/40 text-azure-300'
                          : 'bg-transparent border-white/8 text-ink-500 hover:border-white/15 hover:text-ink-300'
                      }`}>
                      HSK {lvl}
                      <span className="ml-1.5 opacity-50">{done}/{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress bar */}
            {(() => {
              const total = grammarPoints.length;
              const done = grammarPoints.filter(g => completedGrammar[g.title]).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono text-azure-400">
                    <span>{done} de {total} pontos estudados</span>
                    <span className="font-bold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full bg-azure-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Grammar cubes grid */}
            <div className="flex flex-wrap gap-2 mt-1">
              {grammarPoints.map((g, i) => {
                const done = !!completedGrammar[g.title];
                return (
                  <button
                    key={i}
                    onClick={() => setGrammarModal(g)}
                    title={g.title}
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-150 group ${
                      done
                        ? 'bg-azure-500/15 border-azure-500/35 text-azure-300 hover:bg-azure-500/25'
                        : 'bg-white/3 border-white/7 text-ink-500 hover:bg-white/6 hover:border-white/15 hover:text-ink-300'
                    }`}
                    style={{ width: 56, height: 56 }}
                  >
                    <span className="text-[10px] font-mono font-bold opacity-60">#{i + 1}</span>
                    {done && (
                      <span className="text-[14px] leading-none">✓</span>
                    )}
                    {!done && (
                      <span className="text-[11px] leading-none opacity-40 group-hover:opacity-70 transition">
                        {g.structure?.split('+')?.[0]?.trim()?.slice(0, 3) || '···'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-ink-600 font-body mt-1">
              Clique em qualquer cubo para abrir o ponto de gramática. Os verdes já foram estudados.
            </p>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      {grammarModal && (
        <GrammarModal
          point={grammarModal}
          onClose={() => setGrammarModal(null)}
          isCompleted={!!completedGrammar[grammarModal.title]}
          onComplete={handleGrammarComplete}
        />
      )}
      {addModal && (
        <AddCharModal
          char={addModal}
          onClose={() => setAddModal(null)}
          onAdded={handleCharAdded}
        />
      )}
    </div>
  );
}
