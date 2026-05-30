/**
 * src/features/HanziCard.jsx
 *
 * Carta visual do sistema de cartas Caru.
 * Props:
 *   char      {string}  — '水'
 *   pinyin    {string}  — 'shuǐ'
 *   meaning   {string}  — 'água'
 *   family    {string}  — '水'|'火'|'木'|'金'|'土'|'人'|'口'
 *   level     {number}  — 1 a 5 (SRS)
 *   onClick   {fn}      — callback ao clicar
 *   selected  {bool}    — borda de seleção (deck builder)
 */

export const FAMILY_META = {
  '水': { label: 'Água',    color: '#3b9ddd', effect: 'Anel azul — slow ao redor' },
  '火': { label: 'Fogo',    color: '#e67e22', effect: 'Chamas — dano em área' },
  '木': { label: 'Madeira', color: '#27ae60', effect: 'Espiral — cura/escudo' },
  '金': { label: 'Metal',   color: '#c0c0c0', effect: 'Faísca — ricochete vizinhos' },
  '土': { label: 'Terra',   color: '#c0834e', effect: 'Pulso marrom — stun' },
  '人': { label: 'Humano',  color: '#f1c40f', effect: 'Aura dourada — buff aliados' },
  '口': { label: 'Boca',    color: '#9b59b6', effect: 'Ondas sonoras — empurra' },
};

export const LEVEL_NAMES = ['', 'Aprendendo', 'Familiar', 'Consolidando', 'Dominando', 'Mestre'];

export function getRicocheteTargets(level) {
  return [0, 0, 0, 1, 2, Infinity][level];
}

export function getDamageMultiplier(level) {
  return [1, 1, 1.1, 1.1, 1.2, 1.4][level];
}

// ─── Estilos inline (não depende de CSS global) ───────────────────────────────
const S = {
  card: (family, level, selected) => ({
    position: 'relative',
    width: '100%',
    aspectRatio: '2/3',
    borderRadius: '6px',
    overflow: 'hidden',
    cursor: 'pointer',
    isolation: 'isolate',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: selected
      ? `0 0 0 2px ${FAMILY_META[family]?.color ?? '#c0392b'}, 0 8px 30px rgba(0,0,0,0.6)`
      : '0 4px 20px rgba(0,0,0,0.5)',
  }),
  bg: { position: 'absolute', inset: 0, background: '#12100e', borderRadius: '6px' },
  stripes: {
    position: 'absolute', inset: 0, borderRadius: '6px', opacity: 0.18,
    backgroundImage: 'repeating-linear-gradient(-55deg, transparent, transparent 8px, #8b1a12 8px, #8b1a12 10px)',
  },
  inner: {
    position: 'relative', zIndex: 5,
    display: 'flex', flexDirection: 'column',
    height: '100%', padding: '12px 10px',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  charWrap: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pips: { display: 'flex', gap: 4, justifyContent: 'center', margin: '8px 0' },
  footer: { borderTop: '0.5px solid #1e1c18', paddingTop: 8 },
};

function familyBadgeStyle(family) {
  const c = FAMILY_META[family]?.color ?? '#c0392b';
  return {
    fontSize: 10, letterSpacing: '0.12em', padding: '2px 7px',
    borderRadius: 2, border: `0.5px solid ${c}`,
    color: c, background: `${c}14`, textTransform: 'uppercase',
    fontFamily: "'Share Tech Mono', monospace",
  };
}

function charStyle(level, family) {
  const c = FAMILY_META[family]?.color ?? '#e8e3d8';
  const glows = {
    1: 'none',
    2: 'none',
    3: `0 0 20px ${c}, 0 0 40px ${c}`,
    4: `0 0 25px ${c}, 0 0 55px ${c}`,
    5: `0 0 30px ${c}, 0 0 70px ${c}, 0 0 110px ${c}`,
  };
  return {
    fontFamily: "'Noto Serif SC', serif",
    fontWeight: 900, fontSize: '5.5rem', lineHeight: 1,
    color: '#e8e3d8', textShadow: glows[level] ?? 'none',
    userSelect: 'none',
  };
}

function pipStyle(active) {
  return {
    width: 6, height: 6, borderRadius: '50%',
    background: active ? '#c0392b' : '#2a2820',
    border: `0.5px solid ${active ? '#ff4030' : '#3a3830'}`,
  };
}

export default function HanziCard({ char, pinyin, meaning, family, level = 1, onClick, selected = false }) {
  const meta = FAMILY_META[family] ?? FAMILY_META['水'];
  const rico = getRicocheteTargets(level);

  return (
    <div
      style={S.card(family, level, selected)}
      onClick={() => onClick?.({ char, pinyin, meaning, family, level })}
    >
      <div style={S.bg} />
      <div style={S.stripes} />

      {/* Borda com energia — via SVG inline para evitar @property CSS */}
      <CardBorder color={meta.color} level={level} />

      <div style={S.inner}>
        {/* Header */}
        <div style={S.header}>
          <span style={familyBadgeStyle(family)}>{meta.label}</span>
          <span style={{ fontSize: 10, color: '#5a5850', fontFamily: 'monospace' }}>
            Lv<span style={{ color: '#c0392b' }}>{level}</span>
          </span>
        </div>

        {/* Caractere */}
        <div style={S.charWrap}>
          <span style={charStyle(level, family)}>{char}</span>
        </div>

        {/* Pips SRS */}
        <div style={S.pips}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={pipStyle(i < level)} />
          ))}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={{ fontSize: 11, color: '#5a5850', letterSpacing: '0.05em', textAlign: 'center', marginBottom: 4, fontFamily: 'monospace' }}>
            {pinyin} · {meaning}
          </div>
          <div style={{ fontSize: 10, color: level > 1 ? '#5a5850' : '#2a2820', textAlign: 'center', lineHeight: 1.4, minHeight: 28, fontFamily: 'monospace' }}>
            {level > 1 ? meta.effect : '— bloqueado —'}
          </div>
          {/* Indicadores de ricochete */}
          {rico > 0 && (
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 5 }}>
              {Array.from({ length: rico === Infinity ? 4 : rico }, (_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color, opacity: 0.7 }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Borda animada com energia usando SVG stroke-dashoffset.
 * Funciona em todos os browsers sem @property CSS.
 */
function CardBorder({ color, level }) {
  if (level === 1) {
    return (
      <svg style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', width: '100%', height: '100%' }}>
        <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="5"
          fill="none" stroke="rgba(192,57,43,0.2)" strokeWidth="1" />
      </svg>
    );
  }

  const speeds = { 2: '6s', 3: '4s', 4: '2.5s', 5: '1.2s' };
  const opacities = { 2: 0.5, 3: 0.65, 4: 0.8, 5: 1 };

  return (
    <svg
      style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', width: '100%', height: '100%', overflow: 'visible' }}
      viewBox="0 0 100 150" preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sweep-${color.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="70%" stopColor="transparent" />
          <stop offset="90%" stopColor={color} stopOpacity={opacities[level] ?? 0.5} />
          <stop offset="100%" stopColor="white" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {/* Static base border */}
      <rect x="0.5" y="0.5" width="99" height="149" rx="4"
        fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
      {/* Animated sweep */}
      <rect x="0.5" y="0.5" width="99" height="149" rx="4"
        fill="none"
        stroke={`url(#sweep-${color.replace('#','')})`}
        strokeWidth="1.5"
        strokeDasharray="500"
        strokeDashoffset="500"
        opacity={opacities[level] ?? 0.5}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="500" to="-500"
          dur={speeds[level] ?? '3s'}
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
}
