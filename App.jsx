import React, { useState } from 'react';
import SidebarFilters from './features/SidebarFilters';
import GraphCanvas from './features/GraphCanvas';
import DetailsPanel from './features/DetailsPanel';
import PhraseModal from './features/PhraseModal';
import PhraseSelectionBar from './components/PhraseSelectionBar';
import LumiWarfare from './features/LumiWarfare';
import SiegeMode from './features/SiegeMode';

const MODES = { STUDY: 'study', SIEGE: 'siege', WARFARE: 'warfare' };

export default function App() {
  const [mode, setMode] = useState(MODES.STUDY);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ink-950">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-ink-900 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-vermillion-500 text-xl font-bold tracking-wide">
            {mode === MODES.SIEGE ? 'Modo Cerco' : mode === MODES.WARFARE ? 'Lumi Warfare' : 'Rami'}
          </span>
          <span className="text-ink-400 text-sm font-body">
            {mode === MODES.SIEGE ? '🏯 Defenda desenhando' : mode === MODES.WARFARE ? '⚔️ Campo de Batalha' : '漢字 Graph Explorer'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { key: MODES.STUDY,   label: 'Estudar',  icon: '' },
            { key: MODES.SIEGE,   label: 'Cerco',    icon: '🏯 ' },
            { key: MODES.WARFARE, label: 'Arena',    icon: '⚔ ' },
          ].map(({ key, label, icon }) => (
            <button key={key} onClick={() => setMode(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                mode === key
                  ? key === MODES.SIEGE   ? 'bg-gold-500/10 border-gold-400 text-gold-300'
                  : key === MODES.WARFARE ? 'bg-vermillion-500/10 border-vermillion-500 text-vermillion-400'
                  :                         'bg-white/10 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
              }`}>
              {icon}{label}
            </button>
          ))}
          <span className="text-xs text-ink-400 font-mono border border-white/10 px-2 py-0.5 rounded ml-2">v1.1.0</span>
        </div>
      </header>

      {mode === MODES.SIEGE && (
        <div className="flex-1 relative overflow-hidden bg-ink-950 p-6">
          <SiegeMode hskLevel={1} waveSize={5} onWaveComplete={() => console.log('Onda completa!')} />
        </div>
      )}
      {mode === MODES.WARFARE && (
        <div className="flex-1 relative overflow-hidden bg-ink-950 flex items-center justify-center p-8">
          <LumiWarfare />
        </div>
      )}
      {mode === MODES.STUDY && (
        <>
          <div className="flex flex-1 overflow-hidden relative">
            <SidebarFilters /><GraphCanvas /><DetailsPanel />
          </div>
          <PhraseSelectionBar />
          <PhraseModal />
        </>
      )}
    </div>
  );
}
