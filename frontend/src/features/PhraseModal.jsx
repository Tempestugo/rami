import React from 'react';
import useStore from '../store/useStore';

export default function PhraseModal() {
  const { isPhraseModalOpen, setIsPhraseModalOpen, phraseResults, phraseSelection, clearPhraseResults, clearPhraseSelection } = useStore();

  if (!isPhraseModalOpen) return null;

  const handleClose = () => {
    setIsPhraseModalOpen(false);
    clearPhraseResults();
    clearPhraseSelection();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-ink-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 fade-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-ink-100">Construtor de Frases</h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Caracteres selecionados: {phraseSelection.join(' · ')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-ink-500 hover:text-ink-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Results */}
        {phraseResults.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-ink-500 text-sm italic">
              Nenhuma frase encontrada com essa combinação.
            </p>
            <p className="text-ink-600 text-xs mt-2">
              Tente selecionar caracteres mais comuns (HSK 1–2).
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {phraseResults.map((result, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-ink-800 p-4 flex flex-col gap-2"
              >
                {/* Phrase */}
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl text-gold-300 tracking-wider">
                    {result.phrase}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-azure-600/20 text-azure-300 border border-azure-600/30">
                    HSK {result.hsk}
                  </span>
                  <span className="text-xs text-jade-400 ml-auto">
                    {Math.round(result.coverage * 100)}% match
                  </span>
                </div>

                {/* Pinyin */}
                <div className="text-vermillion-400 font-mono text-sm">
                  {result.pinyin}
                </div>

                {/* Translation */}
                <div className="text-ink-300 text-sm">
                  {result.translation}
                </div>

                {/* Highlight which chars matched */}
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {phraseSelection.map(c => (
                    <span
                      key={c}
                      className={`font-display text-base px-2 py-0.5 rounded-md
                        ${result.chars.includes(c)
                          ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30'
                          : 'bg-ink-700 text-ink-500 border border-white/5'
                        }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-ink-800 border border-white/15
                       text-sm text-ink-300 hover:text-white hover:bg-ink-700 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
