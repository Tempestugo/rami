import React, { useEffect, useRef } from 'react';
import useStore from '../store/useStore';

export default function RadialMenu({ nodeId, x, y, onClose, onSelectForPhrase }) {
  const { phraseSelection } = useStore();
  const ref = useRef(null);

  const isSelected = phraseSelection.includes(nodeId);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuWidth = 200;
  const menuHeight = 130;
  const safeX = Math.min(x + 10, window.innerWidth - menuWidth - 20);
  const safeY = Math.min(y + 10, window.innerHeight - menuHeight - 20);

  return (
    <div
      ref={ref}
      className="absolute z-30 bg-ink-800 border border-white/15 rounded-xl shadow-2xl p-2 fade-up"
      style={{ left: safeX, top: safeY, minWidth: menuWidth }}
    >
      <div className="flex items-center gap-2 px-2 py-1.5 mb-1 border-b border-white/[0.08]">
        <span className="font-display text-2xl text-white">{nodeId}</span>
        <span className="text-xs text-ink-500">Ações</span>
      </div>

      <button
        onClick={() => onSelectForPhrase(nodeId)}
        className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm
          transition-colors duration-100
          ${isSelected
            ? 'text-gold-300 bg-gold-500/15 hover:bg-gold-500/20'
            : 'text-ink-300 hover:bg-white/[0.08] hover:text-white'
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
