import React, { useState, useEffect } from 'react';
import SidebarFilters from './features/SidebarFilters';
import GraphCanvas from './features/GraphCanvas';
import DetailsPanel from './features/DetailsPanel';
import PhraseModal from './features/PhraseModal';
import PhraseSelectionBar from './components/PhraseSelectionBar';
import LumiWarfare from './features/LumiWarfare'; // Importando o novo componente
import SiegeMode from './features/SiegeMode';
import FraseCook from './features/FraseCook';
import LessonManager from './features/LessonManager';
import HanziCard from './features/HanziCard';
import LearningTrail from './features/LearningTrail';

export default function App() {
  // Estado para alternar entre Explorer, Warfare e Siege
  const [mode, setMode] = useState('explorer'); // 'explorer' | 'warfare' | 'siege' | 'frase' | 'learn' | 'cards'
  const [activeLesson, setActiveLesson] = useState(null); // id da lição (ex: hsk1_s003)

  // Estado para buscar as cartas do banco de dados
  const [userCards, setUserCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    if (mode === 'cards') {
      setLoadingCards(true);
      fetch('/api/cards/1') // Buscando para o user_id = 1 provisoriamente
        .then(r => r.json())
        .then(data => { if (data.success) setUserCards(data.data); })
        .catch(console.error)
        .finally(() => setLoadingCards(false));
    }
  }, [mode]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ink-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-ink-900 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-vermillion-500 text-xl font-bold tracking-wide">
            {mode === 'warfare' ? 'Lumi Warfare'
            : mode === 'siege'   ? 'Modo Cerco'
            : mode === 'frase'   ? '文 FraseCook'
            : mode === 'learn'   ? 'Modo Aprender'
            : mode === 'cards'   ? 'Cartas'
            : 'Rami'}
          </span>
          <span className="text-ink-400 text-sm font-body">
            {mode === 'warfare' ? '⚔️ Campo de Batalha'
            : mode === 'siege'   ? '🏯 Defenda desenhando'
            : mode === 'frase'   ? '🀄 Monte frases em chinês'
            : mode === 'learn'   ? '📖 Aulas e Exercícios'
            : mode === 'cards'   ? '🎴 Coleção de Cartas'
            : '漢字 Graph Explorer'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* BOTÕES DE ALTERNÂNCIA */}
          <button
            onClick={() => setMode('explorer')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              mode === 'explorer'
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
            }`}
          >
            Estudar
          </button>
          <button
            onClick={() => { setMode('learn'); setActiveLesson(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              mode === 'learn'
                ? 'bg-azure-500/10 border-azure-400 text-azure-300'
                : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
            }`}
          >
            📖 Aprender
          </button>
          <button
            onClick={() => setMode('cards')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              mode === 'cards'
                ? 'bg-purple-500/10 border-purple-400 text-purple-300'
                : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
            }`}
          >
            🎴 Cartas
          </button>
          <button
            onClick={() => setMode('siege')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              mode === 'siege'
                ? 'bg-gold-500/10 border-gold-400 text-gold-300'
                : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
            }`}
          >
            🏯 Cerco
          </button>
          <button
            onClick={() => setMode('warfare')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              mode === 'warfare'
                ? 'bg-vermillion-500/10 border-vermillion-500 text-vermillion-400'
                : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
            }`}
          >
            ⚔ Arena
          </button>
          <button
            onClick={() => setMode('frase')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
              mode === 'frase'
                ? 'bg-gold-500/10 border-gold-400 text-gold-300'
                : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
            }`}
          >
            🀄 Frases
          </button>

          <span className="text-xs text-ink-400 font-mono border border-white/10 px-2 py-0.5 rounded ml-2">
            v1.1.0
          </span>
        </div>
      </header>

      {/* Layout Principal Condicional */}
      {mode === 'warfare' && (
        <div className="flex-1 relative overflow-hidden bg-ink-950 flex items-center justify-center p-8">
          <LumiWarfare />
        </div>
      )}
      
      {mode === 'siege' && (
        <div className="flex-1 relative overflow-hidden bg-ink-950 p-6">
          <SiegeMode hskLevel={1} waveSize={5} />
        </div>
      )}

      {mode === 'frase' && (
        <div className="flex-1 relative overflow-hidden bg-ink-950">
          <FraseCook initialHsk={1} initialContext={null} />
        </div>
      )}

      {mode === 'learn' && (
        <div className="flex-1 relative overflow-hidden bg-ink-950">
          {activeLesson ? (
            <LessonManager sentenceId={activeLesson} onComplete={(r) => setActiveLesson(null)} />
          ) : (
            <LearningTrail onSelectLesson={(id) => setActiveLesson(id)} />
          )}
        </div>
      )}

      {mode === 'cards' && (
        <div className="flex-1 relative overflow-y-auto bg-ink-950 p-8">
          {loadingCards ? (
            <div className="flex h-full items-center justify-center text-azure-300 font-mono">
              Invocando suas cartas...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
              {userCards.length > 0 ? userCards.map((c, i) => (
                <HanziCard 
                  key={i} 
                  char={c.char} 
                  pinyin={c.pinyin} 
                  meaning={c.meaning_pt} 
                  family={c.family} 
                  level={c.srs_level} 
                />
              )) : (
                <div className="col-span-full text-center text-ink-500 font-body mt-20">
                  Você ainda não possui nenhuma carta no banco de dados.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'explorer' && (
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