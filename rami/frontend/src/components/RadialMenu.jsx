import React, { useEffect, useRef } from 'react';
import useStore from '../store/useStore';

/**
 * RadialMenu
 * Floats over the graph canvas at the clicked node's DOM coordinates.
 * Provides quick actions: Select for Phrase, View Details (auto), Close Branch (future).
 */
export default function RadialMenu({ nodeId, x, y, onClose, onSelectForPhrase, onExpand }) {
  const { phraseSelection } = useStore();
  const ref = useRef(null);

  const isSelected = phraseSelection.includes(nodeId);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Keep menu inside viewport
  const menuWidth = 200;
  const menuHeight = 250;
  const safeX = Math.min(x + 10, window.innerWidth - menuWidth - 20);
  const safeY = Math.min(y + 10, window.innerHeight - menuHeight - 20);

  return (
    <div
      ref={ref}
      className="absolute z-30 bg-ink-800 border border-white/15 rounded-xl shadow-2xl p-2 fade-up"
      style={{ left: safeX, top: safeY, minWidth: menuWidth }}
    >
      {/* Node label */}
      <div className="flex items-center gap-2 px-2 py-1.5 mb-1 border-b border-white/8">
        <span className="font-display text-2xl text-white">{nodeId}</span>
        <span className="text-xs text-ink-500">Ações</span>
      </div>

      {/* Actions */}
      <button
        onClick={() => { onExpand(nodeId, 'sim'); onClose(); }}
        className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-ink-300 hover:bg-white/8 hover:text-white transition-colors mb-1"
        title="Mostrar formas visualmente similares (+1 traço)"
      >
        <span>〰️</span>
        +1 Traço
      </button>

      <button
        onClick={() => { onExpand(nodeId, 'dag'); onClose(); }}
        className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-ink-300 hover:bg-white/8 hover:text-white transition-colors mb-1"
        title="Do que este caractere é feito?"
      >
        <span>🔬</span>
        Decompor ▼
      </button>

      <button
        onClick={() => { onExpand(nodeId, 'evo'); onClose(); }}
        className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-ink-300 hover:bg-white/8 hover:text-white transition-colors mb-2 border-b border-white/8 pb-2 rounded-none"
        title="Quais caracteres usam este como componente?"
      >
        <span>🌿</span>
        Compor ▲
      </button>

      <button
        onClick={() => { onSelectForPhrase(nodeId); onClose(); }}
        className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm
          transition-colors duration-100 mb-1
          ${isSelected
            ? 'text-gold-300 bg-gold-500/15 hover:bg-gold-500/20'
            : 'text-ink-300 hover:bg-white/8 hover:text-white'
          }`}
      >
        <span>{isSelected ? '★' : '☆'}</span>
        {isSelected ? 'Remover da Frase' : 'Selec. para Frase'}
      </button>

      <button
        onClick={onClose}
        className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm
                   text-ink-500 hover:bg-white/5 hover:text-ink-300 transition-colors"
      >
        <span>×</span>
        Fechar menu
      </button>
    </div>
  );
}
