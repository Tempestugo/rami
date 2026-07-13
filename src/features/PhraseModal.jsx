import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import AutoTranslate from '../components/AutoTranslate';

const PAGE_SIZE = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PhraseModal() {
  const { isPhraseModalOpen, setIsPhraseModalOpen, phraseResults, phraseSelection, clearPhraseResults, clearPhraseSelection } = useStore();

  const [displayed, setDisplayed] = useState([]);
  const [usedIndices, setUsedIndices] = useState(new Set());

  useEffect(() => {
    if (isPhraseModalOpen) {
      setDisplayed(phraseResults.slice(0, PAGE_SIZE));
      setUsedIndices(new Set(phraseResults.slice(0, PAGE_SIZE).map((_, i) => i)));
    }
  }, [phraseResults, isPhraseModalOpen]);

  const handleClose = () => {
    setIsPhraseModalOpen(false);
    clearPhraseResults();
    clearPhraseSelection();
  };

  const handleShuffle = useCallback(() => {
    // Pega até PAGE_SIZE aleatórios dos resultados que ainda não foram mostrados
    const remaining = phraseResults
      .map((r, i) => ({ r, i }))
      .filter(({ i }) => !usedIndices.has(i));

    if (remaining.length === 0) {
      // Reinicia o ciclo — embaralha tudo de novo
      const allIndexed = phraseResults.map((r, i) => ({ r, i }));
      const newBatch = shuffle(allIndexed).slice(0, PAGE_SIZE);
      setDisplayed(newBatch.map(({ r }) => r));
      setUsedIndices(new Set(newBatch.map(({ i }) => i)));
      return;
    }

    const batch = shuffle(remaining).slice(0, PAGE_SIZE);
    const newIndices = new Set([...usedIndices, ...batch.map(({ i }) => i)]);
    setDisplayed(batch.map(({ r }) => r));
    setUsedIndices(newIndices);
  }, [phraseResults, usedIndices]);

  if (!isPhraseModalOpen) return null;

  const hasMore = phraseResults.length > PAGE_SIZE;
  const remaining = phraseResults.length - usedIndices.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-ink-900 border border-white/15 rounded-2xl shadow-2xl w-full max-w-lg p-6 fade-up flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-ink-100">Construtor de Frases</h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Selecionados: <span className="text-gold-400 font-mono">{phraseSelection.join(' + ')}</span>
              {phraseResults.length > 0 && (
                <span className="ml-2 text-ink-600">· {phraseResults.length} frases encontradas</span>
              )}
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
        {displayed.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-ink-500 text-sm italic">
              Nenhuma frase encontrada com essa combinação.
            </p>
            <p className="text-ink-600 text-xs mt-2">
              Tente selecionar caracteres mais comuns (HSK 1–2).
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto pr-2 scrollbar-thin flex-1">
            {displayed.map((result, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-ink-800 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl text-gold-300 tracking-wider">
                    {result.phrase}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-azure-600/20 text-azure-300 border border-azure-600/30">
                    HSK {result.hsk}
                  </span>
                  <span className="text-xs text-jade-300 ml-auto">
                    {Math.round(result.coverage * 100)}% match
                  </span>
                </div>

                <div className="text-vermillion-400 font-mono text-sm">
                  {result.pinyin}
                </div>

                <div className="text-ink-300 text-sm">
                  <AutoTranslate text={result.translation} />
                </div>

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
        <div className="mt-5 flex items-center justify-between gap-3 shrink-0">
          {hasMore ? (
            <button
              onClick={handleShuffle}
              className="px-4 py-2 rounded-lg bg-indigo-600/15 border border-indigo-500/30 text-indigo-300
                         text-sm font-semibold hover:bg-indigo-600/25 hover:border-indigo-400/50 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {remaining > 0 ? `Outras 10 (${remaining} restantes)` : 'Embaralhar tudo'}
            </button>
          ) : (
            <span />
          )}

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
