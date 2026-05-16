import React from 'react';
import useStore from '../store/useStore';

const MODES = [
  { value: 'evo', label: 'Evolução', sub: 'Radical → Palavras Derivadas', icon: '🌿' },
  { value: 'dag', label: 'Analítico', sub: 'Palavra → Radicais Componentes', icon: '🔬' },
  { value: 'sim', label: 'Similaridade', sub: 'Forma Visual (+1 Traço)', icon: '👁️' },
];

const CONTEXTS = [
  { value: 'cozinha',  label: 'Cozinha',   icon: '🍳' },
  { value: 'natureza', label: 'Natureza',  icon: '🌲' },
  { value: 'pessoa',   label: 'Pessoa',    icon: '👤' },
  { value: 'tempo',    label: 'Tempo',     icon: '⏳' },
  { value: 'clima',    label: 'Clima',     icon: '🌧️' },
  { value: 'numero',   label: 'Número',    icon: '🔢' },
  { value: 'familia',  label: 'Família',   icon: '👨‍👩‍👧' },
  { value: 'acao',     label: 'Ação',      icon: '⚡' },
  { value: 'lugar',    label: 'Lugar',     icon: '📍' },
  { value: 'estudo',   label: 'Estudo',    icon: '📖' },
];

const HSK_COLORS = {
  1: 'text-azure-300',
  2: 'text-jade-300',
  3: 'text-gold-300',
  4: 'text-vermillion-300',
  5: 'text-vermillion-400',
  6: 'text-vermillion-500',
};

export default function SidebarFilters() {
  const { mode, maxHsk, context, setMode, setMaxHsk, setContext, clearContext } = useStore();

  return (
    <aside className="w-72 shrink-0 bg-ink-900 border-r border-white/8 flex flex-col overflow-y-auto z-10">
      <div className="p-5 flex flex-col gap-6">

        {/* Mode selector */}
        <div>
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">
            Modo de Estrutura
          </p>
          <div className="flex flex-col gap-2">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 border
                  ${mode === m.value
                    ? 'bg-vermillion-500/15 border-vermillion-500/40 text-text-primary'
                    : 'bg-transparent border-white/5 text-ink-400 hover:bg-white/5 hover:text-ink-200'
                  }`}
              >
                <span className="text-base mt-0.5">{m.icon}</span>
                <div>
                  <div className="text-sm font-semibold leading-tight">{m.label}</div>
                  <div className="text-xs text-ink-400 mt-0.5 leading-tight">{m.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* HSK slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest">
              Nível HSK
            </p>
            <span className={`text-sm font-mono font-bold ${HSK_COLORS[maxHsk] || 'text-ink-200'}`}>
              HSK {maxHsk}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={6}
            value={maxHsk}
            onChange={e => setMaxHsk(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                       bg-ink-700 accent-vermillion-500"
          />
          <div className="flex justify-between mt-1">
            {[1,2,3,4,5,6].map(n => (
              <span key={n} className={`text-xs font-mono ${n <= maxHsk ? HSK_COLORS[n] : 'text-ink-600'}`}>
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Semantic context filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest">
              Contexto Semântico
            </p>
            {context && (
              <button
                onClick={clearContext}
                className="text-xs text-vermillion-400 hover:text-vermillion-300 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTS.map(c => (
              <button
                key={c.value}
                onClick={() => context === c.value ? clearContext() : setContext(c.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-all duration-150 border
                  ${context === c.value
                    ? 'bg-jade-600/20 border-jade-600/50 text-jade-300'
                    : 'bg-transparent border-white/10 text-ink-400 hover:border-white/20 hover:text-ink-200'
                  }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-600 mt-2 italic">
            Intersecção vetorial por campo semântico.
          </p>
        </div>

        {/* Quick root pins */}
        <div>
          <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest mb-3">
            Raízes Rápidas
          </p>
          <div className="flex gap-2 flex-wrap">
            {['一', '人', '木', '口', '水', '火', '日', '女'].map(char => (
              <button
                key={char}
                className="w-10 h-10 rounded-lg bg-ink-800 border border-white/10
                           font-display text-lg text-ink-100 hover:border-vermillion-500/50
                           hover:bg-vermillion-500/10 hover:text-vermillion-300
                           transition-all duration-150 flex items-center justify-center"
                title={`Focar em ${char}`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

      </div>
    </aside>
  );
}
