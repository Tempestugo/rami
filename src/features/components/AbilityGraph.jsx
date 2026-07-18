/**
 * AbilityGraph.jsx — Grafo neural de habilidades usando vis-network
 * Prática individual: para desbloquear, o jogador precisa praticar o caractere
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { hanziData } from '@/data/hanziData.js';

// ── Paleta por HSK ───────────────────────────────────────────
const HSK_COLORS = {
  1: { bg: '#1e3a5f', border: '#3b82f6', glow: '#3b82f6' },
  2: { bg: '#14532d', border: '#22c55e', glow: '#22c55e' },
  3: { bg: '#78350f', border: '#f59e0b', glow: '#f59e0b' },
  4: { bg: '#7f1d1d', border: '#ef4444', glow: '#ef4444' },
  5: { bg: '#581c87', border: '#a855f7', glow: '#a855f7' },
  6: { bg: '#831843', border: '#ec4899', glow: '#ec4899' },
};

const COST_BY_HSK = { 1: 30, 2: 70, 3: 130, 4: 200, 5: 300, 6: 400 };
const ROOT_BONUS_MULT = 0.8; // raízes custam menos

// Função para falar o caractere
function speak(text) {
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN'; utt.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

// Constrói o conjunto de nós para os HSK selecionados
function buildNodeSet(hskLevels) {
  const allowed = new Set(hskLevels);
  const chars = hanziData.filter(h => allowed.has(h.hsk));
  const charIds = new Set(chars.map(h => h.id));

  return chars.map(h => {
    const parents = (h.visual_parents || []).filter(p => charIds.has(p));
    const isRoot = parents.length === 0;
    const cost = Math.round(COST_BY_HSK[h.hsk] * (isRoot ? ROOT_BONUS_MULT : 1));
    return {
      id: h.id,
      hanzi: h.id,
      pinyin: h.pinyin,
      meaning: h.meaning,
      hsk: h.hsk,
      requires: parents,
      isRoot,
      cost,
    };
  });
}

// Gera as perguntas para a prática individual de um caractere
function buildPracticeQuestions(hanziId) {
  const entry = hanziData.find(h => h.id === hanziId);
  if (!entry) return [];

  // Pergunta 1: Pinyin correto
  const pinyinPool = hanziData.filter(h => h.id !== hanziId && h.pinyin).map(h => h.pinyin);
  const uniquePinyins = [...new Set(pinyinPool)].sort(() => Math.random() - 0.5).slice(0, 3);
  const pinyinOptions = [
    { text: entry.pinyin, correct: true },
    ...uniquePinyins.map(p => ({ text: p, correct: false }))
  ].sort(() => Math.random() - 0.5);

  // Pergunta 2: Significado correto
  const meaningPool = hanziData.filter(h => h.id !== hanziId && (h.meaning_pt || h.meaning));
  const uniqueMeanings = meaningPool.sort(() => Math.random() - 0.5).slice(0, 3).map(h => h.meaning_pt || h.meaning);
  const meaningOptions = [
    { text: entry.meaning_pt || entry.meaning, correct: true },
    ...uniqueMeanings.map(m => ({ text: m, correct: false }))
  ].sort(() => Math.random() - 0.5);

  return [
    {
      type: 'pinyin',
      question: `Qual é o Pinyin correto de "${entry.id}"?`,
      options: pinyinOptions,
    },
    {
      type: 'meaning',
      question: `Qual é o significado correto de "${entry.id}"?`,
      options: meaningOptions,
    }
  ];
}

// Opções vis-network
function buildVisOptions() {
  return {
    nodes: {
      shape: 'dot',
      size: 24,
      font: {
        face: 'Noto Serif SC, serif',
        size: 16,
        color: '#e2e8f0',
      },
      borderWidth: 2,
      shadow: { enabled: true, size: 10, color: 'rgba(0,0,0,0.5)' },
    },
    edges: {
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      color: { color: 'rgba(255,255,255,0.1)', highlight: 'rgba(255,255,255,0.35)' },
      width: 1,
      smooth: { type: 'continuous', roundness: 0.2 },
    },
    physics: {
      barnesHut: {
        gravitationalConstant: -12000,
        centralGravity: 0.1,
        springLength: 180,
        springConstant: 0.04,
        damping: 0.15,
      },
      stabilization: { iterations: 200, fit: true },
    },
    interaction: { hover: true, tooltipDelay: 100, navigationButtons: false, keyboard: false },
    layout: { randomSeed: 7 },
  };
}

function nodeColor(node, unlocked) {
  const isUnlocked = unlocked.has(node.id);
  const isAvailable = !isUnlocked && (node.isRoot || node.requires.every(r => unlocked.has(r)));
  const hsk = HSK_COLORS[node.hsk] || HSK_COLORS[6];

  if (isUnlocked) return {
    background: '#92400e',
    border: '#e8d87a',
    highlight: { background: '#a16207', border: '#fbbf24' },
    hover: { background: '#a16207', border: '#fbbf24' },
  };
  if (isAvailable) return {
    background: hsk.bg,
    border: hsk.border,
    highlight: { background: hsk.bg, border: hsk.glow },
    hover: { background: hsk.bg, border: hsk.glow },
  };
  return {
    background: '#0f172a',
    border: 'rgba(255,255,255,0.1)',
    highlight: { background: '#1e293b', border: 'rgba(255,255,255,0.2)' },
    hover: { background: '#1e293b', border: 'rgba(255,255,255,0.2)' },
  };
}

export default function AbilityGraph({ unlocked = new Set(), biPoints, onUnlock, onClose }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDsRef = useRef(new DataSet());
  const edgesDsRef = useRef(new DataSet());

  const [hskFilter, setHskFilter] = useState([1, 2]);
  const [selected, setSelected] = useState(null); // { id, node, isAvailable, isUnlocked }
  const [stabilized, setStabilized] = useState(false);
  const [nodeSet, setNodeSet] = useState(() => buildNodeSet([1, 2]));

  // Estados de Prática / Quiz Individual
  const [practicing, setPracticing] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [practiceSelectedOpt, setPracticeSelectedOpt] = useState(null);
  const [practiceRevealed, setPracticeRevealed] = useState(false);
  const [practiceErrors, setPracticeErrors] = useState(0);

  // Rebuild ao mudar filtro
  useEffect(() => {
    const nodes = buildNodeSet(hskFilter);
    setNodeSet(nodes);
    setSelected(null);
    setPracticing(false);
  }, [hskFilter.join(',')]);

  // Build/update vis nodes & edges
  useEffect(() => {
    const nodesDs = nodesDsRef.current;
    const edgesDs = edgesDsRef.current;

    const visNodes = nodeSet.map(n => {
      const isUnlocked = unlocked.has(n.id);
      const isAvailable = !isUnlocked && (n.isRoot || n.requires.every(r => unlocked.has(r)));
      return {
        id: n.id,
        label: n.id,
        title: `${n.pinyin} · ${n.meaning} · HSK${n.hsk}`,
        size: n.isRoot ? 32 : 22,
        color: nodeColor(n, unlocked),
        font: {
          size: n.isRoot ? 20 : 15,
          color: isUnlocked ? '#fbbf24' : isAvailable ? '#e2e8f0' : 'rgba(255,255,255,0.25)',
          bold: isUnlocked,
        },
        opacity: isUnlocked ? 1 : isAvailable ? 0.9 : 0.4,
      };
    });

    const visEdges = nodeSet.flatMap(n =>
      n.requires.map(r => ({ id: `${r}->${n.id}`, from: r, to: n.id }))
    );

    nodesDs.clear();
    edgesDs.clear();
    nodesDs.add(visNodes);
    edgesDs.add(visEdges);
  }, [nodeSet, unlocked]);

  // Init vis-network
  useEffect(() => {
    if (!containerRef.current) return;
    if (networkRef.current) { networkRef.current.destroy(); }

    const net = new Network(containerRef.current, {
      nodes: nodesDsRef.current,
      edges: edgesDsRef.current,
    }, buildVisOptions());

    net.on('stabilized', () => setStabilized(true));
    net.on('click', ({ nodes: clickedNodes }) => {
      if (!clickedNodes.length) { setSelected(null); setPracticing(false); return; }
      const id = clickedNodes[0];
      const node = nodeSet.find(n => n.id === id);
      if (!node) return;
      const isUnlocked = unlocked.has(id);
      const isAvailable = !isUnlocked && (node.isRoot || node.requires.every(r => unlocked.has(r)));
      setSelected({ id, node, isAvailable, isUnlocked });
      setPracticing(false);
    });

    networkRef.current = net;
    return () => { net.destroy(); networkRef.current = null; };
  }, [nodeSet]);

  const startPractice = useCallback(() => {
    if (!selected || !selected.isAvailable || biPoints < selected.node.cost) return;
    speak(selected.id);
    const qs = buildPracticeQuestions(selected.id);
    setPracticeQuestions(qs);
    setCurrentQIndex(0);
    setPracticeSelectedOpt(null);
    setPracticeRevealed(false);
    setPracticeErrors(0);
    setPracticing(true);
  }, [selected, biPoints]);

  const handlePracticeSelect = useCallback((opt) => {
    if (practiceRevealed) return;
    setPracticeSelectedOpt(opt);
    setPracticeRevealed(true);
    if (!opt.correct) {
      setPracticeErrors(e => e + 1);
    }
  }, [practiceRevealed]);

  const handlePracticeNext = useCallback(() => {
    if (currentQIndex + 1 >= practiceQuestions.length) {
      // Concluiu as perguntas
      if (practiceErrors === 0) {
        // Desbloqueia
        onUnlock(selected.id, selected.node.cost);
        setSelected(prev => prev ? { ...prev, isUnlocked: true, isAvailable: false } : null);
        setPracticing(false);
      } else {
        // Fracassou por erros
        alert('Você cometeu erros durante a prática. Tente novamente para memorizar o ideograma!');
        setPracticing(false);
      }
    } else {
      setCurrentQIndex(q => q + 1);
      setPracticeSelectedOpt(null);
      setPracticeRevealed(false);
    }
  }, [currentQIndex, practiceQuestions, practiceErrors, selected, onUnlock]);

  const toggleHsk = (level) => {
    setHskFilter(prev =>
      prev.includes(level)
        ? prev.length > 1 ? prev.filter(l => l !== level) : prev
        : [...prev, level].sort()
    );
  };

  const unlockedCount = nodeSet.filter(n => unlocked.has(n.id)).length;
  const availableCount = nodeSet.filter(n => !unlocked.has(n.id) && (n.isRoot || n.requires.every(r => unlocked.has(r)))).length;

  return (
    <div className="ag-panel">
      {/* Header */}
      <div className="ag-header">
        <div className="ag-header-left">
          <span className="ag-title-hanzi">術</span>
          <div>
            <div className="ag-title">Árvore de Habilidades</div>
            <div className="ag-sub">{unlockedCount} desbloqueados · {availableCount} disponíveis</div>
          </div>
        </div>
        <div className="ag-header-right">
          <div className="ag-bi">
            <span className="ag-bi-icon">筆</span>
            <span className="ag-bi-val">{biPoints}</span>
          </div>
          <button className="ag-close" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* HSK Filter */}
      {!practicing && (
        <div className="ag-hsk-bar">
          <span className="ag-hsk-label">HSK</span>
          {[1, 2, 3, 4, 5, 6].map(level => (
            <button
              key={level}
              className={`ag-hsk-btn hsk-${level} ${hskFilter.includes(level) ? 'active' : ''}`}
              onClick={() => toggleHsk(level)}
            >
              {level}
            </button>
          ))}
          <span className="ag-node-count">{nodeSet.length} nós</span>
        </div>
      )}

      {/* Graph */}
      <div className="ag-graph-wrap">
        <div ref={containerRef} className="ag-graph-canvas" style={{ display: practicing ? 'none' : 'block' }} />
        
        {/* Painel da Prática Individual */}
        {practicing && practiceQuestions[currentQIndex] && (
          <div className="ag-practice-overlay">
            <div className="ag-practice-card">
              <div className="ag-practice-header">
                <span className="ag-practice-progress">Desafio {currentQIndex + 1} de {practiceQuestions.length}</span>
                {practiceErrors > 0 && <span className="ag-practice-warn">Erros: {practiceErrors}</span>}
              </div>

              <div className="ag-practice-char-box" onClick={() => speak(selected.id)}>
                <span className="ag-practice-big-char">{selected.id}</span>
                <span className="ag-practice-speaker">叩 ouvir pronúncia</span>
              </div>

              <p className="ag-practice-question">{practiceQuestions[currentQIndex].question}</p>

              <div className="ag-practice-options">
                {practiceQuestions[currentQIndex].options.map((opt, idx) => {
                  let cls = 'ag-practice-opt';
                  if (practiceRevealed) {
                    cls += opt.correct ? ' correct' : opt === practiceSelectedOpt ? ' wrong' : ' disabled';
                  }
                  return (
                    <button
                      key={idx}
                      className={cls}
                      onClick={() => handlePracticeSelect(opt)}
                      disabled={practiceRevealed}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {practiceRevealed && (
                <button className="ag-practice-next" onClick={handlePracticeNext}>
                  {currentQIndex + 1 >= practiceQuestions.length ? 'Concluir Prática' : 'Próxima Pergunta'}
                </button>
              )}

              <button className="ag-practice-cancel" onClick={() => setPracticing(false)}>Cancelar Treino</button>
            </div>
          </div>
        )}

        {!stabilized && !practicing && (
          <div className="ag-loading">
            <span className="ag-loading-hanzi">天</span>
            <span>Organizando grafo...</span>
          </div>
        )}
      </div>

      {/* Selected node panel */}
      {selected && !practicing && (
        <div className={`ag-node-panel ${selected.isUnlocked ? 'unlocked' : selected.isAvailable ? 'available' : 'locked'}`}>
          <div className="ag-node-hanzi">{selected.node.hanzi}</div>
          <div className="ag-node-info">
            <div className="ag-node-pinyin">{selected.node.pinyin}</div>
            <div className="ag-node-meaning">{selected.node.meaning}</div>
            <div className="ag-node-meta">HSK {selected.node.hsk} · Requer {selected.node.cost} Bi</div>
          </div>
          <div className="ag-node-action">
            {selected.isUnlocked && <div className="ag-node-done">完 Desbloqueado</div>}
            {selected.isAvailable && (
              <button
                className={`ag-unlock-btn ${biPoints >= selected.node.cost ? 'can' : 'cant'}`}
                onClick={startPractice}
                disabled={biPoints < selected.node.cost}
              >
                <span>筆{selected.node.cost}</span>
                <span>{biPoints >= selected.node.cost ? '· Praticar & Desbloquear' : '· Sem pontos'}</span>
              </button>
            )}
            {!selected.isUnlocked && !selected.isAvailable && (
              <div className="ag-node-requires">
                <div className="ag-req-label">封 Requer</div>
                <div className="ag-req-chips">
                  {selected.node.requires.filter(r => !unlocked.has(r)).map(r => (
                    <span key={r} className="ag-req-chip">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
