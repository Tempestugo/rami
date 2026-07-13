import React, { useState, useEffect, useCallback, useRef } from 'react';
import HanziWriter from 'hanzi-writer';
import { hanziData } from '@/data/hanziData.js';
import { grammarData } from '@/data/grammarData.js';
import useStore from '@/store/useStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

const hanziMap = new Map(hanziData.map(h => [h.id, h]));

/** Estima nível HSK baseado na quantidade de cartas conhecidas */
function estimateHskLevel(count) {
  if (count < 50)   return 1;
  if (count < 150)  return 2;
  if (count < 300)  return 3;
  if (count < 600)  return 4;
  if (count < 1200) return 5;
  return 6;
}

/** Seleciona o ponto gramatical do dia (progressão sequencial baseada nas completudes) */
function getDailyGrammarPoint(index) {
  const levelSetting = localStorage.getItem('rami_wiki_hsk_level') || 'hsk1';
  let pool = grammarData.filter(g => g.hsk === 1);
  if (levelSetting === 'hsk1_hsk2') {
    pool = grammarData.filter(g => g.hsk === 1 || g.hsk === 2);
  }
  if (pool.length === 0) return grammarData[0];
  return pool[index % pool.length];
}

/** Carrega e salva o streak no localStorage */
function loadStreak() {
  try {
    const raw = localStorage.getItem('rami_streak');
    if (!raw) return { count: 0, lastDate: null };
    return JSON.parse(raw);
  } catch { return { count: 0, lastDate: null }; }
}

function updateStreak(persistFn) {
  const today = new Date().toDateString();
  const streak = loadStreak();
  if (streak.lastDate === today) return streak.count;

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newCount = streak.lastDate === yesterday ? streak.count + 1 : 1;
  const newStreak = { count: newCount, lastDate: today };
  localStorage.setItem('rami_streak', JSON.stringify(newStreak));
  // Persiste no banco em background
  if (persistFn) {
    persistFn({
      streak_count: newCount,
      streak_date: new Date(today).toISOString().split('T')[0],
    }).catch(() => {});
  }
  return newCount;
}

// ─── Modal de Gramática ──────────────────────────────────────────────────────
function GrammarModal({ point, onClose, isCompleted, onComplete }) {
  if (!point) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-ink-900 border border-azure-500/30 rounded-2xl shadow-2xl shadow-azure-500/10 flex flex-col gap-0 overflow-hidden max-h-[85vh] md:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-azure-500/10 border-b border-azure-500/20 px-6 py-4 flex justify-between items-start shrink-0">
          <div>
            <span className="text-[10px] text-azure-400 font-mono uppercase tracking-widest">HSK {point.hsk} — Gramática do Dia</span>
            <h2 className="text-white font-display font-bold text-lg mt-0.5 leading-tight">{point.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-white transition text-xl leading-none mt-0.5 font-bold"
          ></button>
        </div>

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 scrollbar-thin">
          {/* Estrutura */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Estrutura</span>
            <p className="text-gold-300 font-mono text-sm font-bold bg-gold-500/5 border border-gold-500/15 rounded-lg px-3 py-2">
              {point.structure}
            </p>
          </div>

          {/* Explicação */}
          {point.explanation && (
            <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4">
              <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Explicação</span>
              <p className="text-ink-200 text-sm font-body leading-relaxed whitespace-pre-line">
                {point.explanation}
              </p>
            </div>
          )}

          {/* Exemplos */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
            <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Exemplos</span>
            <div className="flex flex-col gap-3">
              {point.examples.map((ex, i) => (
                <div key={i} className="bg-black/30 rounded-xl p-3 border border-white/5">
                  <p className="text-white font-display text-xl font-bold">{ex.chinese}</p>
                  <p className="text-azure-300 font-mono text-xs mt-1">{ex.pinyin}</p>
                  <p className="text-ink-300 text-xs font-body mt-1 italic">"{ex.translation}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center bg-black/20 shrink-0 flex-wrap gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] text-ink-600 font-mono">
              Chinese Grammar Wiki © AllSet Learning — CC BY-NC-SA 3.0
            </span>
            <a
              href={point.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-azure-400 hover:text-azure-300 font-mono transition underline underline-offset-2 mt-0.5 align-left self-start"
            >
              Ver no Wiki ↗
            </a>
          </div>
          <div>
            {isCompleted ? (
              <span className="px-3 py-1.5 rounded-lg bg-jade-500/10 border border-jade-500/30 text-jade-400 text-xs font-bold font-mono">
                 Concluído
              </span>
            ) : (
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-4 py-1.5 rounded-lg bg-azure-500 hover:bg-azure-600 text-white text-xs font-bold font-mono transition border border-azure-400 shadow-md"
              >
                Concluir Leitura 
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper de normalização simples para busca
function normalizeSearchStr(str) {
  if (!str) return '';
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Lição do Dia (Pesquisa + Desafio de Desenho) ─────────────────────────────
function LessonModal({ char: defaultChar, knownChars, onLearn, onComplete, onClose, onOpenGrammarPoint }) {
  const [selectedChar, setSelectedChar] = useState(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [success, setSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [examples, setExamples] = useState([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const writerDivRef = useRef(null);
  const writerRef = useRef(null);

  // Recomendações iniciais: os próximos 3 caracteres HSK em falta
  const recommendations = React.useMemo(() => {
    const list = [];
    for (let level = 1; level <= 6; level++) {
      const missing = hanziData
        .filter(h => h.hsk === level && !knownChars.has(h.id))
        .map(h => h.id);
      list.push(...missing);
      if (list.length >= 3) break;
    }
    return list.slice(0, 3);
  }, [knownChars]);

  // Efeito para filtrar caracteres com base na query de pesquisa
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const normalized = normalizeSearchStr(query);
    const matches = hanziData.filter(h => 
      h.id.includes(normalized) ||
      normalizeSearchStr(h.pinyin).includes(normalized) ||
      (h.meaning && normalizeSearchStr(h.meaning).includes(normalized))
    );
    setSearchResults(matches.slice(0, 15));
  }, [query]);

  // Busca exemplos de sentenças reais
  useEffect(() => {
    if (!selectedChar) return;
    setLoadingExamples(true);
    const fetchExamples = async () => {
      try {
        const knownList = Array.from(knownChars);
        const res = await fetch('/api/phrases/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chars: [selectedChar, ...knownList] })
        });
        const resData = await res.json();
        if (resData.success && resData.data) {
          const filtered = resData.data.filter(s => s.phrase.includes(selectedChar));
          setExamples(filtered.slice(0, 2));
        }
      } catch (err) {
        console.error('Erro ao buscar exemplos para LessonModal:', err);
      } finally {
        setLoadingExamples(false);
      }
    };
    fetchExamples();
  }, [selectedChar, knownChars]);

  // Efeito para instanciar o HanziWriter no caso de sucesso ou dica/desenho
  useEffect(() => {
    if (!selectedChar || !writerDivRef.current) return;

    writerDivRef.current.innerHTML = '';
    
    const writer = HanziWriter.create(writerDivRef.current, selectedChar, {
      width: 150,
      height: 150,
      padding: 10,
      showOutline: true,
      showCharacter: success,
      strokeColor: '#f5c842',
      outlineColor: 'rgba(255, 255, 255, 0.1)',
      drawingColor: '#f5c842',
      drawingWidth: 6,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 0,
      charDataLoader: (c) => {
        return fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${c}.json`)
          .then(res => res.json());
      }
    });

    // Força os pointer events no SVG
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

    if (!success) {
      writer.quiz({
        onComplete: () => {
          setSuccess(true);
        }
      });
    }

    writerRef.current = writer;

    return () => {
      try { writer.cancelQuiz(); } catch (_) {}
    };
  }, [selectedChar, success]);

  const handleRepeatAnimation = () => {
    if (writerRef.current) {
      try { writerRef.current.animateCharacter(); } catch (_) {}
    }
  };

  const highlightChar = (text, charToHighlight) => {
    const parts = text.split(charToHighlight);
    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {part}
        {i < parts.length - 1 && <span className="text-gold-400 font-extrabold">{charToHighlight}</span>}
      </React.Fragment>
    ));
  };

  const findRelatedGrammarPoint = (c) => {
    return grammarData.find(g => 
      g.title.toLowerCase().includes(c) || 
      g.structure.includes(c) ||
      g.examples.some(ex => ex.chinese.includes(c))
    );
  };

  const charData = selectedChar ? hanziMap.get(selectedChar) : null;
  const relatedGrammar = selectedChar ? findRelatedGrammarPoint(selectedChar) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-ink-900 border border-gold-500/30 rounded-2xl shadow-2xl shadow-gold-500/10 flex flex-col overflow-hidden max-h-[85vh] md:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="bg-gold-500/10 border-b border-gold-500/20 px-6 py-4 flex justify-between items-start shrink-0">
          <div>
            <span className="text-[10px] text-gold-400 font-mono uppercase tracking-widest">
              {selectedChar ? 'Lição do Dia • Desafio de Desenho' : 'Lição do Dia • Escolha do Ideograma'}
            </span>
            <h2 className="text-white font-display font-bold text-lg mt-0.5">
              {selectedChar ? 'Desenhe o Ideograma' : 'Selecione seu Objetivo'}
            </h2>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-white transition text-xl leading-none mt-0.5 font-bold"></button>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 scrollbar-thin">
          {!selectedChar ? (
            /* 1. Tela de Seleção e Busca */
            <div className="flex flex-col gap-4">
              <p className="text-ink-400 text-xs font-body">
                Escolha o caractere que deseja praticar hoje. Você pode selecionar uma das recomendações do seu nível ou buscar qualquer ideograma no dicionário.
              </p>
              
              {/* Campo de Pesquisa */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquise por ideograma, pinyin ou tradução..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-ink-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-ink-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 text-sm shadow-inner"
                  autoFocus
                />
                {query && (
                  <button 
                    onClick={() => setQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-white font-bold"
                  >
                    
                  </button>
                )}
              </div>

              {/* Lista de Resultados ou Recomendações */}
              {!query.trim() ? (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[9px] text-ink-500 font-mono uppercase tracking-wider block">Sugestões para Hoje:</span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {recommendations.map(charId => {
                      const item = hanziMap.get(charId);
                      return (
                        <button
                          key={charId}
                          onClick={() => setSelectedChar(charId)}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-black/20 hover:border-gold-500/40 hover:bg-gold-500/5 transition text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-display font-bold text-white group-hover:scale-105 transition-transform">{charId}</span>
                            <div>
                              <p className="text-azure-300 font-mono text-xs font-bold">{item?.pinyin || '—'}</p>
                              <p className="text-ink-300 text-xs mt-0.5 truncate max-w-[320px]">{item?.meaning_pt || item?.meaning || '—'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold-500/10 border border-gold-400/20 text-gold-300">HSK {item?.hsk || 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-ink-500 font-mono uppercase tracking-wider block">Resultados da Busca:</span>
                  {searchResults.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                      {searchResults.map(h => (
                        <button
                          key={h.id}
                          onClick={() => setSelectedChar(h.id)}
                          className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/25 hover:border-gold-500/40 hover:bg-gold-500/5 transition text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-display font-bold text-white">{h.id}</span>
                            <div>
                              <p className="text-azure-300 font-mono text-xs font-bold">{h.pinyin}</p>
                              <p className="text-ink-400 text-xs mt-0.5 truncate max-w-[300px]">{h.meaning_pt || h.meaning}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-ink-400">HSK {h.hsk}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-xs text-ink-600 italic">Nenhum ideograma correspondente encontrado.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* 2. Tela de Desafio de Desenho/Escrita */
            <div className="flex flex-col gap-4">
              <div className="text-center flex flex-col gap-1">
                <span className="text-[10px] text-ink-500 font-mono uppercase tracking-wider">Significado e Pinyin:</span>
                <span className="text-2xl font-display font-bold text-white">"{charData?.meaning_pt || charData?.meaning || '—'}"</span>
                <span className="text-sm font-mono text-azure-400">{charData?.pinyin || '—'}</span>
              </div>

              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-[11px] text-ink-400 text-center font-body">
                  {success
                    ? 'Muito bem! Você concluiu a escrita com sucesso.'
                    : 'Escreva o caractere desenhando os traços na ordem correta dentro do quadro:'}
                </p>

                {/* Canvas do HanziWriter */}
                <div className="relative group">
                  <div 
                    ref={writerDivRef} 
                    className={`w-[170px] h-[170px] border rounded-2xl bg-black/40 flex items-center justify-center shadow-inner transition-all duration-300 ${
                      success ? 'border-jade-500/50 shadow-jade-500/5 shadow-lg' : 'border-gold-500/30 font-bold'
                    }`} 
                  />
                  <button
                    onClick={handleRepeatAnimation}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-ink-800 border border-white/10 hover:border-white/30 text-ink-300 hover:text-white rounded-full flex items-center justify-center text-xs transition shadow-md animate-pulse"
                    title="Animar Ordem dos Traços"
                  >
                    
                  </button>
                </div>

                {success && (
                  <div className="text-center flex flex-col items-center gap-1.5 bg-jade-950/20 border border-jade-500/20 rounded-xl px-6 py-2.5 max-w-sm">
                    <span className="text-jade-400 font-bold font-display text-xs"> Ideograma Confirmado!</span>
                    <span className="text-4xl font-display font-bold text-white">{selectedChar}</span>
                    {relatedGrammar && (
                      <button
                        onClick={() => onOpenGrammarPoint(relatedGrammar)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-azure-500/10 border border-azure-400/30 text-azure-300 hover:bg-azure-500/25 transition cursor-pointer mt-1"
                        title="Ver gramática relacionada"
                      >
                         Gramática: {relatedGrammar.title.slice(0, 30)}...
                      </button>
                    )}
                  </div>
                )}
              </div>

              {success && (
                <div className="border-t border-white/5 pt-4 flex flex-col gap-2.5">
                  <span className="text-[9px] text-ink-500 font-mono uppercase tracking-wider block">Exemplos de Uso na Prática</span>
                  {loadingExamples ? (
                    <p className="text-[10px] text-ink-500 font-mono italic animate-pulse">Carregando frases de exemplo...</p>
                  ) : examples.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5">
                      {examples.map((ex, i) => (
                        <div key={i} className="bg-black/35 rounded-xl p-3 border border-white/5 text-xs flex flex-col gap-1">
                          <p className="text-white font-display text-base font-bold tracking-wide">
                            {highlightChar(ex.phrase, selectedChar)}
                          </p>
                          <p className="text-azure-300 font-mono text-[10px]">{ex.pinyin}</p>
                          <p className="text-ink-400 font-body text-[10px] italic mt-0.5">"{ex.translation}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-ink-600 font-body italic">
                      Nenhuma frase simples com este ideograma encontrada na biblioteca ainda.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/20 shrink-0 flex justify-between items-center">
          {selectedChar && !success ? (
            <button
              onClick={() => {
                setSelectedChar(null);
                setSuccess(false);
                setShowHint(false);
              }}
              className="px-4 py-2 rounded-xl bg-ink-800 border border-white/10 hover:bg-ink-700 text-ink-300 hover:text-white font-bold text-xs font-mono transition"
            >
              ← Voltar à Busca
            </button>
          ) : (
            <div />
          )}

          {success ? (
            <button
              onClick={async () => {
                await onLearn(selectedChar);
                onComplete(selectedChar);
              }}
              className="px-5 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-ink-950 font-bold text-xs font-mono transition shadow-lg shadow-gold-500/10 border border-gold-400"
            >
              Concluir Lição e Salvar 
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-ink-800 border border-white/10 hover:bg-ink-700 text-ink-300 hover:text-white font-bold text-xs font-mono transition"
            >
              Estudar Mais Tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function Home({ onNavigate }) {
  const [knownCards, setKnownCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [selectedGrammarPoint, setSelectedGrammarPoint] = useState(null);
  const [lessonModal, setLessonModal] = useState(false);
  const [addingChar, setAddingChar] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyDone, setDailyDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rami_daily_done') || '{}'); }
    catch { return {}; }
  });
  const setInitialPracticeType = useStore(state => state.setInitialPracticeType);
  const persistActivity = useStore(state => state.persistActivity);
  const user = useStore(state => state.user);

  // Carrega cartas conhecidas
  const loadCards = useCallback(() => {
    setLoading(true);
    fetch('/api/cards/1')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => { if (data.success) setKnownCards(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCards();
    setStreak(updateStreak(persistActivity));
  }, [loadCards]);

  // Derivados
  const hskLevel = estimateHskLevel(knownCards.length);
  const knownSet = new Set(knownCards.map(c => c.char));
  const today = new Date().toDateString();

  // Lógica de Data Efetiva: simplificada para usar sempre a data selecionada direta (sem redirecionar completudes)
  const getEffectiveDate = useCallback((key, dateObj) => {
    return dateObj;
  }, []);

  // Lógica de índice sequencial baseado no total de completudes antes da data selecionada
  const getSequentialIndex = useCallback((key, dateObj) => {
    let count = 0;
    const targetTime = new Date(dateObj.toDateString()).getTime();
    for (const fullKey in dailyDone) {
      if (fullKey.endsWith(':' + key) && dailyDone[fullKey]) {
        const datePart = fullKey.substring(0, fullKey.indexOf(':'));
        const completedTime = new Date(datePart).getTime();
        if (completedTime < targetTime) {
          count++;
        }
      }
    }
    return count;
  }, [dailyDone]);

  // Obtém o caractere correspondente à Lição do Dia de forma estável e sequencial
  const getDailyLessonChar = useCallback((dateObj, knownCardsList) => {
    const dateStr = dateObj.toDateString();
    
    // Se o caractere já foi travado para este dia, use-o
    if (dailyDone[dateStr + ':lesson_char']) {
      return dailyDone[dateStr + ':lesson_char'];
    }

    // Caso contrário, calcula dinamicamente baseado na sequência histórica:
    // 1. Reúne todos os caracteres aprendidos em datas anteriores
    const priorLearned = new Set();
    const targetTime = new Date(dateObj.toDateString()).getTime();
    for (const key in dailyDone) {
      if (key.endsWith(':lesson_char') && dailyDone[key]) {
        const datePart = key.substring(0, key.indexOf(':'));
        const completedTime = new Date(datePart).getTime();
        if (completedTime < targetTime) {
          priorLearned.add(dailyDone[key]);
        }
      }
    }

    // Coleta o conjunto de caracteres conhecidos do usuário (evita repetições aprendidas em outros modos)
    const knownSet = new Set(knownCardsList.map(c => c.char));

    // 2. Encontra o primeiro ideograma na ordem do HSK que não foi aprendido antes daquela data nem pertence às conhecidas atuais
    for (let level = 1; level <= 6; level++) {
      const pool = hanziData.filter(h => h.hsk === level);
      for (const charObj of pool) {
        const char = charObj.id;
        if (!priorLearned.has(char) && !knownSet.has(char)) {
          return char;
        }
      }
    }
    return null;
  }, [dailyDone]);

  const grammarIndex = getSequentialIndex('grammar', selectedDate);
  const grammarPoint = getDailyGrammarPoint(grammarIndex);

  // Gera os dias do mês selecionado com padding de alinhamento
  const getDaysOfCurrentMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const padding = firstDay.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const list = [];
    
    for (let i = 0; i < padding; i++) {
      list.push(null);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      list.push(new Date(year, month, day));
    }
    
    return list;
  };
  const monthDays = getDaysOfCurrentMonth();

  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      d.setDate(1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
      return d;
    });
  };

  const lessonChar = getDailyLessonChar(selectedDate, knownCards);
  const lessonHskLevel = lessonChar ? (hanziMap.get(lessonChar)?.hsk || 1) : 1;

  // Cards SRS com revisão pendente (aproximado: nível <= 3 como "pendentes para hoje")
  const srsReviewCount = knownCards.filter(c => c.srs_level <= 3).length;

  // Marcar pilar como feito na data selecionada (usando a data efetiva)
  const markDone = (key) => {
    const effDate = getEffectiveDate(key, selectedDate);
    const dateStr = effDate.toDateString();
    const updated = { ...dailyDone, [dateStr + ':' + key]: true };
    setDailyDone(updated);
    localStorage.setItem('rami_daily_done', JSON.stringify(updated));
    // Persiste no banco em background
    persistActivity({ daily_done: updated }).catch(() => {});
  };

  const isDone = (key) => {
    const effDate = getEffectiveDate(key, selectedDate);
    return !!dailyDone[effDate.toDateString() + ':' + key];
  };

  const isDoneForDate = (key, date) => {
    return !!dailyDone[date.toDateString() + ':' + key];
  };

  const getCompletionsForDate = (date) => {
    return ['srs', 'lesson', 'practice', 'grammar'].filter(k => isDoneForDate(k, date)).length;
  };

  const doneCount = ['srs', 'lesson', 'practice', 'grammar'].filter(k => isDone(k)).length;
  const progressPct = Math.round((doneCount / 4) * 100);

  // Adiciona char ao SRS
  const handleLearnChar = async (char) => {
    setAddingChar(char);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ char, srs_level: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setKnownCards(prev => [...prev, { char, srs_level: 1 }]);
      }
    } catch (e) { console.error(e); }
    finally { setAddingChar(null); }
  };


  // ─── Render ───────────────────────────────────────────────────────────────
  const pillars = [
    {
      key: 'srs',
      icon: '',
      label: 'Revisão SRS',
      sublabel: srsReviewCount > 0 ? `${srsReviewCount} cartas para revisar` : 'Tudo em dia! ',
      desc: 'Revise os caracteres que você já conhece antes que os esqueça.',
      color: 'border-red-500/25 hover:border-red-500/50',
      accent: 'text-red-400',
      bg: 'bg-red-500/5',
      btnColor: 'bg-red-500/15 border-red-400/50 text-red-300 hover:bg-red-500/25',
      count: srsReviewCount,
      action: () => { 
        setInitialPracticeType('pinyin');
        onNavigate('learn'); 
        markDone('srs'); 
      },
      cta: 'Iniciar Revisão →',
    },
    {
      key: 'lesson',
      icon: '',
      label: 'Lição do Dia',
      sublabel: isDone('lesson')
        ? `Aprendido: '${getDailyLessonChar(selectedDate, knownCards)}'`
        : lessonChar
          ? `HSK ${lessonHskLevel} • Escrever '${lessonChar}'`
          : 'Tudo aprendido! ',
      desc: lessonChar
        ? 'Aprenda um novo ideograma do seu nível digitando e dominando seus traços.'
        : 'Você já aprendeu todos os ideogramas disponíveis por enquanto.',
      color: 'border-gold-500/25 hover:border-gold-500/50',
      accent: 'text-gold-400',
      bg: 'bg-gold-500/5',
      btnColor: !lessonChar
        ? 'bg-ink-800 border-white/10 text-ink-500 cursor-not-allowed'
        : 'bg-gold-500/15 border-gold-400/50 text-gold-300 hover:bg-gold-500/25',
      count: lessonChar ? 1 : 0,
      action: () => { if (lessonChar) setLessonModal(true); },
      cta: lessonChar ? 'Iniciar Desafio →' : 'Concluído ',
    },
    {
      key: 'practice',
      icon: '',
      label: 'Praticar Frases',
      sublabel: 'Prática diária disponível',
      desc: 'Pratique escrita e leitura com frases reais do nível do seu vocabulário.',
      color: 'border-jade-500/25 hover:border-jade-500/50',
      accent: 'text-jade-400',
      bg: 'bg-jade-500/5',
      btnColor: 'bg-jade-500/15 border-jade-400/50 text-jade-300 hover:bg-jade-500/25',
      count: knownCards.length,
      action: () => { 
        setInitialPracticeType('drawing');
        onNavigate('learn'); 
        markDone('practice'); 
      },
      cta: 'Praticar →',
    },
    {
      key: 'grammar',
      icon: '',
      label: 'Gramática',
      sublabel: isDone('grammar') ? `Concluído: "${grammarPoint.title}"` : `Regra: "${grammarPoint.title}"`,
      desc: `Estrutura: ${grammarPoint.structure}`,
      color: 'border-azure-500/25 hover:border-azure-500/50',
      accent: 'text-azure-400',
      bg: 'bg-azure-500/5',
      btnColor: 'bg-azure-500/15 border-azure-400/50 text-azure-300 hover:bg-azure-500/25',
      count: null,
      action: () => { setSelectedGrammarPoint(grammarPoint); },
      cta: isDone('grammar') ? 'Revisar Ponto →' : 'Ver Ponto →',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white font-display font-bold text-2xl">
              {selectedDate.toDateString() === new Date().toDateString() ? 'Bom estudo! 漢字' : 'Revisando Dia Passado '}
            </h1>
            <p className="text-ink-400 font-body text-sm mt-0.5">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <span className="text-lg"></span>
            <div className="text-right">
              <span className="text-orange-300 font-bold font-display text-lg">{streak}</span>
              <p className="text-orange-400/60 font-mono text-[9px] uppercase -mt-0.5">dias seguidos</p>
            </div>
          </div>
        </div>

        {/* ── Agenda / Calendário de Estudos ── */}
        <div className="bg-ink-900 border border-white/10 rounded-2xl p-5 shadow-lg">
          <div className="flex justify-between items-center mb-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="text-ink-400 hover:text-white transition p-1 font-bold text-sm"
                title="Mês Anterior"
              >
                ◀
              </button>
              <span className="text-white font-bold text-sm uppercase tracking-wider font-mono">
                {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={handleNextMonth}
                className="text-ink-400 hover:text-white transition p-1 font-bold text-sm"
                title="Próximo Mês"
              >
                ▶
              </button>
            </div>
            {selectedDate.toDateString() !== new Date().toDateString() && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-[10px] text-azure-400 hover:text-azure-300 border border-azure-400/30 hover:border-azure-400 bg-azure-500/5 hover:bg-azure-500/10 px-2 py-0.5 rounded font-mono transition"
              >
                Voltar para Hoje 
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-ink-500 mb-2">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-2.5">
            {monthDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} />;
              }
              const dateStr = day.toDateString();
              const isSelected = selectedDate.toDateString() === dateStr;
              const isToday = today === dateStr;
              const dayCompletions = getCompletionsForDate(day);
              const isFullyDone = dayCompletions === 4;

              const pillarsList = ['srs', 'lesson', 'practice', 'grammar'];
              const dotColors = {
                srs: 'bg-red-400',
                lesson: 'bg-gold-400',
                practice: 'bg-jade-400',
                grammar: 'bg-azure-400',
              };

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-azure-500 text-azure-300 bg-azure-500/10 shadow-[0_0_12px_rgba(59,130,246,0.15)] scale-105'
                      : isToday
                        ? 'border-white/20 text-white bg-white/5 hover:bg-white/10'
                        : 'border-transparent text-ink-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-bold border transition-all ${
                    isSelected
                      ? 'border-azure-500 text-azure-300 font-extrabold'
                      : isToday
                        ? 'border-azure-400 text-azure-300 font-extrabold'
                        : 'border-white/10 text-ink-300'
                  }`}>
                    {day.getDate()}
                  </div>

                  {/* 4 mini dots for the pillars */}
                  <div className="flex gap-0.5 justify-center">
                    {pillarsList.map((p) => {
                      const completed = isDoneForDate(p, day);
                      return (
                        <div
                          key={p}
                          title={`${p.toUpperCase()} ${completed ? 'Concluído' : 'Pendente'}`}
                          className={`w-1 h-1 rounded-full transition-all ${
                            completed ? dotColors[p] : 'bg-ink-700'
                          }`}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Progresso do Dia ── */}
        <div className="bg-ink-900 border border-white/8 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-ink-300 font-mono text-xs uppercase tracking-wider">
              {selectedDate.toDateString() === new Date().toDateString() ? 'Progresso de Hoje' : 'Progresso do Dia'}
            </span>
            <span className="text-white font-bold font-mono text-sm">
              {['srs', 'lesson', 'practice', 'grammar'].filter(k => isDoneForDate(k, selectedDate)).length}/4 pilares
            </span>
          </div>
          <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-azure-500 to-jade-500 rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((['srs', 'lesson', 'practice', 'grammar'].filter(k => isDoneForDate(k, selectedDate)).length / 4) * 100)}%`
              }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            {['srs', 'lesson', 'practice', 'grammar'].map((k) => (
              <div
                key={k}
                className={`flex-1 h-1 rounded-full transition-all duration-500 ${isDoneForDate(k, selectedDate) ? 'bg-jade-400' : 'bg-ink-700'}`}
              />
            ))}
          </div>

          {/* Checklist de Metas Claras do Dia */}
          <div className="mt-5 border-t border-white/5 pt-4 flex flex-col gap-3">
            <span className="text-[10px] text-ink-400 font-mono uppercase tracking-wider block">
              Metas do Dia Selecionado:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  key: 'srs',
                  label: 'Revisão SRS',
                  desc: srsReviewCount > 0 ? `Revisar ${srsReviewCount} cartas pendentes` : 'Tudo revisado!',
                  icon: ''
                },
                {
                  key: 'lesson',
                  label: 'Lição do Dia',
                  desc: isDoneForDate('lesson', selectedDate)
                    ? `Aprendido: '${getDailyLessonChar(selectedDate, knownCards)}'`
                    : lessonChar
                      ? `Escrever o caractere '${lessonChar}'`
                      : 'Nenhum ideograma pendente',
                  icon: ''
                },
                {
                  key: 'practice',
                  label: 'Prática de Frases',
                  desc: 'Praticar frases',
                  icon: ''
                },
                {
                  key: 'grammar',
                  label: 'Ponto Gramatical',
                  desc: isDoneForDate('grammar', selectedDate)
                    ? `Lido: "${grammarPoint.title}"`
                    : `Ler a regra: "${grammarPoint.title}"`,
                  icon: ''
                }
              ].map(item => {
                const completed = isDoneForDate(item.key, selectedDate);
                return (
                  <div
                    key={item.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                      completed
                        ? 'border-jade-500/20 bg-jade-500/5 text-jade-300 opacity-80'
                        : 'border-white/5 bg-black/10 text-ink-300'
                    }`}
                  >
                    <span className="text-base shrink-0">{completed ? '' : item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[10px] font-mono uppercase tracking-wider text-ink-400">{item.label}</p>
                      <p className="text-[11px] text-ink-200 truncate mt-0.5" title={item.desc}>{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-3 gap-3 mt-4 border-t border-white/5 pt-4">
            {[
              { label: 'Coleção', value: loading ? '…' : knownCards.length, sub: 'ideogramas', icon: '' },
              { label: 'Nível HSK', value: `HSK ${hskLevel}`, sub: 'estimado', icon: '' },
              { label: 'Para Revisar', value: loading ? '…' : srsReviewCount, sub: 'cartas SRS', icon: '️' },
            ].map(stat => (
              <div key={stat.label} className="bg-black/30 rounded-xl p-3 border border-white/5 text-center">
                <span className="text-lg">{stat.icon}</span>
                <p className="text-white font-bold font-display text-xl mt-1">{stat.value}</p>
                <p className="text-ink-500 font-mono text-[9px] uppercase">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4 Pilares ── */}
        <div>
          <h2 className="text-ink-300 font-mono text-xs uppercase tracking-wider mb-4">Pilares de Hoje</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pillars.map(p => {
              const effDate = getEffectiveDate(p.key, selectedDate);
              const isCatchUp = effDate.toDateString() !== selectedDate.toDateString();
              
              return (
                <div
                  key={p.key}
                  className={`relative flex flex-col gap-3 p-5 rounded-2xl bg-ink-900 border transition-all duration-200 ${p.color} ${isDone(p.key) ? 'opacity-60' : ''}`}
                >
                  {isDone(p.key) ? (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-jade-500 border border-jade-400 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  ) : (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full border border-white/10 flex items-center justify-center">
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold font-display text-base ${p.accent}`}>{p.label}</h3>
                        {isCatchUp && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-300 animate-pulse">
                            Catch-up: {effDate.getDate()}/{effDate.getMonth() + 1}
                          </span>
                        )}
                      </div>
                      <p className="text-ink-400 font-mono text-[10px] truncate max-w-[200px]">{p.sublabel}</p>
                    </div>
                  </div>
                  <p className="text-ink-400 text-xs font-body leading-relaxed">{p.desc}</p>
                  <button
                    onClick={p.action}
                    className={`mt-auto px-4 py-2 rounded-lg text-xs font-bold font-mono border transition-all self-start ${p.btnColor}`}
                  >
                    {p.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Pré-visualização Gramática ── */}
        <div
          className="bg-ink-900 border border-azure-500/15 rounded-2xl p-5 cursor-pointer hover:border-azure-500/35 transition group"
          onClick={() => { setSelectedGrammarPoint(grammarPoint); }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="text-[10px] text-azure-400 font-mono uppercase tracking-widest">HSK {grammarPoint.hsk} — Gramática do Dia</span>
              <h3 className="text-white font-display font-bold text-base mt-1">{grammarPoint.title}</h3>
              <p className="text-gold-300 font-mono text-xs mt-1.5 bg-gold-500/5 border border-gold-500/15 inline-block px-2 py-0.5 rounded">
                {grammarPoint.structure}
              </p>
              {grammarPoint.examples[0] && (
                <p className="text-ink-300 text-sm font-display mt-2">
                  "{grammarPoint.examples[0].chinese}"
                  <span className="text-ink-500 text-xs font-body font-normal ml-2 italic">{grammarPoint.examples[0].translation}</span>
                </p>
              )}
            </div>
            <span className="text-2xl group-hover:scale-110 transition-transform"></span>
          </div>
        </div>

        {/* Atribuição */}
        <p className="text-center text-[10px] text-ink-700 font-mono pb-4">
          Gramática: Chinese Grammar Wiki © AllSet Learning — CC BY-NC-SA 3.0 •{' '}
          <a href="https://resources.allsetlearning.com/chinese/grammar/" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-500 transition">
            resources.allsetlearning.com
          </a>
        </p>
      </div>

      {/* Modals */}
      {selectedGrammarPoint && (
        <GrammarModal
          point={selectedGrammarPoint}
          onClose={() => setSelectedGrammarPoint(null)}
          isCompleted={isDoneForDate('grammar', selectedDate)}
          onComplete={() => {
            markDone('grammar');
            try {
              const grammarDone = JSON.parse(localStorage.getItem('rami_grammar_done') || '{}');
              grammarDone[selectedGrammarPoint.title] = true;
              localStorage.setItem('rami_grammar_done', JSON.stringify(grammarDone));
              persistActivity({ grammar_done: grammarDone }).catch(() => {});
            } catch (err) {
              console.error('Erro ao salvar ponto de gramática:', err);
            }
          }}
        />
      )}
      {lessonModal && lessonChar && (
        <LessonModal
          char={lessonChar}
          knownChars={knownSet}
          onLearn={handleLearnChar}
          onOpenGrammarPoint={(pt) => setSelectedGrammarPoint(pt)}
          onClose={() => { setLessonModal(false); loadCards(); }}
          onComplete={() => {
            const effDate = getEffectiveDate('lesson', selectedDate);
            const dateStr = effDate.toDateString();
            const updated = {
              ...dailyDone,
              [dateStr + ':lesson']: true,
              [dateStr + ':lesson_char']: lessonChar
            };
            setDailyDone(updated);
            localStorage.setItem('rami_daily_done', JSON.stringify(updated));
            setLessonModal(false);
            loadCards();
          }}
        />
      )}
    </div>
  );
}
