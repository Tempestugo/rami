import React, { useEffect, useRef, useState, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER — inicializa HanziWriter com fix de pointer-events
═══════════════════════════════════════════════════════════════════════════ */
function createWriter(el, char, opts) {
  el.innerHTML = '';
  const writer = HanziWriter.create(el, char, {
    padding: 8,
    showOutline: true,
    showCharacter: false,
    strokeColor: '#f5c842',
    outlineColor: 'rgba(255,255,255,0.18)',
    drawingColor: '#f5c842',
    drawingWidth: 5,
    ...opts,
  });
  // Força pointer-events no SVG gerado pelo HanziWriter
  requestAnimationFrame(() => {
    const svg = el.querySelector('svg');
    if (svg) {
      svg.style.pointerEvents = 'auto';
      svg.style.touchAction = 'none';
      svg.style.cursor = 'crosshair';
      svg.querySelectorAll('*').forEach(e => { e.style.pointerEvents = 'auto'; });
    }
  });
  return writer;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI GRAPH — Neurônios reativos ao mouse
═══════════════════════════════════════════════════════════════════════════ */
const BASE_NODES = [
  { id: 'a', x: 50, y: 45, color: '#3b82f6', label: '水' },
  { id: 'b', x: 72, y: 22, color: '#10b981', label: '火' },
  { id: 'c', x: 82, y: 65, color: '#f59e0b', label: '木' },
  { id: 'd', x: 28, y: 18, color: '#3b82f6', label: '人' },
  { id: 'e', x: 18, y: 62, color: '#10b981', label: '山' },
  { id: 'f', x: 54, y: 80, color: '#f59e0b', label: '口' },
  { id: 'g', x: 92, y: 42, color: '#a855f7', label: '日' },
  { id: 'h', x: 44, y: 8,  color: '#a855f7', label: '月' },
];
const EDGES = [
  ['a','b'],['a','d'],['a','e'],['a','f'],
  ['b','c'],['b','g'],['b','h'],['c','g'],['d','h'],
];

function MiniGraph() {
  const svgRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const animRef = useRef(null);
  const posRef = useRef(BASE_NODES.map(n => ({ ...n, vx: 0, vy: 0 })));
  const [positions, setPositions] = useState(BASE_NODES);

  const animate = useCallback(() => {
    const nodes = posRef.current;
    const { x: mx, y: my } = mouseRef.current;
    let changed = false;
    nodes.forEach(n => {
      const base = BASE_NODES.find(b => b.id === n.id);
      const dx = n.x - mx, dy = n.y - my;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      let fx = 0, fy = 0;
      if (dist < 22) {
        const force = (22 - dist) / 22 * 4;
        fx += (dx/dist)*force; fy += (dy/dist)*force;
      }
      fx += (base.x - n.x) * 0.08;
      fy += (base.y - n.y) * 0.08;
      n.vx = (n.vx + fx) * 0.78; n.vy = (n.vy + fy) * 0.78;
      if (Math.abs(n.vx) + Math.abs(n.vy) > 0.01) changed = true;
      n.x += n.vx; n.y += n.vy;
    });
    if (changed) setPositions(nodes.map(n => ({ ...n })));
    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate]);

  const handleMouse = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  return (
    <svg ref={svgRef} viewBox="0 0 100 100" className="w-full h-full cursor-crosshair"
      onMouseMove={handleMouse} onMouseLeave={() => { mouseRef.current = { x:-999, y:-999 }; }}
      style={{ overflow: 'visible' }}>
      {EDGES.map(([a,b], i) => {
        const na = positions.find(n=>n.id===a), nb = positions.find(n=>n.id===b);
        if (!na||!nb) return null;
        return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(255,255,255,0.14)" strokeWidth="0.7"/>;
      })}
      {positions.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={6} fill={n.color} opacity={0.9}
            style={{ filter: `drop-shadow(0 0 5px ${n.color}99)` }}/>
          <text x={n.x} y={n.y+2} textAnchor="middle" dominantBaseline="middle"
            fontSize="5" fill="white" fontFamily="serif" style={{ pointerEvents:'none', userSelect:'none' }}>
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI DECK — Arrastar / Scroll para folhear cartas
═══════════════════════════════════════════════════════════════════════════ */
const DECK_CARDS = [
  { char: '水', color: '#3b9ddd', label: 'Água',    pinyin: 'shuǐ', effect: 'Slow + Anel' },
  { char: '火', color: '#e67e22', label: 'Fogo',    pinyin: 'huǒ',  effect: 'Dano em área' },
  { char: '木', color: '#27ae60', label: 'Madeira', pinyin: 'mù',   effect: 'Cura / Escudo' },
  { char: '金', color: '#c0c0c0', label: 'Metal',   pinyin: 'jīn',  effect: 'Ricochete' },
  { char: '土', color: '#c0834e', label: 'Terra',   pinyin: 'tǔ',   effect: 'Stun' },
  { char: '人', color: '#f1c40f', label: 'Humano',  pinyin: 'rén',  effect: 'Buff aliados' },
];

function MiniDeck() {
  const [activeIdx, setActiveIdx] = useState(2);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = (e) => { setDragging(true); startXRef.current = e.clientX; };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > 28) {
      setActiveIdx(i => Math.max(0, Math.min(DECK_CARDS.length - 1, i + (delta < 0 ? 1 : -1))));
      startXRef.current = e.clientX;
    }
  };
  const handleWheel = (e) => {
    e.preventDefault();
    setActiveIdx(i => Math.max(0, Math.min(DECK_CARDS.length - 1, i + (e.deltaY > 0 ? 1 : -1))));
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      style={{ cursor: dragging ? 'grabbing' : 'grab', perspective: 800 }}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}
      onWheel={handleWheel}>
      {DECK_CARDS.map((card, i) => {
        const offset = i - activeIdx;
        const abs = Math.abs(offset);
        const isActive = i === activeIdx;
        return (
          <div key={i} onClick={() => setActiveIdx(i)}
            className="absolute rounded-xl"
            style={{
              width: 78, height: 116,
              background: '#12100e',
              border: `1.5px solid ${card.color}${isActive ? 'cc' : '33'}`,
              boxShadow: isActive ? `0 0 32px ${card.color}44, 0 8px 28px rgba(0,0,0,0.7)` : '0 4px 12px rgba(0,0,0,0.5)',
              transform: `translateX(${offset*60}px) rotateY(${offset*18}deg) scale(${isActive ? 1 : Math.max(0.7, 1 - abs*0.12)})`,
              transformStyle: 'preserve-3d',
              opacity: Math.max(0.15, 1 - abs*0.32),
              transition: dragging ? 'none' : 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              zIndex: DECK_CARDS.length - abs,
              cursor: isActive ? 'grab' : 'pointer',
            }}>
            <div className="absolute inset-0 rounded-xl" style={{
              backgroundImage: 'repeating-linear-gradient(-55deg,transparent,transparent 6px,#8b1a1214 6px,#8b1a1214 7px)',
            }}/>
            <div className="relative h-full flex flex-col items-center justify-between p-2">
              <span style={{ fontSize:7, color:card.color, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase' }}>{card.label}</span>
              <span style={{ fontSize:42, fontFamily:'serif', color: isActive?'#e8e3d8':'#5a5850',
                textShadow: isActive?`0 0 20px ${card.color}88`:'none', lineHeight:1, transition:'all 0.3s' }}>
                {card.char}
              </span>
              <div className="text-center">
                <div style={{ fontSize:7, color:'#5a5850', fontFamily:'monospace' }}>{card.pinyin}</div>
                {isActive && <div style={{ fontSize:6, color:card.color, marginTop:2, opacity:0.8 }}>{card.effect}</div>}
              </div>
            </div>
            <div className="absolute bottom-8 inset-x-0 flex justify-center gap-1">
              {[...Array(5)].map((_,j)=>(
                <div key={j} style={{ width:4, height:4, borderRadius:'50%',
                  background:j<3?'#c0392b':'#2a2820', border:`0.5px solid ${j<3?'#ff4030':'#3a3830'}` }}/>
              ))}
            </div>
          </div>
        );
      })}
      <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
        {DECK_CARDS.map((_,i) => (
          <div key={i} style={{ width:i===activeIdx?12:4, height:3, borderRadius:2,
            background:i===activeIdx?'#dc2626':'#2a2820', transition:'all 0.2s' }}/>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI CERCO — Sprite canvas real (ofuda_wood_idle + sprites_ofuda frames)
═══════════════════════════════════════════════════════════════════════════ */
const SIEGE_CHARS = [
  { char: '水', pinyin: 'shuǐ', meaning: 'água' },
  { char: '火', pinyin: 'huǒ',  meaning: 'fogo' },
  { char: '木', pinyin: 'mù',   meaning: 'madeira' },
  { char: '人', pinyin: 'rén',  meaning: 'pessoa' },
  { char: '山', pinyin: 'shān', meaning: 'montanha' },
];

// Pré-carrega sprites igual ao SiegeMode.jsx real
const miniSpriteCache = {};
function loadMiniSprite(name) {
  if (miniSpriteCache[name]) return miniSpriteCache[name];
  const img = new Image();
  img.src = `/${name}.png`;
  miniSpriteCache[name] = img;
  return img;
}
loadMiniSprite('sprites/ofuda_wood_idle');
Array.from({ length: 16 }, (_, i) =>
  loadMiniSprite(`sprites_ofuda/frame_${String(i).padStart(3, '0')}`)
);

const OFUDA_W = 72, OFUDA_H = 110;

function MiniSiege() {
  const writerRef = useRef(null);
  const writerDivRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [charIdx, setCharIdx] = useState(0);
  const [status, setStatus] = useState('draw');
  const stateRef = useRef({ frame: 0, burning: false });
  const fireIntervalRef = useRef(null);
  const current = SIEGE_CHARS[charIdx];

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const s = stateRef.current;
      const spriteName = s.burning
        ? `sprites_ofuda/frame_${String(Math.min(s.frame, 15)).padStart(3, '0')}`
        : 'sprites/ofuda_wood_idle';
      const sprite = miniSpriteCache[spriteName];
      const cx = W / 2, cy = H / 2;

      ctx.shadowColor = s.burning ? '#a855f7' : 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = s.burning ? 28 : 10;

      if (sprite?.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, cx - OFUDA_W / 2, cy - OFUDA_H / 2, OFUDA_W, OFUDA_H);
      } else {
        ctx.fillStyle = '#2d1b08';
        ctx.fillRect(cx - OFUDA_W / 2, cy - OFUDA_H / 2, OFUDA_W, OFUDA_H);
      }
      ctx.shadowBlur = 0;

      // Kanji sobre o ofuda
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (s.burning) {
        ctx.fillStyle = '#fcd34d';
        ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = '#3b1f08cc';
      }
      ctx.fillText(current.char, cx, cy + 6);
      ctx.shadowBlur = 0;

      // Dica "desenhe →" quando idle
      if (!s.burning) {
        ctx.fillStyle = 'rgba(245,200,66,0.55)';
        ctx.font = '9px sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText('desenhe →', cx, cy - OFUDA_H / 2 - 3);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [current.char]);

  // Quiz setup
  const startQuiz = useCallback((idx) => {
    const c = SIEGE_CHARS[idx];
    stateRef.current = { frame: 0, burning: false };
    setStatus('draw');

    const t = setTimeout(() => {
      if (!writerDivRef.current) return;
      if (writerRef.current) {
        try { writerRef.current.cancelQuiz(); } catch (_) {}
      }
      const writer = createWriter(writerDivRef.current, c.char, {
        width: 100, height: 100,
        strokeColor: '#fcd34d',
        outlineColor: 'rgba(255,255,255,0.18)',
        drawingColor: '#fcd34d',
        drawingWidth: 5,
      });
      writerRef.current = writer;

      setTimeout(() => {
        writer.quiz({
          onMistake: () => {},
          onCorrectStroke: () => {},
          onComplete: () => {
            setStatus('burning');
            stateRef.current.burning = true;
            stateRef.current.frame = 0;
            clearInterval(fireIntervalRef.current);
            fireIntervalRef.current = setInterval(() => {
              stateRef.current.frame += 1;
              if (stateRef.current.frame >= 16) {
                clearInterval(fireIntervalRef.current);
                setTimeout(() => {
                  setCharIdx(prev => (prev + 1) % SIEGE_CHARS.length);
                }, 300);
              }
            }, 110);
          },
        });
      }, 80);
    }, 50);

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cleanup = startQuiz(charIdx);
    return () => {
      cleanup?.();
      clearInterval(fireIntervalRef.current);
    };
  }, [charIdx, startQuiz]);

  return (
    <div className="relative w-full h-full flex items-center justify-center gap-3">
      {/* ── Ofuda canvas (sprite real) ── */}
      <div className="relative flex-shrink-0 flex flex-col items-center" style={{ gap: 4 }}>
        <canvas
          ref={canvasRef}
          width={100} height={150}
          style={{ display: 'block' }}
        />
        <span style={{ fontSize: 8, fontFamily: 'monospace',
          color: status === 'burning' ? '#a855f7' : '#57534e' }}>
          {status === 'draw' ? `${current.pinyin} · ${current.meaning}` : 'queimando...'}
        </span>
      </div>

      {/* ── Área de desenho ── */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: 100, height: 100 }}>
          <div
            ref={writerDivRef}
            style={{
              width: 100, height: 100, borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${status === 'burning' ? '#a855f744' : 'rgba(255,255,255,0.10)'}`,
              overflow: 'hidden',
              transition: 'border-color 0.3s',
            }}
          />
        </div>

        {/* Progresso */}
        <div className="flex gap-1">
          {SIEGE_CHARS.map((c, i) => (
            <div key={i} style={{
              width: i === charIdx ? 20 : 14, height: 14, borderRadius: 3,
              background: i < charIdx ? '#a855f744' : i === charIdx ? '#a855f7' : '#1a1a1a',
              border: `1px solid ${i === charIdx ? '#a855f7' : '#2a2820'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontFamily: 'serif', color: i === charIdx ? 'white' : '#333',
              transition: 'all 0.3s',
            }}>{c.char}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI APRENDER — Frase completa, desenhar traço a traço
═══════════════════════════════════════════════════════════════════════════ */
const SENTENCE = [
  { char: '我', pinyin: 'wǒ' },
  { char: '爱', pinyin: 'ài' },
  { char: '学', pinyin: 'xué' },
  { char: '汉', pinyin: 'hàn' },
  { char: '字', pinyin: 'zì' },
];

function MiniLearn() {
  const writerRef = useRef(null);
  const writerDivRef = useRef(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'drawing' | 'correct' | 'done'

  const initWriter = useCallback((idx) => {
    if (idx >= SENTENCE.length) {
      setStatus('done');
      setTimeout(() => { setDone([]); setCurrentIdx(0); setStatus('idle'); }, 2200);
      return;
    }

    const t = setTimeout(() => {
      if (!writerDivRef.current) return;
      if (writerRef.current) {
        try { writerRef.current.cancelQuiz(); } catch (_) {}
      }
      const c = SENTENCE[idx].char;
      const writer = createWriter(writerDivRef.current, c, {
        width: 90, height: 90,
        strokeColor: '#dc2626',
        radicalColor: '#f59e0b',
        outlineColor: 'rgba(255,255,255,0.15)',
        drawingColor: '#dc2626',
        drawingWidth: 5,
      });
      writerRef.current = writer;

      setTimeout(() => {
        writer.quiz({
          onMistake: () => {},
          onCorrectStroke: () => {},
          onComplete: () => {
            setStatus('correct');
            setTimeout(() => {
              setDone(prev => [...prev, idx]);
              setCurrentIdx(idx + 1);
              setStatus('idle');
            }, 450);
          },
        });
        setStatus('drawing');
      }, 80);
    }, 50);

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status === 'idle') {
      const cleanup = initWriter(currentIdx);
      return cleanup;
    }
  }, [currentIdx, status, initWriter]);

  const allDone = status === 'done';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      {/* Frase */}
      <div className="flex gap-1.5 items-end mb-1">
        {SENTENCE.map(({ char, pinyin }, i) => {
          const isDone = done.includes(i);
          const isCurrent = i === currentIdx && !allDone;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span style={{ fontSize:7, fontFamily:'monospace', transition:'color 0.3s',
                color: isCurrent?'#dc2626': isDone?'#10b981':'#44403c' }}>
                {pinyin}
              </span>
              <div style={{
                width:28, height:28, borderRadius:5,
                background: isCurrent?'rgba(220,38,38,0.12)': isDone?'rgba(16,185,129,0.10)':'rgba(255,255,255,0.03)',
                border: `1px solid ${isCurrent?'#dc262666': isDone?'#10b98166':'rgba(255,255,255,0.08)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.3s',
              }}>
                <span style={{ fontSize:16, fontFamily:'serif', transition:'color 0.3s',
                  color: isDone?'#10b981': isCurrent?'#dc2626':'#44403c' }}>
                  {char}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas de desenho */}
      {!allDone ? (
        <div className="relative" style={{ width:90, height:90 }}>
          <div ref={writerDivRef} style={{
            width:90, height:90, borderRadius:10,
            background:'rgba(255,255,255,0.02)',
            border:`1px solid ${status==='correct'?'#10b98144':'rgba(255,255,255,0.08)'}`,
            overflow:'hidden', transition:'border-color 0.3s',
          }}/>
          {status==='correct' && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none"
              style={{ background:'rgba(16,185,129,0.10)' }}>
              <span style={{ fontSize:26, color:'#10b981' }}>✓</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ width:90, height:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:32 }}>✨</span>
        </div>
      )}

      <p style={{ fontSize:9, color:'#57534e', fontFamily:'monospace', textAlign:'center' }}>
        {allDone
          ? '我爱学汉字 · perfeito!'
          : `desenhe: ${SENTENCE[currentIdx]?.char} · ${currentIdx+1} / 5`}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE CARD
═══════════════════════════════════════════════════════════════════════════ */
function FeatureCard({ title, subtitle, badge, badgeColor, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{
        background:'rgba(255,255,255,0.025)',
        border:`1px solid ${hovered?badgeColor+'44':'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered?`0 0 40px ${badgeColor}18,0 8px 32px rgba(0,0,0,0.45)`:'0 4px 20px rgba(0,0,0,0.3)',
        transform: hovered?'translateY(-4px)':'translateY(0)',
        transition:'transform 0.3s ease,box-shadow 0.3s ease,border-color 0.3s ease',
      }}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <div style={{
        position:'absolute',top:0,left:0,right:0,height:1,
        background:`linear-gradient(90deg,transparent,${badgeColor}88,transparent)`,
        opacity:hovered?1:0, transition:'opacity 0.3s',
      }}/>
      <div className="relative" style={{ height:220, background:'rgba(0,0,0,0.28)' }}>
        <div className="absolute inset-0 p-3">{children}</div>
        <div style={{ position:'absolute',bottom:0,left:0,right:0,height:16,pointerEvents:'none',
          background:'linear-gradient(0deg,rgba(10,9,8,0.95),transparent)' }}/>
        <div style={{ position:'absolute',top:10,right:10 }}>
          <span style={{ fontSize:8,fontFamily:'monospace',letterSpacing:'0.1em',
            padding:'2px 8px',borderRadius:99,
            color:badgeColor,border:`1px solid ${badgeColor}44`,background:`${badgeColor}11` }}>
            {badge}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-white mb-1">{title}</h3>
        <p style={{ fontSize:12,color:'#57534e',lineHeight:1.5 }}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage({ onLogin }) {
  return (
    <div style={{
      minHeight:'100vh', background:'#0a0908',
      backgroundImage:'radial-gradient(ellipse at 15% 20%,rgba(220,38,38,0.05) 0%,transparent 55%),radial-gradient(ellipse at 85% 80%,rgba(5,150,105,0.04) 0%,transparent 55%)',
      overflowY:'auto', overflowX:'hidden',
      fontFamily:'"DM Sans",sans-serif',
    }}>

      {/* Header */}
      <header style={{
        position:'sticky',top:0,zIndex:50,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'14px 28px',
        background:'rgba(10,9,8,0.88)',backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:32,height:32,borderRadius:8,background:'#12100e',
            border:'1px solid rgba(220,38,38,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ fontSize:18,fontFamily:'serif',color:'#dc2626' }}>木</span>
          </div>
          <span style={{ fontWeight:800,fontSize:18,letterSpacing:'0.04em',
            background:'linear-gradient(135deg,#f5f5f4,#78716c)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>Rami</span>
        </div>
        <button onClick={onLogin} style={{
          padding:'8px 22px',borderRadius:99,fontSize:13,fontWeight:600,cursor:'pointer',
          background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.35)',
          color:'#fca5a5',transition:'all 0.2s',
        }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(220,38,38,0.22)';e.currentTarget.style.borderColor='rgba(220,38,38,0.6)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(220,38,38,0.12)';e.currentTarget.style.borderColor='rgba(220,38,38,0.35)';}}>
          Entrar
        </button>
      </header>

      {/* Hero */}
      <section style={{ textAlign:'center',padding:'80px 24px 60px' }}>
        <h1 style={{
          fontWeight:900,lineHeight:1.05,marginBottom:18,
          fontSize:'clamp(2.6rem,7vw,5rem)',
          background:'linear-gradient(135deg,#f5f5f4 20%,#78716c)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
        }}>
          Aprenda Mandarim<br/>
          <span style={{ background:'linear-gradient(135deg,#dc2626,#f59e0b)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent' }}>
            de um jeito diferente
          </span>
        </h1>
        <p style={{ color:'#78716c',fontSize:'1.05rem',maxWidth:480,margin:'0 auto 32px',lineHeight:1.7 }}>
          Grafos de conhecimento, cartas SRS, modo de combate e prática de escrita — tudo integrado e em português.
        </p>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:14 }}>
          <button onClick={onLogin} style={{
            padding:'12px 32px',borderRadius:99,fontSize:14,fontWeight:700,cursor:'pointer',border:'none',
            background:'linear-gradient(135deg,#dc2626,#b91c1c)',color:'white',
            boxShadow:'0 0 36px rgba(220,38,38,0.28)',transition:'transform 0.2s',
          }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            Começar agora
          </button>
          <span style={{ fontSize:12,color:'#44403c' }}>é gratuito</span>
        </div>
        <div style={{ marginTop:56,display:'flex',justifyContent:'center',gap:24,opacity:0.12,userSelect:'none' }}>
          {['学','习','汉','字','很','美'].map((c,i)=>(
            <span key={i} style={{ fontSize:'clamp(1.2rem,3vw,2.2rem)',fontFamily:'serif',color:'#f5f5f4' }}>{c}</span>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ padding:'0 20px 80px',maxWidth:1080,margin:'0 auto' }}>
        <div style={{ textAlign:'center',marginBottom:36 }}>
          <h2 style={{ fontWeight:700,fontSize:18,color:'#e7e5e4',marginBottom:6 }}>
            Experimente antes de entrar
          </h2>
          <p style={{ fontSize:12,color:'#44403c' }}>Todos os demos são interativos</p>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16 }}>
          <FeatureCard title="Grafo de Conhecimento"
            subtitle="Mova o mouse sobre os neurônios — veja as conexões reagirem."
            badge="EXPLORER" badgeColor="#3b82f6">
            <MiniGraph/>
          </FeatureCard>
          <FeatureCard title="Coleção de Cartas"
            subtitle="Arraste ou use o scroll para folhear as cartas do seu deck."
            badge="CARTAS" badgeColor="#10b981">
            <MiniDeck/>
          </FeatureCard>
          <FeatureCard title="Modo Cerco"
            subtitle="Desenhe o caractere correto para incendiar o ofuda inimigo."
            badge="CERCO" badgeColor="#f59e0b">
            <MiniSiege/>
          </FeatureCard>
          <FeatureCard title="Prática de Escrita"
            subtitle='Escreva 我爱学汉字 traço a traço e veja a frase tomar forma.'
            badge="APRENDER" badgeColor="#dc2626">
            <MiniLearn/>
          </FeatureCard>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:'20px',textAlign:'center',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize:11,fontFamily:'monospace',color:'#292524' }}>
          Rami · 木 · v1.2.0
        </span>
      </footer>
    </div>
  );
}
