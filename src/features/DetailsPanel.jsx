import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import useStore from '../store/useStore';
// 1. Importe o componente que você criou
import ContextImage from '../components/ContextImage'; 

const HSK_BADGE_COLORS = {
  1: 'bg-azure-600/20 text-azure-300 border-azure-600/30',
  2: 'bg-jade-600/20 text-jade-300 border-jade-600/30',
  3: 'bg-gold-500/20 text-gold-300 border-gold-500/30',
  4: 'bg-vermillion-500/20 text-vermillion-300 border-vermillion-500/30',
  5: 'bg-purple-800/20 text-purple-300 border-purple-700/30',
  6: 'bg-pink-900/20 text-pink-300 border-pink-800/30',
};

const LEVEL_NAMES = ['', 'Aprendendo', 'Familiar', 'Consolidando', 'Dominando', 'Mestre'];

export default function DetailsPanel() {
  const { activeChar, togglePhraseSelection, phraseSelection, user } = useStore();
  const writerTargetRef = useRef(null);
  const writerRef = useRef(null);
  const [quizActive, setQuizActive] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [srsState, setSrsState] = useState({ known: false, level: 1, practice_count: 0 });
  const [loadingSrs, setLoadingSrs] = useState(false);

  useEffect(() => {
    if (activeChar) setIsOpen(true);
  }, [activeChar]);

  useEffect(() => {
    if (!activeChar || !user) return;
    setLoadingSrs(true);
    fetch(`/api/cards/${user.id}/status/${encodeURIComponent(activeChar.id)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSrsState({ 
            known: data.known, 
            level: data.srs_level || 1,
            practice_count: data.practice_count || 0
          });
        }
      })
      .catch(err => console.error('Erro ao buscar status do card:', err))
      .finally(() => setLoadingSrs(false));
  }, [activeChar]);

  const handleAddToKnown = async () => {
    if (!activeChar) return;
    setLoadingSrs(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, char: activeChar.id, srs_level: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setSrsState({ known: true, level: 1, practice_count: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSrs(false);
    }
  };

  const handleUpdateSrsLevel = async (level) => {
    if (!activeChar) return;
    setLoadingSrs(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, char: activeChar.id, srs_level: level })
      });
      const data = await res.json();
      if (data.success) {
        setSrsState({ known: true, level, practice_count: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSrs(false);
    }
  };

  const handleRemoveFromKnown = async () => {
    if (!activeChar) return;
    setLoadingSrs(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, char: activeChar.id })
      });
      const data = await res.json();
      if (data.success) {
        setSrsState({ known: false, level: 1, practice_count: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSrs(false);
    }
  };

  const handlePronounce = () => {
    if (!activeChar || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeChar.id);
    utterance.lang = 'zh-CN';
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh-') || v.lang.startsWith('zho') || v.lang === 'zh-CN');
    if (zhVoice) utterance.voice = zhVoice;
    window.speechSynthesis.speak(utterance);
  };

  const isSelected = activeChar ? phraseSelection.includes(activeChar.id) : false;

  useEffect(() => {
    if (!activeChar || !writerTargetRef.current) return;

    setQuizActive(false);
    setQuizResult(null);

    if (writerRef.current) {
      try { writerRef.current.cancelQuiz?.(); } catch {}
    }
    writerTargetRef.current.innerHTML = '';

    const writer = HanziWriter.create(writerTargetRef.current, activeChar.id, {
      width: 160,
      height: 160,
      padding: 5,
      showOutline: true,
      strokeColor: '#4361ee',
      // IMPORTANTE: Carrega os dados dos traços via CDN
      charDataLoader: (char) => {
        return fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
          .then(res => res.json());
      }
    });

    writerRef.current = writer;

    // Adicionado um pequeno delay para garantir que o CDN carregue os dados antes de animar
    const timeout = setTimeout(() => {
      writerRef.current?.animateCharacter();
    }, 500);
    return () => clearTimeout(timeout);
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
      <aside className="hidden md:flex w-72 shrink-0 bg-ink-900 border-l border-white/[0.08] flex-col items-center justify-center z-10">
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
    <>
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed md:static inset-y-0 right-0 z-50 w-72 shrink-0 bg-ink-900 border-l border-white/[0.08] flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
        <div className="p-5 flex flex-col items-center gap-4 fade-up relative">
          
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-4 left-4 text-ink-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

        <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass} mt-4 md:mt-0`}>
          HSK {activeChar.hsk}
        </span>

        <div className="font-display text-7xl text-white leading-none">
          {activeChar.id}
        </div>

        <div className="text-vermillion-400 font-mono text-xl font-bold tracking-wide flex items-center gap-2">
          <span>{activeChar.pinyin}</span>
          <button 
            onClick={handlePronounce}
            className="text-ink-400 hover:text-vermillion-400 transition-colors p-1 rounded hover:bg-white/5"
            title="Ouvir pronúncia em chinês"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
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

        {/* --- CONHECIDO / SRS LEVEL SELECTOR --- */}
        <div className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-400 font-mono uppercase tracking-wider">Progresso de Estudo</span>
            {loadingSrs ? (
              <span className="text-[10px] text-ink-500 font-mono animate-pulse">Carregando...</span>
            ) : srsState.known ? (
              <span className="text-[10px] text-jade-400 font-mono font-bold uppercase">Conhecido</span>
            ) : (
              <span className="text-[10px] text-ink-500 font-mono uppercase">Não aprendido</span>
            )}
          </div>

          {loadingSrs ? (
            <div className="h-10 flex items-center justify-center text-xs text-ink-500 font-mono">
              Consultando biblioteca...
            </div>
          ) : !srsState.known ? (
            <button
              onClick={handleAddToKnown}
              className="w-full py-2 text-xs font-bold uppercase tracking-wider rounded-lg
                         bg-vermillion-500/10 border border-vermillion-500/30 text-vermillion-400
                         hover:bg-vermillion-500/20 hover:border-vermillion-500/50 transition-all duration-150"
            >
               Adicionar aos Conhecidos
            </button>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const isActive = srsState.level === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => handleUpdateSrsLevel(lvl)}
                      title={`Nível ${lvl} - ${LEVEL_NAMES[lvl]}`}
                      className={`flex-1 py-1.5 rounded font-mono text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-jade-500/15 border-jade-500 text-jade-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8 hover:text-ink-200'
                      }`}
                    >
                      L{lvl}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-ink-400 font-body text-center italic">
                {LEVEL_NAMES[srsState.level] || 'Nível'} (SRS)
                {srsState.level < 5 && ` • ${srsState.practice_count || 0}/5 práticas corretas para subir`}
              </p>
              <button
                onClick={handleRemoveFromKnown}
                className="w-full py-1 text-[10px] font-bold uppercase tracking-wider rounded border border-red-900/30 text-red-400/80 bg-red-950/10 hover:bg-red-950/20 hover:text-red-400 transition-all duration-150"
              >
                Remover da Coleção
              </button>
            </div>
          )}
        </div>

        <div className="w-full h-px bg-white/[0.08]" />

        {/* 3. CHAMADA DO CONTEXT IMAGE AQUI */}
        <div className="w-full">
           <p className="text-xs text-ink-400 uppercase tracking-widest mb-2">Contexto Visual</p>
           <ContextImage term={activeChar.meaning} />
        </div>

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
              ? 'Perfeito! Nenhum erro.'
              : `Concluído com ${quizResult} erro${quizResult !== 1 ? 's' : ''}.`
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
            Repetir Animação
          </button>

          <button
            onClick={handleQuiz}
            className="w-full py-2.5 text-sm font-semibold rounded-lg
                       bg-jade-600/20 border border-jade-600/40 text-jade-300
                       hover:bg-jade-600/30 transition-all duration-150"
          >
            Modo Quiz (Desenhe)
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
            {isSelected ? 'Selecionado para Frase' : 'Selecionar para Frase'}
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

      </div>
    </aside>
    </>
  );
}