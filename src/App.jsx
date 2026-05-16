import React from 'react';
import SidebarFilters from './features/SidebarFilters';
import GraphCanvas from './features/GraphCanvas';
import DetailsPanel from './features/DetailsPanel';
import PhraseModal from './features/PhraseModal';
import PhraseSelectionBar from './components/PhraseSelectionBar';

export default function App() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ink-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-ink-900 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-vermillion-500 text-xl font-bold tracking-wide">Rami</span>
          <span className="text-ink-400 text-sm font-body">漢字 Graph Explorer</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 font-mono border border-white/10 px-2 py-0.5 rounded">
            v1.0.0
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarFilters />
        <GraphCanvas />
        <DetailsPanel />
      </div>

      {/* Floating phrase selection bar */}
      <PhraseSelectionBar />

      {/* Phrase results modal */}
      <PhraseModal />
    </div>
  );
}
