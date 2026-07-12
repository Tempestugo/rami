import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import { hanziData } from '@/data/hanziData.js';
import HanziCard from './HanziCard.jsx';

const LEVEL_NAMES = ['', 'Aprendendo', 'Familiar', 'Consolidando', 'Dominando', 'Mestre'];
const SRS_COLORS = {
  1: 'border-red-500/40 bg-red-500/10 text-red-300',
  2: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  3: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  4: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  5: 'border-jade-500/40 bg-jade-500/10 text-jade-300',
};

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function CardCollection() {
  const user = useStore(state => state.user);
  const [knownCards, setKnownCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addingMap, setAddingMap] = useState({});

  const handleAddCard = async (char) => {
    setAddingMap(prev => ({ ...prev, [char]: true }));
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, char, srs_level: 1 })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        // Recarrega as cartas conhecidas
        fetch(`/api/cards/${user?.id}`)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(resData => {
            if (resData.success) {
              const sorted = resData.data.sort((a, b) => {
                if (b.srs_level !== a.srs_level) {
                  return b.srs_level - a.srs_level;
                }
                return a.char.localeCompare(b.char);
              });
              setKnownCards(sorted);
            }
          })
          .catch(console.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingMap(prev => ({ ...prev, [char]: false }));
    }
  };

  const loadKnownCards = useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/cards/${user.id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) {
          // Ordena por SRS level (maior primeiro) e depois por caractere
          const sorted = data.data.sort((a, b) => {
            if (b.srs_level !== a.srs_level) {
              return b.srs_level - a.srs_level;
            }
            return a.char.localeCompare(b.char);
          });
          setKnownCards(sorted);
          setFilteredCards(sorted);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadKnownCards();
  }, [loadKnownCards]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredCards(knownCards);
      return;
    }

    const normalizedSearch = normalize(searchTerm);
    const filtered = knownCards.filter(card => 
      card.char.includes(normalizedSearch) ||
      normalize(card.pinyin).includes(normalizedSearch) ||
      normalize(card.meaning_pt).includes(normalizedSearch)
    );
    setFilteredCards(filtered);
  }, [searchTerm, knownCards]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-jade-300 font-mono">
        Consultando sua Coleção...
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-ink-950 flex flex-col items-center py-8 px-6">
      <div className="w-full max-w-4xl">
        {/* Header e Busca */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="fade-up">
            <h2 className="text-2xl font-display text-jade-400 font-bold">Sua Coleção de Cartas</h2>
            <p className="text-ink-400 text-sm font-body">
              {knownCards.length} ideogramas conhecidos. Busque por caractere, pinyin ou tradução.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-jade-500/10 border border-jade-500/35 hover:bg-jade-500/20 text-jade-300 rounded-lg text-sm font-bold font-mono transition"
            >
              <span></span> Adicionar
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar na coleção..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-ink-900 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-ink-500 focus:outline-none focus:border-jade-500 focus:ring-1 focus:ring-jade-500 text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"></span>
            </div>
          </div>
        </div>

        {/* Grade de Cartas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCards.map((card) => (
            <HanziCard
              key={card.char}
              char={card.char}
              pinyin={card.pinyin}
              meaning={card.meaning_pt || card.meaning}
              family={card.family}
              level={card.srs_level}
            />
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-16 text-ink-500">
            <p>Nenhum resultado para "{searchTerm}".</p>
          </div>
        )}
      </div>

      <AddCardsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        knownCards={knownCards}
        onAddCard={handleAddCard}
        addingMap={addingMap}
      />
    </div>
  );
}

// ─── Modal para Pesquisa e Ingestão de Novas Cartas ─────────────────────────
function AddCardsModal({ isOpen, onClose, knownCards, onAddCard, addingMap }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      // Resultados padrão: primeiros 12 ideogramas do HSK 1 não conhecidos
      const knownSet = new Set(knownCards.map(c => c.char));
      const defaults = hanziData
        .filter(h => h.hsk === 1 && !knownSet.has(h.id))
        .slice(0, 12);
      setResults(defaults);
      return;
    }

    const normalizedQuery = normalize(query);
    const matches = hanziData.filter(h => 
      h.id.includes(normalizedQuery) ||
      normalize(h.pinyin).includes(normalizedQuery) ||
      (h.meaning && normalize(h.meaning).includes(normalizedQuery))
    );
    setResults(matches.slice(0, 30));
  }, [query, knownCards, isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-ink-900 border border-jade-500/30 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[80vh] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="bg-jade-500/10 border-b border-jade-500/20 px-6 py-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-jade-400 font-mono uppercase tracking-widest">Dicionário Master</span>
            <h3 className="text-white font-display font-bold text-lg">Adicionar Ideogramas</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-ink-400 hover:text-white transition text-lg font-bold"
          >
            
          </button>
        </div>

        {/* Input de Busca */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquise por ideograma, pinyin (ex: hao, wo) ou significado..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-ink-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-ink-500 focus:outline-none focus:border-jade-400 focus:ring-1 focus:ring-jade-400 text-sm"
              autoFocus
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-white"
              >
                
              </button>
            )}
          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 min-h-[250px]">
          {results.length > 0 ? (
            results.map(item => {
              const knownCard = knownCards.find(c => c.char === item.id);
              const isKnown = !!knownCard;
              const isAdding = addingMap[item.id];

              return (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isKnown 
                      ? 'border-jade-500/25 bg-jade-500/5' 
                      : 'border-white/5 bg-black/20 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-display font-bold text-white">{item.id}</span>
                    <div>
                      <p className="text-jade-300 font-mono text-sm">{item.pinyin}</p>
                      <p className="text-ink-300 text-xs font-body mt-0.5">{item.meaning}</p>
                      <span className="inline-block text-[9px] font-mono uppercase bg-white/5 text-ink-400 px-1.5 py-0.5 rounded border border-white/10 mt-1">
                        HSK {item.hsk}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isKnown ? (
                      <span className="text-xs font-mono font-bold text-jade-400 bg-jade-500/10 px-2.5 py-1.5 rounded-lg border border-jade-500/20">
                         Conhecido (Lv {knownCard.srs_level})
                      </span>
                    ) : (
                      <button
                        onClick={() => onAddCard(item.id)}
                        disabled={isAdding}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition border border-jade-400/50 text-jade-300 bg-jade-500/10 hover:bg-jade-500/20 disabled:opacity-50"
                      >
                        {isAdding ? 'Adicionando...' : '+ Adicionar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-ink-500 py-12">
              <span className="text-3xl mb-2">‍️</span>
              <p className="text-sm">Nenhum ideograma encontrado para "{query}".</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/20 px-6 py-3 border-t border-white/5 text-[10px] text-ink-500 font-mono">
          Os ideogramas adicionados começam no nível 1 do sistema de repetição espaçada (SRS).
        </div>
      </div>
    </div>
  );
}