import React from 'react';
import useStore from '../store/useStore';

export default function RadialMenu({ position, nodeId, onExpand, onClose }) {
  const { toggleSelection, selectedChars } = useStore();
  const isSelected = selectedChars.includes(nodeId);

  // Se não houver posição ou nó, não desenha o menu
  if (!position || !nodeId) return null;

  return (
    <div
      className="absolute z-50 flex flex-col gap-2 bg-white p-3 rounded-xl shadow-xl border border-gray-200 transition-all"
      style={{ left: position.x + 15, top: position.y - 60 }}
    >
      <div className="text-center font-bold text-xl text-gray-800 border-b pb-1 mb-1">
        {nodeId}
      </div>
      
      {/* Botão de Seleção (Bandeja de Frases) */}
      <button
        onClick={() => { toggleSelection(nodeId); onClose(); }}
        className={`text-sm px-4 py-2 rounded-md text-white font-medium transition-colors ${
          isSelected ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'
        }`}
      >
        {isSelected ? 'Desmarcar' : 'Adicionar à Frase'}
      </button>

      {/* Botões de Expansão (Lazy Loading) */}
      <button 
        onClick={() => { onExpand('sim'); onClose(); }} 
        className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-semibold text-left"
      >
        ✨ +1 Traço (Visual)
      </button>
      
      <button 
        onClick={() => { onExpand('dag'); onClose(); }} 
        className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-semibold text-left"
      >
        🔍 Decompor (Raízes)
      </button>
      
      <button 
        onClick={() => { onExpand('evo'); onClose(); }} 
        className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 font-semibold text-left"
      >
        🌿 Compor (Palavras)
      </button>

      <button 
        onClick={onClose} 
        className="text-xs text-gray-400 mt-1 hover:text-red-500 text-center font-medium"
      >
        ✕ Fechar
      </button>
    </div>
  );
}