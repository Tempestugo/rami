import React, { useState, useEffect, useCallback } from 'react';

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
  const [knownCards, setKnownCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);

  const loadKnownCards = useCallback(() => {
    setLoading(true);
    fetch('/api/cards/1')
      .then(res => res.json())
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
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar na coleção..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 bg-ink-900 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-ink-500 focus:outline-none focus:border-jade-500 focus:ring-1 focus:ring-jade-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500">🔍</span>
          </div>
        </div>

        {/* Grade de Cartas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.char}
              title={`${card.pinyin} - ${card.meaning_pt}\nNível SRS: ${card.srs_level} (${LEVEL_NAMES[card.srs_level]})`}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 hover:scale-105 hover:shadow-lg ${SRS_COLORS[card.srs_level] || SRS_COLORS[1]}`}
            >
              <span className="font-display text-4xl text-white font-bold">{card.char}</span>
              <span className="font-mono text-sm opacity-80 mt-1">{card.pinyin}</span>
              <span className="text-xs text-center opacity-60 mt-1 truncate w-full">{card.meaning_pt}</span>
              <span className="mt-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-black/20">
                Lv{card.srs_level}
              </span>
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-16 text-ink-500">
            <p>Nenhum resultado para "{searchTerm}".</p>
          </div>
        )}
      </div>
    </div>
  );
}