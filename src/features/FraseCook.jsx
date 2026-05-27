/**
 * FraseCook.jsx — Modo Frase (Word Cookies com hanzi)
 *
 * Mecânica: tiles de hanzi embaixo, frases com slots vazios em cima.
 * O jogador recebe 5 tiles fixos e precisa descobrir todas as frases 
 * possíveis formadas a partir de combinações desses caracteres (tipo Word Cookies).
 *
 * Props:
 *   hskLevel  {number}  nível máximo HSK (default: 1)
 *   context   {string}  tag temática ex: 'cozinha', 'natureza' (default: null = misto)
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

// Descobre TODAS as frases que podem ser montadas apenas com a contagem de tiles disponíveis
function findAllPhrases(tiles, pool) {
  const tileFreq = {};
  tiles.forEach(t => tileFreq[t] = (tileFreq[t] || 0) + 1);

  return pool.filter(p => {
    if (p.chars.length < 2) return false; // Ignora caracteres soltos, apenas frases
    const pFreq = {};
    for (let c of p.chars) pFreq[c] = (pFreq[c] || 0) + 1;
    
    for (let c in pFreq) {
      if (!tileFreq[c] || tileFreq[c] < pFreq[c]) return false;
    }
    return true;
  });
}

// Gera uma rodada: 5 tiles e todas as frases possíveis com eles
function generateRound(hskLevel, context) {
  let pool = phraseData.filter(p => p.hsk <= hskLevel);
  if (pool.length === 0) pool = phraseData; // fallback

  if (context) {
    const filtered = pool.filter(p => p.tags?.includes(context));
    if (filtered.length >= 2) pool = filtered;
  }

  let bestTiles = [];
  let bestPhrases = [];

  // Tenta encontrar uma combinação que gere entre 3 e 7 palavras
  for (let attempt = 0; attempt < 50; attempt++) {
    const seed = pool[Math.floor(Math.random() * pool.length)];
    let tiles = [...seed.chars];

    // Preenche até ter 5 tiles
    while (tiles.length < 5) {
      const rp = pool[Math.floor(Math.random() * pool.length)];
      tiles.push(rp.chars[Math.floor(Math.random() * rp.chars.length)]);
    }

    tiles = shuffle(tiles).slice(0, 5);
    const validPhrases = findAllPhrases(tiles, pool);

    if (validPhrases.length >= 3 && validPhrases.length <= 7) {
      validPhrases.sort((a, b) => a.chars.length - b.chars.length || a.phrase.localeCompare(b.phrase));
      return { tiles: tiles.map((char, i) => ({ id: `t_${i}`, char })), phrases: validPhrases };
    }

    if (validPhrases.length > bestPhrases.length && validPhrases.length <= 10) {
      bestTiles = tiles;
      bestPhrases = validPhrases;
    }
  }

  bestPhrases.sort((a, b) => a.chars.length - b.chars.length || a.phrase.localeCompare(b.phrase));
  if (bestPhrases.length > 7) bestPhrases = bestPhrases.slice(0, 7); // Cap máximo visual
  
  return {
    tiles: bestTiles.map((char, i) => ({ id: `t_${i}`, char })),
    phrases: bestPhrases
  };
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
  const [flash, setFlash]           = useState(null); // {idx, type: 'correct'|'wrong', msg}
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
    const round = generateRound(hskLevel, context);
    setPhrases(round.phrases);
    setTiles(round.tiles);
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
              <div className={`text-xs font-body tracking-wide transition-all duration-300 ${
                isSolved || isHinted ? 'text-ink-400 opacity-100' : 'opacity-0 h-0 overflow-hidden'
              }`}>
                {phrase.translation}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Preview selecionados e controles ── */}
      <div className="flex flex-col items-center shrink-0 min-h-[80px] justify-end pb-4 bg-ink-950">
        <div className={`text-xs font-bold transition-opacity mb-2 ${flash?.type === 'wrong' ? 'text-red-400 opacity-100' : 'opacity-0'}`}>
          {flash?.msg || ' '}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 justify-center border-b-2 border-white/10 pb-2 min-w-[150px] px-4">
            {selected.length === 0 ? (
              <span className="text-ink-600 text-sm font-body italic my-auto">Toque para formar palavra</span>
            ) : (
              {selected.map(s => (
                <button
                  key={s.id}
                  onClick={() => deselectTile(s.id)}
                  className="w-10 h-10 rounded-lg bg-gold-500/15 border border-gold-500/40 text-gold-300 font-display text-xl flex items-center justify-center transform hover:scale-105 transition-all shadow-md"
                >
                  {s.char}
                </button>
              ))}
            )}
          </div>
          
          {/* Botões de Confirmação */}
          {selected.length > 0 && (
            <div className="flex gap-1.5 shrink-0">
              <button onClick={submitWord} className="w-10 h-10 rounded-lg bg-jade-500/20 text-jade-400 border border-jade-500/30 hover:bg-jade-500/30 flex items-center justify-center font-bold shadow-lg">✓</button>
              <button onClick={() => setSelected([])} className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 flex items-center justify-center font-bold shadow-lg">✕</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Pool de tiles ── */}
      <div className="shrink-0 border-t border-white/[0.06] bg-ink-900 px-4 pt-6 pb-8">
        <div
          className="flex flex-wrap gap-3 justify-center mb-4"
          style={{ animation: shakePool ? 'shake 0.5s ease' : 'none' }}
        >
          {tiles.map(tile => {
            const isSel  = selectedIds.has(tile.id);

            return (
              <button
                key={tile.id}
                onClick={() => selectTile(tile)}
                disabled={isSel}
                className={`
                  w-14 h-14 rounded-full font-display text-2xl font-bold
                  transition-all duration-150
                  ${isSel
                    ? 'bg-white/5 border border-white/10 text-ink-600 scale-95 shadow-inner'
                    : 'bg-gold-500/15 border-2 border-gold-400/40 text-gold-200 hover:bg-gold-500/25 hover:scale-105 active:scale-95 shadow-md'
                  }
                `}
                style={{
                  width: '52px', height: '52px',
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
