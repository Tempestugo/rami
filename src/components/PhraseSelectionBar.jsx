import React, { useState } from 'react';
import useStore from '../store/useStore';
import { phraseApi } from '../services/api';

export default function PhraseSelectionBar() {
  const {
    phraseSelection,
    clearPhraseSelection,
    togglePhraseSelection,
    setPhraseResults,
    setIsPhraseModalOpen,
  } = useStore();

  const [loading, setLoading] = useState(false);

  if (phraseSelection.length === 0) return null;

  const handleBuildPhrase = async () => {
    setLoading(true);
    try {
      const results = await phraseApi.buildPhrase(phraseSelection);
      setPhraseResults(results);
      setIsPhraseModalOpen(true);
    } catch (err) {
      console.error('Phrase build failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-72 md:right-72 z-40 px-2 md:px-4 pb-4 pointer-events-none">
      <div className="bg-ink-800 border border-gold-500/30 rounded-2xl shadow-2xl px-4 py-3
                      flex items-center gap-3 pointer-events-auto fade-up">

        <span className="text-xs text-ink-400 uppercase tracking-widest shrink-0">
          Frase:
        </span>

        <div className="flex gap-2 flex-wrap flex-1">
          {phraseSelection.map(c => (
            <button
              key={c}
              onClick={() => togglePhraseSelection(c)}
              className="font-display text-xl px-3 py-1 rounded-lg bg-gold-500/15
                         border border-gold-500/40 text-gold-300
                         hover:bg-vermillion-500/20 hover:border-vermillion-500/40 hover:text-vermillion-300
                         transition-all duration-150"
              title="Clique para remover"
            >
              {c}
            </button>
          ))}
        </div>

        <button
          onClick={handleBuildPhrase}
          disabled={loading}
          className="shrink-0 px-4 py-2 rounded-xl bg-jade-600 hover:bg-jade-500
                     text-white text-sm font-semibold transition-all duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? ' Buscando...' : `Formar Frase (${phraseSelection.length})`}
        </button>

        <button
          onClick={clearPhraseSelection}
          className="shrink-0 text-ink-500 hover:text-vermillion-400 transition-colors text-lg leading-none"
          title="Limpar seleção"
        >
          ×
        </button>
      </div>
    </div>
  );
}
