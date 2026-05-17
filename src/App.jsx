import React, { useState } from 'react';
import SidebarFilters from './features/SidebarFilters';
import GraphCanvas from './features/GraphCanvas';
import DetailsPanel from './features/DetailsPanel';
import PhraseModal from './features/PhraseModal';
import PhraseSelectionBar from './components/PhraseSelectionBar';
import LumiWarfare from './features/LumiWarfare'; // Importando o novo componente

export default function App() {
  // Estado para alternar entre Explorer (Estudo) e Warfare (Jogo)
  const [gameMode, setGameMode] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ink-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-ink-900 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-vermillion-500 text-xl font-bold tracking-wide">
            {gameMode ? 'Lumi Warfare' : 'Rami'}
          </span>
          <span className="text-ink-400 text-sm font-body">
            {gameMode ? '⚔️ Campo de Batalha' : '漢字 Graph Explorer'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* BOTÃO DE ALTERNÂNCIA */}
          <button 
            onClick={() => setGameMode(!gameMode)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              gameMode 
                ? 'bg-vermillion-500/10 border-vermillion-500 text-vermillion-500 hover:bg-vermillion-500/20' 
                : 'bg-white/5 border-white/10 text-ink-300 hover:bg-white/10'
            }`}
          >
            {gameMode ? 'Voltar para Estudo' : 'Iniciar Combate'}
          </button>

          <span className="text-xs text-ink-400 font-mono border border-white/10 px-2 py-0.5 rounded">
            v1.0.0
          </span>
        </div>
      </header>

      {/* Layout Principal Condicional */}
      {gameMode ? (
        <div className="flex-1 relative overflow-hidden bg-ink-950 flex items-center justify-center p-8">
          <LumiWarfare />
        </div>
      ) : (
        <>
          <div className="flex flex-1 overflow-hidden relative">
            <SidebarFilters />
            <GraphCanvas />
            <DetailsPanel />
          </div>

          {/* Floating phrase selection bar - Apenas no modo estudo */}
          <PhraseSelectionBar />

          {/* Phrase results modal - Apenas no modo estudo */}
          <PhraseModal />
        </>
      )}
    </div>
  );
}