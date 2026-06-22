import React, { useState, useEffect, useRef, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';
import { hanziData } from '../../api/_data/hanziData.js';

const LEVEL_NAMES = ['', 'Aprendendo', 'Familiar', 'Consolidando', 'Dominando', 'Mestre'];
const SRS_COLORS = {
  1: 'text-red-400 border-red-500/30 bg-red-500/10',
  2: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  3: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  4: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  5: 'text-jade-400 border-jade-500/30 bg-jade-500/10',
};

// Helper para normalizar pinyin (remove acentuação)
function normalizePinyin(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/v/g, 'ü')
    .trim();
}

const hanziMap = new Map(hanziData.map(h => [h.id, h]));

function getCharacterContext(char) {
  const charObj = hanziMap.get(char);
  if (!charObj || !charObj.tags) return 'outros';
  const tags = charObj.tags;
  if (tags.includes('comida') || tags.includes('cozinha')) return 'cozinha';
  if (tags.includes('natureza') || tags.includes('clima') || tags.includes('tempo')) return 'natureza';
  if (tags.includes('pessoa') || tags.includes('familia') || tags.includes('animal')) return 'pessoas';
  if (tags.includes('estudo') || tags.includes('acao')) return 'estudo';
  if (tags.includes('casa') || tags.includes('cotidiano')) return 'casa';
  return 'outros';
}

const CONTEXTS = [
  { id: 'all', label: 'Todos os Contextos', icon: '🌌', color: 'border-white/10 text-white bg-white/5 hover:bg-white/10' },
  { id: 'cozinha', label: 'Culinária / Cozinha', icon: '🍚', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10' },
  { id: 'natureza', label: 'Natureza / Clima', icon: '🌲', color: 'border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/10' },
  { id: 'pessoas', label: 'Pessoas / Família', icon: '👥', color: 'border-yellow-300/30 text-yellow-300 bg-yellow-300/5 hover:bg-yellow-300/10' },
  { id: 'estudo', label: 'Ações / Estudos', icon: '📚', color: 'border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10' },
  { id: 'casa', label: 'Casa / Cotidiano', icon: '🏡', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' },
];

export default function LearningTrail() {
  // Estados de Fluxo: 'DASHBOARD' | 'PRACTICING' | 'SUMMARY'
  const [viewState, setViewState] = useState('DASHBOARD');
  
  // Estado das Cartas Conhecidas
  const [knownCards, setKnownCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  
  // Configuração da Sessão de Treino
  const [practiceType, setPracticeType] = useState('mixed'); // 'drawing' | 'pinyin' | 'mixed'
  const [sessionPhrases, setSessionPhrases] = useState([]);
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [sessionHistory, setSessionHistory] = useState([]); // { phrase, originalLevels: {}, newLevels: {} }
  const [selectedContext, setSelectedContext] = useState('all');
  
  // Estados da Pergunta Ativa
  const [activePhrase, setActivePhrase] = useState(null);
  const [activeCase, setActiveCase] = useState(1); // 1 = Desenho, 2 = Pinyin
  const [showPinyin, setShowPinyin] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  
  // Estados de Controle do Caso 1 (Desenho)
  const [completedChars, setCompletedChars] = useState({}); // { '我': true }
  const [drawingChar, setDrawingChar] = useState(null);
  const [drawingCharDetail, setDrawingCharDetail] = useState({ pinyin: '', meaning: '' });
  const [mistakesCount, setMistakesCount] = useState(0);
  const [srsSelfAssessment, setSrsSelfAssessment] = useState(null); // 'review_phase'
  const [assessmentVotes, setAssessmentVotes] = useState({}); // { '我': 'remembered'|'forgot' }
  const writerDivRef = useRef(null);
  const writerRef = useRef(null);
  
  // Estados de Controle do Caso 2 (Pinyin)
  const [pinyinInputs, setPinyinInputs] = useState({}); // { charIndex: 'wo' }
  const [pinyinChecked, setPinyinChecked] = useState(false);
  const [pinyinResults, setPinyinResults] = useState({}); // { charIndex: true|false }

  // 1. Carregar cartas conhecidas no Dashboard
  const loadKnownCards = useCallback(() => {
    setLoadingCards(true);
    fetch('/api/cards/1')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setKnownCards(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCards(false));
  }, []);

  useEffect(() => {
    loadKnownCards();
  }, [loadKnownCards]);

  // 2. Iniciar Sessão de Treino
  const startSession = async (type) => {
    if (knownCards.length === 0) return;
    setPracticeType(type);
    setLoadingCards(true);

    try {
      // Pega todos os caracteres conhecidos pelo usuário
      const chars = knownCards.map(c => c.char);
      
      // Busca frases contendo estes caracteres no banco (cobertura >= 80% do caractere no backend)
      const res = await fetch('/api/phrases/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chars })
      });
      const resData = await res.json();
      
      let phrases = [];
      if (resData.success && resData.data && resData.data.length > 0) {
        phrases = resData.data;
      }
      
      // Fallback: se não achar frases contendo as cartas conhecidas, pega frases padrão
      if (phrases.length < 3) {
        const fallbackRes = await fetch('/api/lessons');
        const fallbackData = await fallbackRes.json();
        if (fallbackData) {
          const mapped = fallbackData.map(s => ({
            phrase: s.hanzi,
            pinyin: Array.isArray(s.pinyin) ? s.pinyin.join(' ') : s.pinyin,
            translation: s.translation_pt,
            chars: [...s.hanzi].filter(c => c.trim())
          }));
          phrases = [...phrases, ...mapped];
        }
      }

      // Filtra a lista de frases para apenas conter frases que têm pelo menos um caractere do contexto ativo
      if (selectedContext !== 'all') {
        phrases = phrases.filter(p => {
          return [...p.phrase].some(char => {
            return getCharacterContext(char) === selectedContext;
          });
        });
      }

      if (phrases.length === 0) {
        alert('Não encontramos frases contendo os caracteres deste contexto no banco de frases.');
        setLoadingCards(false);
        return;
      }

      // Separa em frases curtas (<= 6 caracteres) e longas (> 6 caracteres)
      const shortPhrases = phrases.filter(p => p.phrase.length <= 6).sort(() => 0.5 - Math.random());
      const longPhrases = phrases.filter(p => p.phrase.length > 6).sort(() => 0.5 - Math.random());

      // Intercala frases curtas e longas
      const sessionList = [];
      let sIdx = 0;
      let lIdx = 0;
      let preferShort = true;

      while (sessionList.length < 5 && (sIdx < shortPhrases.length || lIdx < longPhrases.length)) {
        if (preferShort) {
          if (sIdx < shortPhrases.length) {
            sessionList.push(shortPhrases[sIdx++]);
          } else if (lIdx < longPhrases.length) {
            sessionList.push(longPhrases[lIdx++]);
          }
        } else {
          if (lIdx < longPhrases.length) {
            sessionList.push(longPhrases[lIdx++]);
          } else if (sIdx < shortPhrases.length) {
            sessionList.push(shortPhrases[sIdx++]);
          }
        }
        preferShort = !preferShort;
      }

      setSessionPhrases(sessionList);
      setCurrentPhraseIdx(0);
      setSessionHistory([]);
      setupPhrase(sessionList[0], type);
      setViewState('PRACTICING');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCards(false);
    }
  };

  // 3. Configurar Frase Ativa
  const setupPhrase = (phraseObj, type) => {
    setActivePhrase(phraseObj);
    setShowPinyin(false);
    setShowMeaning(false);
    setCompletedChars({});
    setDrawingChar(null);
    setSrsSelfAssessment(null);
    setAssessmentVotes({});
    setPinyinInputs({});
    setPinyinChecked(false);
    setPinyinResults({});
    setMistakesCount(0);

    // Determina o caso de teste (Caso 1 ou Caso 2)
    if (type === 'drawing') {
      setActiveCase(1);
    } else if (type === 'pinyin') {
      setActiveCase(2);
    } else {
      // Mixed: escolhe aleatoriamente
      setActiveCase(Math.random() > 0.5 ? 1 : 2);
    }
  };

  // 4. Lógica de Desenho (Caso 1)
  const openDrawingPad = (char) => {
    setDrawingChar(char);
    setMistakesCount(0);
    const card = knownCards.find(c => c.char === char);
    if (card) {
      setDrawingCharDetail({ pinyin: card.pinyin, meaning: card.meaning_pt });
    } else {
      setDrawingCharDetail({ pinyin: 'Carregando...', meaning: '' });
      fetch(`/api/graph/character/${char}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setDrawingCharDetail({
              pinyin: res.data.pinyin,
              meaning: res.data.meaning
            });
          } else {
            setDrawingCharDetail({ pinyin: '', meaning: '' });
          }
        })
        .catch(() => {
          setDrawingCharDetail({ pinyin: '', meaning: '' });
        });
    }
  };

  const handleCloseDrawingPad = () => {
    if (writerRef.current) {
      try { writerRef.current.cancelQuiz(); } catch (_) {}
    }
    setDrawingChar(null);
  };

  const initHanziWriter = useCallback((char) => {
    if (!writerDivRef.current) return;
    
    writerDivRef.current.innerHTML = '';
    
    const writer = HanziWriter.create(writerDivRef.current, char, {
      width: 200,
      height: 200,
      padding: 15,
      showOutline: false, // COMEÇA INVISÍVEL como pedido!
      showCharacter: false,
      showHintAfterMisses: 5,
      strokeColor: '#10b981', // Jade 500
      drawingColor: '#10b981',
      drawingWidth: 6,
      outlineColor: 'rgba(255, 255, 255, 0.15)',
      charDataLoader: (c) => {
        return fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${c}.json`)
          .then(res => res.json());
      }
    });

    writerRef.current = writer;

    // Configura eventos de toque/mouse no SVG
    requestAnimationFrame(() => {
      const svg = writerDivRef.current?.querySelector('svg');
      if (svg) {
        svg.style.pointerEvents = 'auto';
        svg.style.touchAction = 'none';
        svg.style.cursor = 'crosshair';
        svg.querySelectorAll('*').forEach(el => {
          el.style.pointerEvents = 'auto';
        });
      }
    });

    writer.quiz({
      showHintAfterMisses: 5,
      onMistake: () => {
        setMistakesCount(prev => {
          const next = prev + 1;
          if (next >= 5) {
            // Revela outline após 5 erros
            writer.showOutline();
          }
          return next;
        });
      },
      onComplete: () => {
        setCompletedChars(prev => ({ ...prev, [char]: true }));
        setTimeout(() => {
          handleCloseDrawingPad();
        }, 600);
      }
    });
  }, []);

  useEffect(() => {
    if (drawingChar) {
      // Delay pequeno para garantir montagem do ref
      const timeout = setTimeout(() => {
        initHanziWriter(drawingChar);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [drawingChar, initHanziWriter]);

  // Revela dica manualmente
  const handleShowHint = () => {
    if (writerRef.current) {
      writerRef.current.showOutline();
      setMistakesCount(5); // força estado de dica ativa
    }
  };

  // Concluir Desenho de todos os caracteres da frase -> Iniciar Auto-avaliação SRS
  const handleFinishDrawingSession = () => {
    // Entra na fase de votação SRS
    setSrsSelfAssessment('review_phase');
    
    // Inicializa votos: se o caractere foi desenhado de primeira sem dica (erros < 3), vota "lembrei", senão "esqueci"
    const initialVotes = {};
    const phraseChars = [...activePhrase.phrase].filter(c => c.trim());
    phraseChars.forEach(c => {
      initialVotes[c] = 'remembered'; // padrão inicial amigável
    });
    setAssessmentVotes(initialVotes);
  };

  const handleVoteChar = (char, vote) => {
    setAssessmentVotes(prev => ({ ...prev, [char]: vote }));
  };

  // 5. Lógica de Validação Pinyin (Caso 2)
  const handlePinyinInputChange = (idx, value) => {
    setPinyinInputs(prev => ({ ...prev, [idx]: value }));
  };

  const handleCheckPinyinAnswers = () => {
    const chars = [...activePhrase.phrase].filter(c => c.trim());
    
    // O pinyin retornado pode conter espaços ou ser um texto corrido.
    // Vamos separar o pinyin oficial da frase por espaços
    const officialPinyinArray = activePhrase.pinyin.split(/\s+/);
    
    const results = {};
    const votes = {};
    
    chars.forEach((char, idx) => {
      const userInput = normalizePinyin(pinyinInputs[idx] || '');
      const correctAnswer = normalizePinyin(officialPinyinArray[idx] || '');
      
      const isCorrect = userInput === correctAnswer;
      results[idx] = isCorrect;
      
      // Determina voto baseado na correção da resposta do pinyin
      votes[char] = isCorrect ? 'remembered' : 'forgot';
    });

    setPinyinResults(results);
    setPinyinChecked(true);
    setAssessmentVotes(votes);
  };

  // 6. Submeter Resultados da Pergunta e Atualizar Banco de Dados
  const handleSubmitPhraseResults = async () => {
    // Coleta os níveis SRS atuais das cartas conhecidas envolvidas nesta frase
    const originalLevels = {};
    const newLevels = {};
    const updates = [];

    const charsInPhrase = [...activePhrase.phrase].filter(c => c.trim());

    for (const char of charsInPhrase) {
      const knownCardObj = knownCards.find(c => c.char === char);
      const currentLevel = knownCardObj ? knownCardObj.srs_level : 1;
      originalLevels[char] = currentLevel;

      // Se lembrou: sobe level (+1), se esqueceu: desce (-1)
      const vote = assessmentVotes[char] || 'remembered';
      let nextLevel = currentLevel;
      if (vote === 'remembered') {
        nextLevel = Math.min(5, currentLevel + 1);
      } else {
        nextLevel = Math.max(1, currentLevel - 1);
      }
      newLevels[char] = nextLevel;

      // Apenas atualiza no banco se a carta realmente já for conhecida
      if (knownCardObj) {
        updates.push(
          fetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1, char, srs_level: nextLevel })
          })
        );
      }
    }

    // Executa atualizações em background
    try {
      await Promise.all(updates);
    } catch (e) {
      console.error('Erro ao atualizar SRS no banco de dados:', e);
    }

    // Salva histórico local da sessão
    setSessionHistory(prev => [
      ...prev,
      {
        phrase: activePhrase.phrase,
        translation: activePhrase.translation,
        originalLevels,
        newLevels
      }
    ]);

    goToNextPhrase();
  };

  const goToNextPhrase = () => {
    // Avança para próxima frase ou encerra sessão
    const nextIdx = currentPhraseIdx + 1;
    if (nextIdx < sessionPhrases.length) {
      setCurrentPhraseIdx(nextIdx);
      setupPhrase(sessionPhrases[nextIdx], practiceType);
    } else {
      // Salva a data da última sessão de prática
      localStorage.setItem('rami_last_practice_date', new Date().toISOString());
      // Recarrega cards atualizados para o dashboard
      loadKnownCards();
      setViewState('SUMMARY');
    }
  };

  const lastPracticeDate = localStorage.getItem('rami_last_practice_date');
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const canPractice = !lastPracticeDate || new Date(lastPracticeDate) < threeDaysAgo;

  // 7. Renderização do Dashboard Inicial
  if (viewState === 'DASHBOARD') {
    if (loadingCards) {
      return (
        <div className="flex h-full items-center justify-center text-azure-300 font-mono">
          Consultando seu Dicionário...
        </div>
      );
    }

    return (
      <div className="w-full h-full overflow-y-auto bg-ink-950 flex flex-col items-center py-12 px-6">
        <div className="mb-10 text-center max-w-xl fade-up">
          <h2 className="text-3xl font-display text-azure-400 font-bold mb-2">Prática de Vocabulário (SRS)</h2>
          <p className="text-ink-400 text-sm font-body">Treine e aumente o nível de suas cartas ativas desenhando e identificando pinyin.</p>
        </div>

        {knownCards.length === 0 ? (
          <div className="flex flex-col gap-5 items-center justify-center text-center p-8 bg-ink-900 border border-white/10 rounded-2xl max-w-md w-full shadow-lg">
            <span className="text-5xl">🎴</span>
            <h3 className="text-white font-bold text-lg font-display">Seu Dicionário está vazio</h3>
            <p className="text-ink-400 text-sm leading-relaxed font-body">
              Você precisa adicionar caracteres que conhece na aba <strong>Estudar (Explorer)</strong>. Abra o painel lateral direito de qualquer caractere no grafo e clique em <strong>"Adicionar aos Conhecidos"</strong>.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-3xl flex flex-col gap-8">
            {/* Seletor de Contexto */}
            <div className="bg-ink-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-3 font-mono text-ink-300">
                Filtrar Treino por Contexto
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {CONTEXTS.map(ctx => {
                  const count = ctx.id === 'all' 
                    ? knownCards.length 
                    : knownCards.filter(c => getCharacterContext(c.char) === ctx.id).length;
                  const isSelected = selectedContext === ctx.id;
                  
                  return (
                    <button
                      key={ctx.id}
                      disabled={count === 0 && ctx.id !== 'all'}
                      onClick={() => setSelectedContext(ctx.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all ${
                        isSelected
                          ? 'border-azure-400 text-azure-300 bg-azure-500/15 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                          : count === 0 && ctx.id !== 'all'
                            ? 'border-white/5 text-ink-600 cursor-not-allowed opacity-30'
                            : ctx.color
                      }`}
                    >
                      <span>{ctx.icon}</span>
                      <span>{ctx.label}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!canPractice && (
              <div className="text-center p-4 bg-ink-800 border border-white/10 rounded-xl text-sm text-ink-400 font-body">
                Você já praticou recentemente. Para evitar repetição, a prática de frases estará disponível novamente em breve.
              </div>
            )}

            {/* Opções de Prática */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: 'drawing',
                  title: 'Praticar Escrita',
                  desc: 'Escreva de cabeça (Caso 1). Focado em ordem de traços.',
                  icon: '✍️',
                  color: 'border-azure-500/25 hover:border-azure-500/50 hover:bg-azure-500/5',
                  text: 'text-azure-300'
                },
                {
                  id: 'pinyin',
                  title: 'Praticar Pinyin',
                  desc: 'Digite o pinyin correspondente dos ideogramas (Caso 2).',
                  icon: '🀄',
                  color: 'border-gold-500/25 hover:border-gold-500/50 hover:bg-gold-500/5',
                  text: 'text-gold-300'
                },
                {
                  id: 'mixed',
                  title: 'Sessão Mista',
                  desc: 'Mistura aleatoriamente desafios de escrita e pinyin.',
                  icon: '⚔️',
                  color: 'border-purple-500/25 hover:border-purple-500/50 hover:bg-purple-500/5',
                  text: 'text-purple-300'
                }
              ].map(opt => (
                <button
                  key={opt.id}
                  disabled={!canPractice}
                  onClick={() => startSession(opt.id)}
                  className={`flex flex-col text-left p-5 rounded-2xl bg-ink-900 border transition-all duration-200 group ${opt.color}`}
                >
                  <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{opt.icon}</span>
                  <h4 className={`font-bold font-display text-base mb-1 ${opt.text}`}>{opt.title}</h4>
                  <p className="text-ink-400 text-xs leading-relaxed font-body">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Coleção Ativa */}
            <div className="bg-ink-900 border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 font-mono text-ink-300">
                Suas Cartas Conhecidas ({knownCards.length})
              </h3>
              <div className="flex flex-wrap gap-2.5 max-h-60 overflow-y-auto pr-2">
                {knownCards.map((c, i) => (
                  <div
                    key={i}
                    title={`${c.pinyin} - Level ${c.srs_level} (${LEVEL_NAMES[c.srs_level]})`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold font-mono transition-all hover:scale-105 ${SRS_COLORS[c.srs_level] || SRS_COLORS[1]}`}
                  >
                    <span className="text-base font-display text-white">{c.char}</span>
                    <span className="text-[10px] opacity-75">Lv{c.srs_level}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 8. Renderização da Pergunta Ativa (Praticando)
  if (viewState === 'PRACTICING' && activePhrase) {
    const chars = [...activePhrase.phrase].filter(c => c.trim());
    const progress = `${currentPhraseIdx + 1} / ${sessionPhrases.length}`;

    return (
      <div className="w-full h-full bg-ink-950 flex flex-col items-center justify-between py-8 px-4 overflow-y-auto">
        {/* Top HUD */}
        <div className="w-full max-w-2xl flex justify-between items-center text-xs font-mono text-ink-400 border-b border-white/10 pb-3">
          <span>SESSÃO DE PRÁTICA SRS</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-white font-bold">
            {progress}
          </span>
        </div>

        {/* Corpo Principal da Pergunta */}
        <div className="w-full max-w-xl my-auto py-8 flex flex-col items-center gap-8 fade-up">
          
          {/* CASO 1: Desenhar Ideogramas a partir do Inglês */}
          {activeCase === 1 && (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="text-center">
                <span className="text-[10px] text-azure-400 font-bold uppercase tracking-wider font-mono">Tradução em Inglês</span>
                <h3 className="text-white text-2xl font-bold font-display mt-1 leading-relaxed">
                  {activePhrase.translation}
                </h3>
              </div>

              {/* Botão de Dica Pinyin */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPinyin(!showPinyin)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-ink-300 hover:bg-white/10 hover:text-white transition"
                >
                  <span>{showPinyin ? '👁️‍🗨️ Ocultar Pinyin' : '👁️ Mostrar Pinyin'}</span>
                </button>
                {showPinyin && (
                  <span className="text-sm font-mono text-azure-300 fade-in ml-2">
                    {activePhrase.pinyin}
                  </span>
                )}
              </div>

              {/* Blocos de Caracteres da Frase */}
              <div className="flex gap-4 items-center justify-center flex-wrap mt-4">
                {chars.map((char, idx) => {
                  const isCompleted = completedChars[char];
                  const knownCard = knownCards.find(c => c.char === char);
                  const isSrsCard = !!knownCard;

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <button
                        disabled={srsSelfAssessment !== null}
                        onClick={() => openDrawingPad(char)}
                        className={`w-16 h-16 rounded-xl flex items-center justify-center font-display text-2xl font-bold border transition-all duration-200 ${
                          isCompleted
                            ? 'bg-jade-500/10 border-jade-500 text-jade-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                            : 'bg-ink-900 border-white/15 text-ink-500 hover:border-azure-500 hover:text-azure-400'
                        }`}
                      >
                        {isCompleted ? char : '?'}
                      </button>
                      <span className="text-[9px] font-mono text-ink-500">
                        {isSrsCard ? `Lv${knownCard.srs_level}` : 'Novo'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Instrução Inferior */}
              {srsSelfAssessment === null && (
                <p className="text-xs text-ink-400 font-body italic text-center">
                  Clique em cada quadrado acima para desenhar o ideograma correspondente de cabeça!
                </p>
              )}
            </div>
          )}

          {/* CASO 2: Digitar Pinyin a partir do Ideograma */}
          {activeCase === 2 && (
            <div className="w-full flex flex-col items-center gap-6">
              {/* Mostra ideogramas */}
              <div className="text-center">
                <span className="text-[10px] text-gold-400 font-bold uppercase tracking-wider font-mono">Escreva o Pinyin</span>
                <h1 className="text-white text-5xl font-bold font-display tracking-widest mt-2">
                  {activePhrase.phrase}
                </h1>
              </div>

              {/* Botão de Dica Tradução */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMeaning(!showMeaning)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-ink-300 hover:bg-white/10 hover:text-white transition"
                >
                  <span>{showMeaning ? '👁️‍🗨️ Ocultar Tradução' : '👁️ Mostrar Tradução'}</span>
                </button>
                {showMeaning && (
                  <span className="text-sm font-body text-gold-300 fade-in ml-2">
                    {activePhrase.translation}
                  </span>
                )}
              </div>

              {/* Inputs para cada ideograma */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 w-full max-w-md">
                {chars.map((char, idx) => {
                  const hasChecked = pinyinChecked;
                  const isCorrect = pinyinResults[idx];
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 p-3 bg-ink-900 border border-white/5 rounded-xl">
                      <span className="text-xl font-display font-bold text-white">{char}</span>
                      <input
                        type="text"
                        disabled={hasChecked}
                        placeholder="pinyin"
                        value={pinyinInputs[idx] || ''}
                        onChange={(e) => handlePinyinInputChange(idx, e.target.value)}
                        className={`w-full bg-ink-950 border rounded px-2 py-1 text-center font-mono text-sm text-white focus:outline-none focus:border-gold-500 ${
                          hasChecked
                            ? isCorrect
                              ? 'border-jade-500 text-jade-300 bg-jade-950/20'
                              : 'border-red-500 text-red-300 bg-red-950/20'
                            : 'border-white/10'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Pinyin Oficial Revelado se Checado */}
              {pinyinChecked && (
                <div className="text-center bg-white/[0.02] border border-white/10 rounded-xl p-3 w-full max-w-sm">
                  <p className="text-[10px] text-ink-500 font-mono uppercase">Resposta Correta</p>
                  <p className="text-sm font-mono text-gold-300 font-bold mt-0.5">{activePhrase.pinyin}</p>
                </div>
              )}
            </div>
          )}

          {/* FASE DE VOTAÇÃO MANUAL (Caso 1) */}
          {srsSelfAssessment === 'review_phase' && (
            <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <h4 className="text-white font-bold font-display text-sm text-center">
                Auto-Avaliação: De quais você se lembrou de cabeça?
              </h4>
              <div className="flex flex-col gap-3">
                {chars.map((char, idx) => {
                  const vote = assessmentVotes[char] || 'remembered';
                  const knownCard = knownCards.find(c => c.char === char);
                  if (!knownCard) return null; // só avalia SRS se já conhecido

                  return (
                    <div key={idx} className="flex justify-between items-center bg-black/30 px-4 py-2.5 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-lg text-white">{char}</span>
                        <span className="text-[10px] font-mono text-ink-400">Lv{knownCard.srs_level}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVoteChar(char, 'remembered')}
                          className={`px-3 py-1 rounded text-xs font-bold font-mono transition border ${
                            vote === 'remembered'
                              ? 'bg-jade-500/25 border-jade-500 text-jade-300'
                              : 'bg-white/5 border-white/10 text-ink-400 hover:text-white'
                          }`}
                        >
                          👍 Lembrei
                        </button>
                        <button
                          onClick={() => handleVoteChar(char, 'forgot')}
                          className={`px-3 py-1 rounded text-xs font-bold font-mono transition border ${
                            vote === 'forgot'
                              ? 'bg-red-500/25 border-red-500 text-red-300'
                              : 'bg-white/5 border-white/10 text-ink-400 hover:text-white'
                          }`}
                        >
                          👎 Esqueci
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal de Pad de Escrita com HanziWriter (Caso 1) */}
        {drawingChar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={handleCloseDrawingPad}>
            <div 
              className="bg-ink-900 border border-white/15 rounded-3xl p-5 flex flex-col items-center gap-4 max-w-sm w-full relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <span className="text-[10px] text-azure-400 font-mono uppercase tracking-wider">Modo Escrita</span>
                <h3 className="text-azure-300 text-2xl font-mono font-bold mt-0.5">{drawingCharDetail.pinyin}</h3>
                {drawingCharDetail.meaning && (
                  <p className="text-ink-400 text-xs font-body mt-1 max-w-[240px] truncate">{drawingCharDetail.meaning}</p>
                )}
              </div>

              {/* Quadro de desenho */}
              <div 
                ref={writerDivRef}
                className="rounded-xl border border-white/10 bg-white/[0.02]"
                style={{ width: 200, height: 200, touchAction: 'none' }}
              />

              <p className="text-[10px] text-ink-400 text-center font-mono">
                {mistakesCount >= 5 ? 'Outline revelado. Copie o traço!' : 'Desenhe o caractere de cabeça!'}
              </p>

              {/* Ações adicionais */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleShowHint}
                  className="flex-1 py-2 text-xs font-bold rounded-lg border border-white/15 text-ink-300 hover:bg-white/5 transition"
                >
                  💡 Mostrar Dica
                </button>
                <button
                  onClick={() => writerRef.current?.undo?.()}
                  className="flex-1 py-2 text-xs font-bold rounded-lg border border-white/15 text-ink-300 hover:bg-white/5 transition"
                >
                  ↩ Desfazer
                </button>
                <button
                  onClick={handleCloseDrawingPad}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="w-full max-w-2xl flex justify-end gap-3 mt-4 border-t border-white/10 pt-4">
          <button
            onClick={() => setViewState('DASHBOARD')}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider border border-white/10 rounded-lg text-ink-400 hover:text-white hover:bg-white/5 transition"
          >
            ✕ Abandonar
          </button>

          <button
            onClick={handleRevealAndSkip}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider border border-white/10 rounded-lg text-ink-400 hover:text-white hover:bg-white/5 transition"
          >
            Revelar & Pular ➔
          </button>
          {/* Botões do Caso 1 */}
          {activeCase === 1 && srsSelfAssessment === null && (
            <button
              disabled={chars.some(c => !completedChars[c])}
              onClick={handleFinishDrawingSession}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                chars.every(c => completedChars[c])
                  ? 'bg-azure-500/15 border-azure-400 text-azure-300 hover:bg-azure-500/25'
                  : 'bg-white/5 border-white/10 text-ink-600 cursor-not-allowed'
              }`}
            >
              Avaliar Progresso
            </button>
          )}

          {activeCase === 1 && srsSelfAssessment === 'review_phase' && (
            <button
              onClick={handleSubmitPhraseResults}
              className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-jade-600/20 border border-jade-600/40 text-jade-300 hover:bg-jade-600/30 transition-all"
            >
              Confirmar & Próxima ➔
            </button>
          )}

          {/* Botões do Caso 2 */}
          {activeCase === 2 && !pinyinChecked && (
            <button
              onClick={handleCheckPinyinAnswers}
              className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-gold-600/20 border border-gold-600/40 text-gold-300 hover:bg-gold-600/30 transition-all"
            >
              Corrigir Respostas
            </button>
          )}

          {activeCase === 2 && pinyinChecked && (
            <button
              onClick={handleSubmitPhraseResults}
              className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-jade-600/20 border border-jade-600/40 text-jade-300 hover:bg-jade-600/30 transition-all"
            >
              Salvar & Próxima ➔
            </button>
          )}
        </div>
      </div>
    );
  }

  // 9. Renderização da Tela de Conclusão (SUMMARY)
  if (viewState === 'SUMMARY') {
    return (
      <div className="w-full h-full overflow-y-auto bg-ink-950 flex flex-col items-center py-12 px-6">
        <div className="mb-8 text-center max-w-xl fade-up">
          <span className="text-5xl">🏮</span>
          <h2 className="text-3xl font-display text-gold-400 font-bold mt-3 mb-2">Treino Concluído!</h2>
          <p className="text-ink-400 text-sm font-body">Excelente sessão! Os níveis de proficiência (SRS) foram atualizados no banco.</p>
        </div>

        <div className="w-full max-w-xl bg-ink-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider font-mono text-ink-300 border-b border-white/10 pb-3">
            Histórico das Alterações SRS
          </h3>

          <div className="flex flex-col gap-4">
            {sessionHistory.map((hist, idx) => {
              const chars = [...hist.phrase].filter(c => c.trim());
              return (
                <div key={idx} className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-white font-bold font-display text-xl tracking-wider">{hist.phrase}</h4>
                    <span className="text-[10px] font-body text-ink-400 italic">{hist.translation}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5 mt-3 pt-2.5 border-t border-white/5">
                    {chars.map((char, cIdx) => {
                      const orig = hist.originalLevels[char] || 1;
                      const next = hist.newLevels[char] || 1;
                      const levelChanged = next !== orig;
                      
                      return (
                        <div key={cIdx} className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded border border-white/10 font-mono text-xs text-ink-300">
                          <span className="font-display font-bold text-white mr-1">{char}</span>
                          <span>Lv{orig}</span>
                          {levelChanged && (
                            <>
                              <span className="text-ink-500 mx-0.5">➔</span>
                              <span className={next > orig ? 'text-jade-400 font-bold' : 'text-red-400 font-bold'}>
                                Lv{next} {next > orig ? '▲' : '▼'}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setViewState('DASHBOARD')}
            className="w-full py-3 rounded-xl bg-gold-600/20 border border-gold-600/40 text-gold-300 font-bold uppercase tracking-wider hover:bg-gold-600/30 transition-all text-sm mt-4"
          >
            Voltar ao Painel de Treino
          </button>
        </div>
      </div>
    );
  }

  return null;
}