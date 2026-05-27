/**
 * SiegeMode.jsx — Modo Cerco (com sprites reais)
 *
 * Sprites: ofuda_wood_idle/hit, ofuda_stone_idle, ofuda_blood_idle/hit
 * Fonte: Zpix (pixel art CJK) via FontFace API → fallback Noto Serif SC
 * O kanji é desenhado em Canvas sobre a área central vazia do sprite.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';

// ─── Config ──────────────────────────────────────────────────────────────────
const OFUDA_W   = 80;
const OFUDA_H   = 120;
const WRITER_SZ = 220;

const OFUDA_VARIANTS = [
  { idle: 'ofuda_wood_idle',  hit: 'ofuda_wood_hit',   charColor: '#3b1f08' },
  { idle: 'ofuda_stone_idle', hit: 'ofuda_stone_idle',  charColor: '#e9d5ff' },
  { idle: 'ofuda_blood_idle', hit: 'ofuda_blood_hit',   charColor: '#fca5a5' },
];

// ─── Sprite cache ─────────────────────────────────────────────────────────────
const spriteCache = {};
function loadSprite(name) {
  if (spriteCache[name]) return spriteCache[name];
  const img = new Image();
  img.src = `/sprites/${name}.png`;
  spriteCache[name] = img;
  return img;
}
['ofuda_wood_idle','ofuda_wood_hit','ofuda_stone_idle','ofuda_blood_idle','ofuda_blood_hit']
  .forEach(loadSprite);

// ─── Zpix loader ──────────────────────────────────────────────────────────────
let zpixLoaded = false;
async function ensureZpix() {
  if (zpixLoaded) return;
  try {
    const font = new FontFace('Zpix', 'url(/fonts/zpix.woff2)');
    await font.load();
    document.fonts.add(font);
  } catch(_) {}
  zpixLoaded = true;
}

// ─── Componente ──────────────────────────────────────────────────────────────
const SiegeMode = ({ hskLevel = 1, waveSize = 5, onWaveComplete }) => {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const writerRef    = useRef(null);
  const writerDivRef = useRef(null);
  const animFrameRef = useRef(null);

  const gameState = useRef({
    enemies: [], particles: [], floatingTexts: [],
    activeTarget: null, phase: 'loading', destroyed: 0,
  });

  const [phase, setPhase]           = useState('loading');
  const [activeChar, setActiveChar] = useState(null);
  const [activeHint, setActiveHint] = useState(null);
  const [score, setScore]           = useState(0);
  const [total, setTotal]           = useState(waveSize);

  // ─── Spawn ─────────────────────────────────────────────────────────────────
  function spawnEnemies(data) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    gameState.current.enemies = data.map((en, i) => ({
      ...en,
      x: canvas.width + 80 + i * 160,
      y: canvas.height * 0.15 + Math.random() * (canvas.height * 0.55),
      wobble: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.25,
      opacity: 1, dying: false,
      variant: OFUDA_VARIANTS[Math.floor(Math.random() * OFUDA_VARIANTS.length)],
      spriteState: 'idle', hitTimer: 0,
    }));
    setTotal(data.length);
    gameState.current.phase = 'playing';
    setPhase('playing');
  }

  useEffect(() => {
    ensureZpix();
    fetch(`/api/game/siege?hsk=${hskLevel}&count=${waveSize}`)
      .then(r => r.json()).then(({ data }) => spawnEnemies(data))
      .catch(() => {
        const chars = ['水','火','人','口','日','山','木','土','金','月'].slice(0, waveSize);
        spawnEnemies(chars.map((char, i) => ({
          id: `f_${i}`, char, pinyin: '?', meaning: '?', hsk: 1,
          speed: 0.5 + Math.random() * 0.3,
        })));
      });
  }, [hskLevel, waveSize]);

  // ─── HanziWriter ───────────────────────────────────────────────────────────
  const initWriter = useCallback((char, onComplete) => {
    if (!writerDivRef.current) return;

    // Limpa instância anterior
    if (writerRef.current) {
      try { writerRef.current.cancelQuiz(); } catch(_) {}
    }
    writerDivRef.current.innerHTML = '';

    writerRef.current = HanziWriter.create(writerDivRef.current, char, {
      width: WRITER_SZ,
      height: WRITER_SZ,
      padding: 16,
      showOutline: true,
      showCharacter: false,
      strokeColor: '#f5c842',
      outlineColor: 'rgba(255,255,255,0.15)',
      drawingColor: '#f5c842',
      drawingWidth: 6,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 0,
    });

    // Força pointer-events no SVG interno que o HanziWriter cria
    requestAnimationFrame(() => {
      const svg = writerDivRef.current?.querySelector('svg');
      if (svg) {
        svg.style.pointerEvents = 'auto';
        svg.style.touchAction = 'none';
        svg.style.cursor = 'crosshair';
        // Força todos os elementos internos a receber eventos
        svg.querySelectorAll('*').forEach(el => {
          el.style.pointerEvents = 'auto';
        });
      }
    });

    writerRef.current.quiz({
      onMistake: () => document.dispatchEvent(
        new CustomEvent('caru:error', { detail: { char } })
      ),
      onComplete: (summary) => {
        document.dispatchEvent(new CustomEvent('caru:success', { detail: { char, summary } }));
        onComplete?.();
      },
    });
  }, []);

  // ─── Destruir ──────────────────────────────────────────────────────────────
  const destroyEnemy = useCallback((id) => {
    const state = gameState.current;
    const en = state.enemies.find(e => e.id === id);
    if (!en || en.dying) return;
    en.dying = true;
    en.spriteState = 'hit';
    for (let i = 0; i < 20; i++) {
      state.particles.push({
        x: en.x, y: en.y,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16,
        life: 1.0,
        color: i % 3 === 0 ? '#a855f7' : en.variant.charColor,
        size: Math.random() * 5 + 2,
      });
    }
    state.floatingTexts.push({ x: en.x, y: en.y - 30, text: `✓ ${en.char}`, color: '#4ade80', life: 1.5, vy: 1.8 });
    state.destroyed++;
    setScore(s => s + 1);
    state.activeTarget = null; state.phase = 'playing';
    setPhase('playing'); setActiveChar(null); setActiveHint(null);
    setTimeout(() => {
      state.enemies = state.enemies.filter(e => e.id !== id);
      if (state.enemies.length === 0) { state.phase = 'victory'; setPhase('victory'); onWaveComplete?.(); }
    }, 500);
  }, [onWaveComplete]);

  // ─── Targeting ─────────────────────────────────────────────────────────────
  // pendingWriter guarda char+callback até o writerDivRef estar no DOM
  const pendingWriter = useRef(null);

  // Roda DEPOIS que o React renderizou o overlay (writerDivRef montado)
  useEffect(() => {
    if (phase !== 'drawing' || !pendingWriter.current || !writerDivRef.current) return;
    const hit = pendingWriter.current;
    pendingWriter.current = null;
    initWriter(hit.char, () => destroyEnemy(hit.id));
  }, [phase, initWriter, destroyEnemy]);

  const handleCanvasClick = useCallback((e) => {
    const state = gameState.current;
    if (state.phase !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const hit = state.enemies.find(en =>
      !en.dying &&
      Math.abs(px - en.x) < OFUDA_W / 2 &&
      Math.abs(py - en.y) < OFUDA_H / 2
    );
    if (!hit) return;
    state.activeTarget = hit;
    state.phase = 'drawing';
    pendingWriter.current = hit;
    setPhase('drawing');
    setActiveChar(hit.char);
    setActiveHint({ pinyin: hit.pinyin, meaning: hit.meaning });
  }, []);

  const cancelDrawing = useCallback(() => {
    try { writerRef.current?.cancelQuiz(); } catch(_) {}
    gameState.current.phase = 'playing';
    gameState.current.activeTarget = null;
    setPhase('playing'); setActiveChar(null); setActiveHint(null);
  }, []);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') cancelDrawing(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [cancelDrawing]);

  // ─── Game Loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = container.clientWidth; canvas.height = container.clientHeight; };
    resize();
    window.addEventListener('resize', resize);

    const loop = (ts) => {
      const state = gameState.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state.phase === 'loading') {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('Invocando a horda...', canvas.width / 2, canvas.height / 2);
        animFrameRef.current = requestAnimationFrame(loop); return;
      }

      // UPDATE
      state.enemies.forEach(en => {
        if (en.dying) { en.opacity = Math.max(0, en.opacity - 0.06); return; }
        en.x -= en.speed; en.wobble += 0.025;
        en.y += Math.sin(en.wobble) * en.drift;
        if (en.hitTimer > 0 && --en.hitTimer === 0) en.spriteState = 'idle';
        if (en.x < -OFUDA_W) {
          en.dying = true;
          state.floatingTexts.push({ x: 80, y: canvas.height / 2, text: '⚠ Passou!', color: '#ef4444', life: 1.5, vy: 0.8 });
          setTimeout(() => { state.enemies = state.enemies.filter(e => e.id !== en.id); }, 400);
        }
      });
      state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.88; p.vy *= 0.88; p.life -= 0.022; });
      state.particles = state.particles.filter(p => p.life > 0);
      state.floatingTexts.forEach(ft => { ft.y -= ft.vy; ft.life -= 0.018; });
      state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);

      // DRAW linha de defesa
      ctx.save(); ctx.strokeStyle = 'rgba(245,200,66,0.12)'; ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]); ctx.beginPath();
      ctx.moveTo(60, 0); ctx.lineTo(60, canvas.height); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      ctx.font = '20px serif'; ctx.textAlign = 'center';
      ctx.fillText('🏯', 30, canvas.height / 2);

      // DRAW ofudas
      state.enemies.forEach(en => {
        const isActive = state.activeTarget?.id === en.id;
        ctx.save();
        ctx.globalAlpha = en.opacity;
        ctx.translate(en.x, en.y);

        const spriteName = (en.spriteState === 'hit' && !en.dying) ? en.variant.hit : en.variant.idle;
        const sprite = spriteCache[spriteName];

        if (sprite?.complete && sprite.naturalWidth > 0) {
          if (isActive) { ctx.shadowColor = '#f5c842'; ctx.shadowBlur = 18; }
          ctx.drawImage(sprite, -OFUDA_W / 2, -OFUDA_H / 2, OFUDA_W, OFUDA_H);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#2d1b08';
          ctx.fillRect(-OFUDA_W / 2, -OFUDA_H / 2, OFUDA_W, OFUDA_H);
        }

        // Kanji pixelizado sobre a área vazia do ofuda
        const fontStack = zpixLoaded ? '"Zpix", "Noto Serif SC", serif' : '"Noto Serif SC", serif';
        ctx.font = `bold 30px ${fontStack}`;
        ctx.fillStyle = en.variant.charColor;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(en.char, 0, 6);  // leve offset para a área branca do sprite de madeira

        if (!isActive && !en.dying) {
          ctx.fillStyle = 'rgba(245,200,66,0.65)'; ctx.font = '9px sans-serif';
          ctx.textBaseline = 'bottom';
          ctx.fillText('toque', 0, -OFUDA_H / 2 - 2);
        }
        ctx.restore();
      });

      // DRAW partículas
      state.particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life);
        ctx.fill(); ctx.globalAlpha = 1;
      });

      // DRAW textos
      state.floatingTexts.forEach(ft => {
        ctx.fillStyle = ft.color; ctx.globalAlpha = Math.max(0, ft.life);
        ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
      });

      // Barra de progresso inferior
      const pw = 200; const pct = (state.destroyed / total) || 0;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(canvas.width / 2 - pw / 2, canvas.height - 22, pw, 7);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(canvas.width / 2 - pw / 2, canvas.height - 22, pw * pct, 7);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animFrameRef.current); window.removeEventListener('resize', resize); };
  }, [total]);

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-2xl border border-white/10 bg-ink-950" style={{ minHeight: 400, overflow: phase === 'drawing' ? 'visible' : 'hidden' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
        style={{
          cursor: phase === 'playing' ? 'crosshair' : 'default',
          pointerEvents: phase === 'drawing' ? 'none' : 'auto',
        }}
        onClick={handleCanvasClick}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
          <span className="text-gold-300 font-display font-bold text-sm tracking-widest">🏯 CERCO</span>
          <span className="text-ink-300 text-xs">{score} / {total}</span>
          <span className="text-ink-400 text-xs">HSK {hskLevel}</span>
        </div>
      </div>

      {phase === 'drawing' && activeChar && (
        <div
          className="absolute z-20 flex flex-col items-center gap-3 rounded-2xl p-4 shadow-2xl border border-white/15"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(8, 8, 16, 0.78)',
            backdropFilter: 'blur(5px)',
            width: 'min(300px, 88vw)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center">
            <p className="text-gold-300 font-display text-3xl font-bold leading-none">{activeChar}</p>
            {activeHint && (
              <p className="text-ink-300 text-xs mt-1">{activeHint.pinyin} · {activeHint.meaning}</p>
            )}
          </div>
          <div
            ref={writerDivRef}
            className="rounded-xl border border-white/10"
            style={{
              width: WRITER_SZ,
              height: WRITER_SZ,
              background: 'rgba(255,255,255,0.03)',
              touchAction: 'none',
              userSelect: 'none',
              cursor: 'crosshair',
            }}
          />
          <p className="text-ink-400 text-xs">Desenhe na ordem correta dos traços</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => writerRef.current?.undo?.()}
              className="flex-1 py-1.5 text-xs rounded-lg border border-white/10 text-ink-300 hover:bg-white/5 transition"
            >
              ↩ Desfazer
            </button>
            <button
              onClick={cancelDrawing}
              className="flex-1 py-1.5 text-xs rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
            >
              ✕ Esc
            </button>
          </div>
        </div>
      )}

      {phase === 'victory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-6xl mb-4">🏮</p>
            <h2 className="text-gold-300 font-display text-3xl font-bold mb-2">Cerco Vencido!</h2>
            <p className="text-ink-300 text-sm mb-6">{score} ofudas destruídos</p>
            <button onClick={() => window.location.reload()}
              className="px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-bold hover:bg-purple-500 transition">
              Nova Onda
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiegeMode;