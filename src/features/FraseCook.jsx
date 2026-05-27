/**
 * FraseCook.jsx — Modo Frase (Word Cookies com hanzi)
 *
 * Mecânica: tiles de hanzi embaixo, frases com slots vazios em cima.
 * O jogador toca os hanzi na ordem certa para preencher cada frase.
 * Caracteres podem se repetir no pool (gerado com base nas frases).
 *
 * Props:
 *   hskLevel  {number}  nível máximo HSK (default: 1)
 *   context   {string}  tag temática ex: 'cozinha', 'natureza' (default: null = misto)
 *   phraseCount {number} quantas frases por rodada (default: 4)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { phraseData } from '../../api/_data/phraseData.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Filtra frases por HSK e contexto. Prioriza frases cujos chars existem no HSK <= level.
function selectPhrases(hskLevel, context, count) {
  let pool = phraseData.filter(p => p.hsk <= hskLevel);

  // filtro de contexto via array de tags definido no phraseData
  if (context) {
    const filtered = pool.filter(p => p.tags?.includes(context));
    if (filtered.length >= count) pool = filtered;
  }

  // Prefere frases com 2–4 chars (mais jogáveis)
  const sized = pool.filter(p => p.chars.length >= 2 && p.chars.length <= 4);
  const source = sized.length >= count ? sized : pool;

  return shuffle(source).slice(0, count);
}

// Gera o pool de tiles: todos os chars das frases + distractores aleatórios
// Garante que chars repetidos nas frases aparecem N vezes no pool.
function buildTilePool(phrases, hskLevel) {
  // Conta quantas vezes cada char é necessário (máximo entre todas as frases)
  const needed = {};
  phrases.forEach(p => {
    const freq = {};
    p.chars.forEach(c => { freq[c] = (freq[c] || 0) + 1; });
    Object.entries(freq).forEach(([c, n]) => {
      needed[c] = Math.max(needed[c] || 0, n);
    });
  });

  // Expande em array
  const required = [];
  Object.entries(needed).forEach(([c, n]) => {
    for (let i = 0; i < n; i++) required.push(c);
  });

  // Adiciona 3–5 distractores do mesmo HSK que não estejam nas frases
  const usedSet = new Set(Object.keys(needed));
  const distractors = phraseData
    .filter(p => p.hsk <= hskLevel)
    .flatMap(p => p.chars)
    .filter(c => !usedSet.has(c));
  const uniq = [...new Set(distractors)];
  const extras = shuffle(uniq).slice(0, 4);

  const allChars = shuffle([...required, ...extras]);
  return allChars.map((char, i) => ({ id: `tile_${i}_${char}`, char, used: false }));
}

// ─── Componente ──────────────────────────────────────────────────────────────

const CONTEXTS = [
  { key: null,       label: '全部',   emoji: '✦' },
  { key: 'cozinha',  label: '厨房',   emoji: '🍚' },
  { key: 'natureza', label: '自然',   emoji: '山' },
  { key: 'pessoas',  label: '人物',   emoji: '人' },
  { key: 'estudo',   label: '学习',   emoji: '书' },
  { key: 'casa',     label: '家',     emoji: '门' },
];

const HSK_LEVELS = [1, 2, 3];

export default function FraseCook({ initialHsk = 1, initialContext = null }) {
  const [hskLevel, setHskLevel]     = useState(initialHsk);
  const [context, setContext]       = useState(initialContext);
  const [phrases, setPhrases]       = useState([]);
  const [tiles, setTiles]           = useState([]);
  const [selected, setSelected]     = useState([]); // [{id, char}]
  const [solved, setSolved]         = useState(new Set());
  const [flash, setFlash]           = useState(null); // {idx, type: 'correct'|'wrong'}
  const [score, setScore]           = useState(0);
  const [shakePool, setShakePool]   = useState(false);
  const [complete, setComplete]     = useState(false);
  const [hints, setHints]           = useState(3);
  const [hintReveal, setHintReveal] = useState(null); // phraseIdx
  const [round, setRound]           = useState(1);
  const shakeTimer = useRef(null);
  const hintTimer  = useRef(null);

  // ─── Inicializa rodada ──────────────────────────────────────────────────────
  const initRound = useCallback(() => {
    const ps = selectPhrases(hskLevel, context, 4);
    const ts = buildTilePool(ps, hskLevel);
    setPhrases(ps);
    setTiles(ts);
    setSelected([]);
    setSolved(new Set());
    setFlash(null);
    setComplete(false);
    setHintReveal(null);
  }, [hskLevel, context]);

  useEffect(() => { initRound(); }, [initRound]);

  // ─── Verifica conclusão ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phrases.length > 0 && solved.size === phrases.length) {
      setTimeout(() => setComplete(true), 700);
    }
  }, [solved, phrases]);

  // ─── Seleciona tile ─────────────────────────────────────────────────────────
  function selectTile(tile) {
    if (tile.used) return;

    // Deseleciona se já selecionado
    if (selected.find(s => s.id === tile.id)) {
      setSelected(prev => prev.filter(s => s.id !== tile.id));
      return;
    }

    const next = [...selected, tile];
    setSelected(next);
    tryMatch(next);
  }

  function tryMatch(sel) {
    const chars = sel.map(s => s.char);

    for (let i = 0; i < phrases.length; i++) {
      if (solved.has(i)) continue;
      const phrase = phrases[i];

      if (chars.length === phrase.chars.length &&
          chars.every((c, idx) => c === phrase.chars[idx])) {
        // ✅ Acerto
        setSolved(prev => new Set([...prev, i]));
        setFlash({ idx: i, type: 'correct' });
        setScore(s => s + phrase.chars.length * 15);
        setTiles(prev => prev.map(t =>
          sel.find(s => s.id === t.id) ? { ...t, used: true } : t
        ));
        setSelected([]);
        setTimeout(() => setFlash(null), 900);
        return;
      }
    }

    // Se chegou no máximo de chars sem acertar nada
    const maxUnsolved = Math.max(
      ...phrases.filter((_, i) => !solved.has(i)).map(p => p.chars.length),
      0
    );
    if (sel.length >= maxUnsolved) {
      // ❌ Erro
      setFlash({ idx: -1, type: 'wrong' });
      setShakePool(true);
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => {
        setShakePool(false);
        setFlash(null);
        setSelected([]);
      }, 550);
    }
  }

  function useHint() {
    if (hints <= 0) return;
    const idx = phrases.findIndex((_, i) => !solved.has(i));
    if (idx === -1) return;
    setHints(h => h - 1);
    setHintReveal(idx);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintReveal(null), 2500);
  }

  function reshuffleTiles() {
    setTiles(prev => shuffle([...prev]));
    setSelected([]);
  }

  function nextRound() {
    setRound(r => r + 1);
    setHints(3);
    initRound();
  }

  const selectedIds = new Set(selected.map(s => s.id));

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-ink-950 overflow-hidden select-none">

      {/* ── Controles de filtro ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.06] shrink-0">
        {/* HSK */}
        <div className="flex gap-1">
          {HSK_LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setHskLevel(lvl)}
              className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition-all border ${
                hskLevel === lvl
                  ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                  : 'bg-white/5 border-white/10 text-ink-400 hover:text-ink-200'
              }`}
            >
              HSK{lvl}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Contexto */}
        <div className="flex gap-1 overflow-x-auto">
          {CONTEXTS.map(ctx => (
            <button
              key={ctx.key || 'all'}
              onClick={() => setContext(ctx.key)}
              className={`px-2.5 py-1 rounded text-xs font-bold font-display transition-all border whitespace-nowrap ${
                context === ctx.key
                  ? 'bg-vermillion-500/10 border-vermillion-500/40 text-vermillion-400'
                  : 'bg-white/5 border-white/10 text-ink-400 hover:text-ink-200'
              }`}
            >
              {ctx.emoji} {ctx.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-gold-400 font-mono text-sm font-bold">{score}</span>
          <span className="text-ink-500 text-xs">pts</span>
          <span className="text-ink-600 text-xs border border-white/10 px-2 py-0.5 rounded font-mono">R{round}</span>
        </div>
      </div>

      {/* ── Board de frases ── */}
      <div className="flex-1 flex flex-col justify-center gap-3 px-5 py-4 overflow-y-auto">
        {phrases.map((phrase, pi) => {
          const isSolved    = solved.has(pi);
          const isCorrect   = flash?.idx === pi && flash.type === 'correct';
          const isHinted    = hintReveal === pi;

          return (
            <div key={`${phrase.phrase}_${pi}`} className="flex items-center gap-3">
              {/* Indicador lateral */}
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300 ${
                isSolved ? 'bg-jade-500' : 'bg-white/10'
              }`} />

              {/* Slots */}
              <div className="flex gap-2 flex-wrap">
                {phrase.chars.map((char, ci) => (
                  <div
                    key={ci}
                    className={`
                      w-11 h-11 rounded-lg flex items-center justify-center
                      font-display text-xl font-bold
                      transition-all duration-200
                      ${isCorrect
                        ? 'border-2 border-jade-500/70 bg-jade-600/10 text-jade-300'
                        : isSolved
                          ? 'border border-jade-600/30 bg-jade-600/05 text-jade-400/80'
                          : 'border border-white/10 bg-ink-800/60 text-transparent'
                      }
                    `}
                    style={isCorrect ? { boxShadow: '0 0 10px rgba(16,185,129,0.2)' } : {}}
                  >
                    {isSolved || isHinted
                      ? char
                      : <div className="w-4 h-0.5 bg-white/15 rounded" />
                    }
                  </div>
                ))}
              </div>

              {/* Tradução — aparece ao resolver ou com hint */}
              <div className={`text-xs font-body transition-all duration-300 ${
                isSolved
                  ? 'text-ink-400 opacity-100'
                  : isHinted
                    ? 'text-gold-500/60 opacity-100'
                    : 'opacity-0'
              }`}>
                {phrase.translation}
              </div>
            </div>
          );
        })}

        {/* Preview selecionados */}
        <div className="flex items-center gap-2 min-h-[36px] mt-2">
          {selected.length > 0 ? (
            <>
              {selected.map(s => (
                <span
                  key={s.id}
                  className="font-display text-lg font-bold text-gold-300 border border-gold-500/30 bg-gold-500/08 rounded-lg w-9 h-9 flex items-center justify-center"
                  style={{ animation: 'fadeUp 0.12s ease' }}
                >
                  {s.char}
                </span>
              ))}
              <button
                onClick={() => setSelected([])}
                className="text-xs text-ink-500 hover:text-ink-300 ml-1 transition-colors"
              >
                ✕
              </button>
            </>
          ) : (
            <span className="text-xs text-ink-600 font-body">
              {flash?.type === 'wrong'
                ? '✕ ordem incorreta'
                : 'toque os hanzi em ordem →'
              }
            </span>
          )}
        </div>
      </div>

      {/* ── Pool de tiles ── */}
      <div className="shrink-0 border-t border-white/[0.06] bg-ink-900 px-4 pt-5 pb-6">
        <div
          className="flex flex-wrap gap-3 justify-center mb-4"
          style={{ animation: shakePool ? 'shake 0.5s ease' : 'none' }}
        >
          {tiles.map(tile => {
            const isSel  = selectedIds.has(tile.id);
            const isUsed = tile.used;

            return (
              <button
                key={tile.id}
                onClick={() => selectTile(tile)}
                disabled={isUsed}
                className={`
                  w-13 h-13 rounded-xl font-display text-2xl font-bold
                  transition-all duration-150
                  ${isUsed
                    ? 'opacity-20 cursor-default border border-white/05 bg-transparent text-ink-600'
                    : isSel
                      ? 'border-2 border-gold-400 bg-gold-500/15 text-gold-200 -translate-y-1.5 shadow-lg'
                      : 'border border-white/15 bg-ink-800 text-ink-100 hover:bg-ink-700 hover:border-white/25 active:scale-95'
                  }
                `}
                style={{
                  width: '52px', height: '52px',
                  boxShadow: isSel ? '0 4px 14px rgba(217,119,6,0.2)' : undefined,
                }}
              >
                {tile.char}
              </button>
            );
          })}
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={reshuffleTiles}
            className="px-3 py-1.5 rounded-full text-xs font-body text-ink-400 border border-white/10 hover:border-white/20 hover:text-ink-200 transition-all"
          >
            ↺ embaralhar
          </button>
          <button
            onClick={useHint}
            disabled={hints <= 0}
            className={`px-3 py-1.5 rounded-full text-xs font-body border transition-all ${
              hints > 0
                ? 'text-gold-400 border-gold-500/25 hover:border-gold-500/50 hover:text-gold-300'
                : 'text-ink-600 border-white/05 cursor-default'
            }`}
          >
            💡 dica ({hints})
          </button>
        </div>
      </div>

      {/* ── Overlay de conclusão ── */}
      {complete && (
        <div className="absolute inset-0 z-20 bg-ink-950/92 flex flex-col items-center justify-center gap-4">
          <div className="font-display text-5xl text-gold-400 animate-pulse">完</div>
          <div className="text-xl font-display font-bold tracking-widest text-ink-100">完成！</div>
          <div className="text-sm font-body text-ink-400">
            +{phrases.reduce((s, p) => s + p.chars.length * 15, 0)} pontos nesta rodada
          </div>
          <button
            onClick={nextRound}
            className="mt-4 px-8 py-3 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 font-bold font-body text-sm tracking-wider hover:bg-gold-500/25 transition-all"
          >
            PRÓXIMA RODADA →
          </button>
          <button
            onClick={() => { setComplete(false); initRound(); }}
            className="text-xs text-ink-500 hover:text-ink-300 font-body transition-colors"
          >
            ↺ jogar de novo
          </button>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-7px); }
          40%      { transform: translateX(7px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}
