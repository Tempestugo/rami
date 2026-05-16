import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import useStore from '../store/useStore';
import ContextImage from '../components/ContextImage'; // Ajuste o caminho se necessário

const HSK_BADGE_COLORS = {
  1: 'bg-azure-600/20 text-azure-300 border-azure-600/30',
  2: 'bg-jade-600/20 text-jade-300 border-jade-600/30',
  3: 'bg-gold-500/20 text-gold-300 border-gold-500/30',
  4: 'bg-vermillion-500/20 text-vermillion-300 border-vermillion-500/30',
  5: 'bg-purple-800/20 text-purple-300 border-purple-700/30',
  6: 'bg-pink-900/20 text-pink-300 border-pink-800/30',
};

export default function DetailsPanel() {
  const { activeChar, togglePhraseSelection, phraseSelection } = useStore();
  const writerTargetRef = useRef(null);
  const writerRef = useRef(null);
  const [quizActive, setQuizActive] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  const isSelected = activeChar ? phraseSelection.includes(activeChar.id) : false;

  useEffect(() => {
    if (activeChar && writerTargetRef.current) {
      writerTargetRef.current.innerHTML = '';
      const writer = HanziWriter.create(writerTargetRef.current, activeChar.id, {
        width: 200,
        height: 200,
        padding: 5,
        showOutline: true,
        strokeColor: '#4361ee',
        // Isso busca o desenho do caractere na nuvem caso o servidor não tenha o JSON
        charDataLoader: (char) => {
          return fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
            .then(res => res.json());
        }
      });

      writerRef.current = writer;
    }
  }, [activeChar]);

  const handleAnimate = () => {
    if (!writerRef.current) return;
    setQuizActive(false);
    setQuizResult(null);
    writerRef.current.cancelQuiz?.();
    writerRef.current.animateCharacter();
  };

  const handleQuiz = () => {
    if (!writerRef.current) return;
    setQuizActive(true);
    setQuizResult(null);
    writerRef.current.quiz({
      onMistake: () => {},
      onComplete: (summary) => {
        setQuizActive(false);
        setQuizResult(summary.totalMistakes);
      }
    });
  };

  if (!activeChar) {
    return (
      <aside className="w-72 shrink-0 bg-ink-900 border-l border-white/[0.08] flex flex-col items-center justify-center z-10">
        <div className="text-center px-6 fade-up">
          <div className="text-5xl mb-4 opacity-20 font-display">漢</div>
          <p className="text-sm text-ink-500 italic leading-relaxed">
            Clique em um caractere no grafo para explorar seus traços e significado.
          </p>
        </div>
      </aside>
    );
  }

  const badgeClass = HSK_BADGE_COLORS[activeChar.hsk] || HSK_BADGE_COLORS[6];

  return (
    <aside className="w-72 shrink-0 bg-ink-900 border-l border-white/[0.08] flex flex-col overflow-y-auto z-10">
      <div className="p-5 flex flex-col items-center gap-4 fade-up">

        <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
          HSK {activeChar.hsk}
        </span>

        <div className="font-display text-7xl text-white leading-none">
          {activeChar.id}
        </div>

        <div className="text-vermillion-400 font-mono text-xl font-bold tracking-wide">
          {activeChar.pinyin}
        </div>

        <div className="text-ink-200 text-sm text-center font-body leading-relaxed">
          {activeChar.meaning}
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center">
          {(activeChar.tags || []).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-ink-400 border border-white/10">
              {tag}
            </span>
          ))}
        </div>

        <div className="w-full h-px bg-white/[0.08]" />

        <div className="relative">
          <div
            ref={writerTargetRef}
            className="rounded-xl bg-ink-800 border border-white/10 cursor-pointer
                       flex items-center justify-center overflow-hidden"
            style={{ width: 160, height: 160 }}
            onClick={handleAnimate}
            title="Clique para animar"
          />
          {quizActive && (
            <div className="absolute top-2 left-2 text-xs bg-gold-500/20 text-gold-300 px-2 py-0.5 rounded-full border border-gold-500/30">
              Modo Quiz
            </div>
          )}
        </div>

        {quizResult !== null && (
          <div className={`text-sm text-center px-3 py-2 rounded-lg border fade-up
            ${quizResult === 0
              ? 'bg-jade-600/20 text-jade-300 border-jade-600/30'
              : 'bg-gold-500/20 text-gold-300 border-gold-500/30'
            }`}>
            {quizResult === 0
              ? '🎉 Perfeito! Nenhum erro.'
              : `✏️ Concluído com ${quizResult} erro${quizResult !== 1 ? 's' : ''}.`
            }
          </div>
        )}

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={handleAnimate}
            className="w-full py-2.5 text-sm font-semibold rounded-lg
                       bg-ink-800 border border-white/15 text-ink-200
                       hover:bg-ink-700 hover:text-white transition-all duration-150"
          >
            ▶ Repetir Animação
          </button>

          <button
            onClick={handleQuiz}
            className="w-full py-2.5 text-sm font-semibold rounded-lg
                       bg-jade-600/20 border border-jade-600/40 text-jade-300
                       hover:bg-jade-600/30 transition-all duration-150"
          >
            ✏️ Modo Quiz (Desenhe)
          </button>

          <button
            onClick={() => togglePhraseSelection(activeChar.id)}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg
                        border transition-all duration-150
                        ${isSelected
                          ? 'bg-gold-500/25 border-gold-500/50 text-gold-300'
                          : 'bg-transparent border-white/15 text-ink-400 hover:border-gold-500/30 hover:text-gold-300'
                        }`}
          >
            {isSelected ? '★ Selecionado para Frase' : '☆ Selecionar para Frase'}
          </button>
        </div>

        {activeChar.components && activeChar.components.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-ink-400 uppercase tracking-widest mb-2">Componentes</p>
            <div className="flex gap-2 flex-wrap">
              {activeChar.components.map(c => (
                <span key={c}
                  className="font-display text-xl w-10 h-10 flex items-center justify-center
                             rounded-lg bg-ink-800 border border-white/10 text-ink-200">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="w-full mt-2">
          <p className="text-xs text-ink-400 uppercase tracking-widest mb-2">Contexto Visual</p>
          <ContextImage term={activeChar.meaning} /> 
        </div>

      </div>
    </aside>
  );
}
