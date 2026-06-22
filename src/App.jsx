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

// Helper para normalizar pinyin (remove acentuação/tons)
function normalizePinyin(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function App() {
  // Estado para alternar entre Explorer, Warfare e Siege
  const [mode, setMode] = useState('explorer'); // 'explorer' | 'warfare' | 'siege' | 'frase' | 'learn' | 'cards'
  const [activeLesson, setActiveLesson] = useState(null); // objeto { id: 'hsk1_s003', type: 'stroke' | 'build' }

  // Estado para buscar as cartas do banco de dados
  const [userCards, setUserCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Estados para busca de novas cartas
  const [allSystemCharacters, setAllSystemCharacters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingChar, setAddingChar] = useState(null);

  const loadCards = () => {
    setLoadingCards(true);
    fetch('/api/cards/1') // Buscando para o user_id = 1 provisoriamente
      .then(r => r.json())
      .then(data => { if (data.success) setUserCards(data.data); })
      .catch(console.error)
      .finally(() => setLoadingCards(false));
  };

  useEffect(() => {
    if (mode === 'cards') {
      loadCards();
      
      // Carrega todos os caracteres do sistema para busca se ainda não carregados
      if (allSystemCharacters.length === 0) {
        fetch('/api/characters')
          .then(r => r.json())
          .then(data => { if (data.success) setAllSystemCharacters(data.data); })
          .catch(console.error);
      }
    }
  }, [mode]);

  const handleAddCard = async (char) => {
    setAddingChar(char);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, char, srs_level: 1 })
      });
      const data = await res.json();
      if (data.success) {
        // Recarrega coleção de cartas
        loadCards();
      } else {
        alert('Erro ao adicionar carta: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao adicionar carta.');
    } finally {
      setAddingChar(null);
    }
  };

  // Filtragem dos resultados de busca baseados na query do usuário
  const filteredResults = searchQuery.trim() === ''
    ? []
    : allSystemCharacters.filter(c => {
        const query = normalizePinyin(searchQuery);
        const charMatch = c.char.includes(searchQuery);
        const pinyinMatch = c.pinyin && normalizePinyin(c.pinyin).includes(query);
        const meaningMatch = c.meaning && c.meaning.toLowerCase().includes(searchQuery.toLowerCase());
        const meaningPtMatch = c.meaning_pt && c.meaning_pt.toLowerCase().includes(searchQuery.toLowerCase());
        return charMatch || pinyinMatch || meaningMatch || meaningPtMatch;
      }).slice(0, 15);

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
          <LearningTrail />
        </div>
      )}

      {mode === 'cards' && (
        <div className="flex-1 relative overflow-y-auto bg-ink-950 p-8">
          {/* Sistema de Busca para Adicionar Cartas */}
          <div className="max-w-6xl mx-auto mb-8 bg-ink-900 border border-white/[0.08] rounded-2xl p-6 shadow-lg">
            <h3 className="text-white text-lg font-bold font-display mb-2">Adicionar Novas Cartas</h3>
            <p className="text-ink-400 text-xs font-body mb-4">Procure por ideogramas, pinyin ou tradução para expandir sua coleção de prática.</p>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Busque ideograma, pinyin ou tradução (ex: 人, ren, água)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-ink-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-body"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition-colors text-sm font-mono"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Resultados da Busca */}
            {searchQuery.trim() !== '' && (
              <div className="mt-4 border-t border-white/[0.05] pt-4">
                <div className="text-ink-400 text-xs font-mono uppercase tracking-wider mb-3">
                  Resultados encontrados ({filteredResults.length})
                </div>
                {filteredResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2">
                    {filteredResults.map((c, i) => {
                      const isAlreadyOwned = userCards.some(uc => uc.char === c.char);
                      const isAdding = addingChar === c.char;

                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-ink-950 border border-white/5 hover:border-purple-500/30 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-display text-white bg-white/5 w-10 h-10 rounded-lg flex items-center justify-center border border-white/10">
                              {c.char}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-purple-300 font-mono text-xs font-bold">{c.pinyin}</span>
                              <span className="text-white text-xs font-body truncate max-w-[150px]">
                                {c.meaning_pt || c.meaning}
                              </span>
                            </div>
                          </div>
                          
                          {isAlreadyOwned ? (
                            <span className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-jade-500/10 border border-jade-500/30 text-jade-400">
                              ✓ Coleção
                            </span>
                          ) : (
                            <button
                              disabled={isAdding}
                              onClick={() => handleAddCard(c.char)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all ${
                                isAdding
                                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 cursor-wait'
                                  : 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30 hover:border-purple-400'
                              }`}
                            >
                              {isAdding ? 'Adicionando...' : '+ Adicionar'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-ink-500 font-body py-6 text-sm">
                    Nenhum caractere encontrado para "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {loadingCards ? (
            <div className="flex h-[200px] items-center justify-center text-azure-300 font-mono">
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