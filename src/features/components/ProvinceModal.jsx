/**
 * ProvinceModal.jsx — v3
 * Grafo neural (teia) de conquista por província usando vis-network.
 * Conquista estilo "WAR": cada caractere conquistado gera +1 tropa (兵) e aumenta o domínio.
 * Prática individual: clica no caractere disponível e pratica exclusivamente ele.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import useStore from '../../store/useStore';
import { BOTS } from '../../data/imperioData.js';
import { hanziData } from '@/data/hanziData.js';

const BI_PER_CORRECT = 10;

// Função para reproduzir a pronúncia via TTS
function speak(text) {
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN'; utt.rate = 0.8;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

// Constrói nós e arestas da província
function buildProvinceGraph(province, conqueredChars) {
  const chars = province.chars || [];
  const rootChar = province.radical || chars[0];
  const charSet = new Set(chars);

  const nodes = chars.map(char => {
    const isRoot = char === rootChar;
    const isUnlocked = conqueredChars.includes(char);
    return {
      id: char,
      label: char,
      isRoot,
      isUnlocked,
    };
  });

  // Arestas baseadas no hanziData
  const edges = [];
  chars.forEach(char => {
    if (char === rootChar) return;

    const entry = hanziData.find(h => h.id === char);
    let linked = false;

    if (entry && entry.visual_parents) {
      entry.visual_parents.forEach(p => {
        if (charSet.has(p)) {
          edges.push({ id: `${p}->${char}`, from: p, to: char });
          linked = true;
        }
      });
    }

    // Se não tiver parente local na província, conecta diretamente ao Radical/Raiz
    if (!linked) {
      edges.push({ id: `${rootChar}->${char}`, from: rootChar, to: char });
    }
  });

  // Determinar nós disponíveis
  nodes.forEach(node => {
    if (node.isUnlocked) {
      node.isAvailable = false;
      return;
    }
    if (node.isRoot) {
      node.isAvailable = true;
      return;
    }
    // Disponível se todos os nós de origem (que apontam para ele) já estiverem desbloqueados
    const incomingEdges = edges.filter(e => e.to === node.id);
    node.isAvailable = incomingEdges.every(e => conqueredChars.includes(e.from));
  });

  return { nodes, edges };
}

// Gera as 3 perguntas de prática para o caractere selecionado
function buildPracticeQuestionsForChar(char, provinceChars) {
  const entry = hanziData.find(h => h.id === char);
  if (!entry) return [];

  // Pergunta 1: Pinyin
  const pinyinPool = hanziData.filter(h => h.id !== char && h.pinyin).map(h => h.pinyin);
  const uniquePinyins = [...new Set(pinyinPool)].sort(() => Math.random() - 0.5).slice(0, 3);
  const pinyinOptions = [
    { text: entry.pinyin, correct: true },
    ...uniquePinyins.map(p => ({ text: p, correct: false }))
  ].sort(() => Math.random() - 0.5);

  // Pergunta 2: Tradução/Significado
  const meaningPool = hanziData.filter(h => h.id !== char && (h.meaning_pt || h.meaning));
  const uniqueMeanings = meaningPool.sort(() => Math.random() - 0.5).slice(0, 3).map(h => h.meaning_pt || h.meaning);
  const meaningOptions = [
    { text: entry.meaning_pt || entry.meaning, correct: true },
    ...uniqueMeanings.map(m => ({ text: m, correct: false }))
  ].sort(() => Math.random() - 0.5);

  // Pergunta 3: Reconhecimento auditivo (TTS pronuncia e escolhe o caractere)
  const otherProvChars = provinceChars.filter(c => c !== char);
  const uniqueOtherChars = otherProvChars.sort(() => Math.random() - 0.5).slice(0, 3);
  const listeningOptions = [
    { text: char, correct: true },
    ...uniqueOtherChars.map(c => ({ text: c, correct: false }))
  ].sort(() => Math.random() - 0.5);

  return [
    {
      type: 'pinyin',
      question: `Qual é o Pinyin correto do caractere "${char}"?`,
      options: pinyinOptions,
    },
    {
      type: 'meaning',
      question: `Qual é o significado correto de "${char}"?`,
      options: meaningOptions,
    },
    {
      type: 'listening',
      question: `Ouça a pronúncia. Qual caractere correspondente foi falado?`,
      options: listeningOptions,
    }
  ];
}

export default function ProvinceModal({ province, playerState, botState, biPoints = 0, unlockedAbilities, onConquestUpdate, onUpgradeBuilding, onCollectResources, onClose }) {
  const user = useStore(state => state.user);
  const [phase, setPhase] = useState('info'); // 'info' | 'quiz' | 'result'
  const [conqueredChars, setConqueredChars] = useState(() => playerState?.conqueredChars || []);
  const [selectedChar, setSelectedChar] = useState(null); // { id, isRoot, isUnlocked, isAvailable }
  const [biGained, setBiGained] = useState(0);
  const [activeTab, setActiveTab] = useState('feudo'); // 'feudo' | 'teia'

  const buildings = playerState?.buildings || { school: 1, barracks: 0, wall: 0 };
  const currentPct = Math.round((conqueredChars.length / province.chars.length) * 100);
  const conquered = currentPct >= 100 || playerState?.conquered;

  // Custo de evolução
  const getUpgradeCostLocal = (type, lvl) => {
    const base = { school: 60, barracks: 80, wall: 100 }[type] || 50;
    return (lvl + 1) * base;
  };
  const upgradeCosts = {
    school: getUpgradeCostLocal('school', buildings.school || 0),
    barracks: getUpgradeCostLocal('barracks', buildings.barracks || 0),
    wall: getUpgradeCostLocal('wall', buildings.wall || 0),
  };

  // Recursos acumulados
  const PRODUCTION_RATES = { school: 6, barracks: 0.4 };
  const getProvincePassive = () => {
    if (!conquered || !playerState) return { bi: 0, troops: 0 };
    const lastColl = playerState.lastCollected || Date.now();
    const diffMs = Date.now() - lastColl;
    const hours = diffMs / 3600000;
    const schoolLvl = buildings.school || 1;
    const barracksLvl = buildings.barracks || 0;
    return {
      bi: Math.floor(hours * schoolLvl * PRODUCTION_RATES.school),
      troops: Math.floor(hours * barracksLvl * PRODUCTION_RATES.barracks)
    };
  };
  const passiveResources = getProvincePassive();

  // Estados do Quiz Individual
  const [quizChar, setQuizChar] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [answers, setAnswers] = useState([]);

  // Vis-Network Refs
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  // Inicializa o grafo vis-network
  useEffect(() => {
    if (phase !== 'info' || !containerRef.current) return;

    const { nodes, edges } = buildProvinceGraph(province, conqueredChars);

    const visNodes = nodes.map(n => {
      let bg = '#0f172a';
      let border = 'rgba(255,255,255,0.08)';
      let fontColor = 'rgba(255,255,255,0.2)';
      let size = 20;

      if (n.isUnlocked) {
        bg = '#78350f';
        border = '#e8d87a';
        fontColor = '#fbbf24';
        size = 26;
      } else if (n.isAvailable) {
        bg = '#1e3b5f';
        border = '#3b82f6';
        fontColor = '#93c5fd';
        size = 23;
      }

      if (n.isRoot) {
        size += 6;
      }

      return {
        id: n.id,
        label: n.id,
        size,
        color: {
          background: bg,
          border: border,
          highlight: { background: bg, border: border === '#e8d87a' ? '#fbbf24' : '#60a5fa' },
          hover: { background: bg, border: border === '#e8d87a' ? '#fbbf24' : '#60a5fa' },
        },
        font: {
          size: n.isRoot ? 20 : 16,
          color: fontColor,
          face: 'Noto Serif SC, serif',
          bold: n.isUnlocked,
        },
        shape: 'dot',
      };
    });

    const nodesDS = new DataSet(visNodes);
    const edgesDS = new DataSet(edges);

    const options = {
      nodes: { borderWidth: 2 },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        color: { color: 'rgba(255,255,255,0.12)', highlight: 'rgba(255,255,255,0.3)' },
        width: 1.5,
        smooth: { type: 'continuous' },
      },
      physics: {
        barnesHut: {
          gravitationalConstant: -1800,
          centralGravity: 0.15,
          springLength: 90,
          springConstant: 0.05,
          damping: 0.3,
        },
        stabilization: { iterations: 120 },
      },
      interaction: { hover: true, tooltipDelay: 100 },
      layout: { randomSeed: 7 },
    };

    const net = new Network(containerRef.current, { nodes: nodesDS, edges: edgesDS }, options);

    net.on('click', ({ nodes: clickedNodes }) => {
      if (!clickedNodes.length) {
        setSelectedChar(null);
        return;
      }
      const char = clickedNodes[0];
      const gNode = nodes.find(n => n.id === char);
      setSelectedChar(gNode || null);
    });

    networkRef.current = net;
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [phase, province, conqueredChars]);

  // Executa o áudio no listening do quiz
  useEffect(() => {
    if (phase === 'quiz' && questions[currentQ]) {
      const q = questions[currentQ];
      if (q.type === 'listening') {
        speak(q.char || quizChar);
      }
    }
  }, [phase, currentQ, questions, quizChar]);

  // Inicia a prática do ideograma selecionado
  const startPractice = useCallback(() => {
    if (!selectedChar || !selectedChar.isAvailable) return;
    const char = selectedChar.id;
    setQuizChar(char);
    const qs = buildPracticeQuestionsForChar(char, province.chars);
    setQuestions(qs);
    setCurrentQ(0);
    setSelectedOpt(null);
    setRevealed(false);
    setQuizScore(0);
    setAnswers([]);
    setPhase('quiz');
    speak(char);
  }, [selectedChar, province]);

  const handleSelectOpt = useCallback((opt) => {
    if (revealed) return;
    setSelectedOpt(opt);
    setRevealed(true);
    if (opt.correct) {
      setQuizScore(s => s + 1);
    }
    setAnswers(prev => [...prev, { correct: opt.correct }]);
  }, [revealed]);

  const handleNextQ = useCallback(() => {
    if (currentQ + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentQ(q => q + 1);
      setSelectedOpt(null);
      setRevealed(false);
    }
  }, [currentQ, questions]);

  const handleApplyResult = useCallback(() => {
    // Se acertar as 3 questões do ideograma, ele é conquistado!
    if (quizScore === questions.length) {
      const updated = [...conqueredChars, quizChar];
      setConqueredChars(updated);
      setBiGained(prev => prev + BI_PER_CORRECT);
      setSelectedChar(null);

      // Adiciona o caractere conquistado à coleção de cartas (SRS) do usuário
      if (user?.id) {
        fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, char: quizChar, srs_level: 1 })
        }).catch(err => console.error('Erro ao adicionar carta ao SRS:', err));
      }
    } else {
      alert('Você errou alguma pergunta. Tente praticar novamente para conquistar o ideograma!');
    }
    setPhase('info');
  }, [quizScore, questions, conqueredChars, quizChar, user]);

  const handleSaveModal = useCallback(() => {
    const newPct = Math.round((conqueredChars.length / province.chars.length) * 100);
    onConquestUpdate(newPct, biGained, conqueredChars);
    onClose();
  }, [conqueredChars, province, biGained, onConquestUpdate, onClose]);

  const bot = botState ? BOTS[botState.botId] : null;
  const available = playerState !== undefined;

  return (
    <div className="pmodal-overlay" onClick={e => e.target === e.currentTarget && handleSaveModal()}>
      <div className="pmodal" style={{ width: '560px' }}>
        {/* Header */}
        <div className="pmodal-header" style={{ borderBottomColor: province.color + '60' }}>
          <div className="pmodal-title-group">
            <span className="pmodal-domain-hanzi" style={{ color: province.color }}>{province.domainHanzi}</span>
            <div>
              <div className="pmodal-cn">{province.nameCN}</div>
              <div className="pmodal-en">{province.name} · {province.domain}</div>
            </div>
          </div>
          <button className="pmodal-close" onClick={handleSaveModal}>✕</button>
        </div>

        {/* INFO / TEIA DO VIS-NETWORK */}
        {phase === 'info' && (
          <div className="pmodal-body">
            <p className="pmodal-desc" style={{ marginBottom: '12px' }}>{province.description}</p>

            {/* Alternador de abas se conquistado */}
            {conquered && (
              <div className="pmodal-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <button 
                  className={`pmodal-tab-btn ${activeTab === 'feudo' ? 'active' : ''}`}
                  onClick={() => setActiveTab('feudo')}
                  style={{
                    background: activeTab === 'feudo' ? 'rgba(232,216,122,0.1)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'feudo' ? '#e8d87a' : 'rgba(255,255,255,0.5)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'feudo' ? 'bold' : 'normal'
                  }}
                >
                  🏰 Feudo Imperial
                </button>
                <button 
                  className={`pmodal-tab-btn ${activeTab === 'teia' ? 'active' : ''}`}
                  onClick={() => setActiveTab('teia')}
                  style={{
                    background: activeTab === 'teia' ? 'rgba(232,216,122,0.1)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'teia' ? '#e8d87a' : 'rgba(255,255,255,0.5)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'teia' ? 'bold' : 'normal'
                  }}
                >
                  🕸️ Teia de Ideogramas
                </button>
              </div>
            )}

            {/* ABA 1: CONSTRUÇÕES E FEUDO (Apenas se conquistado e tab ativa) */}
            {conquered && activeTab === 'feudo' && (
              <div className="feudo-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Colheita de Recursos */}
                <div className="feudo-collect-box" style={{
                  background: 'linear-gradient(135deg, rgba(234,179,8,0.08) 0%, rgba(234,179,8,0.02) 100%)',
                  border: '1px solid rgba(234,179,8,0.2)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recursos no Feudo</div>
                    <div style={{ display: 'flex', gap: '18px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#eab308', fontWeight: 'bold', fontSize: '15px' }}>筆 {passiveResources.bi}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>pincéis</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '15px' }}>兵 {passiveResources.troops}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>tropas</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="pmodal-start-btn" 
                    onClick={onCollectResources}
                    disabled={passiveResources.bi === 0 && passiveResources.troops === 0}
                    style={{ 
                      background: (passiveResources.bi > 0 || passiveResources.troops > 0) ? '#eab308' : 'rgba(255,255,255,0.05)',
                      color: (passiveResources.bi > 0 || passiveResources.troops > 0) ? '#78350f' : 'rgba(255,255,255,0.2)',
                      padding: '10px 18px',
                      fontSize: '12px',
                      width: 'auto',
                      fontWeight: 'bold',
                      borderRadius: '8px'
                    }}
                  >
                    收 Colher Recursos
                  </button>
                </div>

                {/* Lista de Estruturas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* ESCOLA */}
                  <div className="feudo-building-card" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🎓</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>Escola Hanzi</span>
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'rgba(255,255,255,0.6)' }}>
                          Nível {buildings.school}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Produção: <span style={{ color: '#eab308' }}>+{buildings.school * 6} Bi/hora</span>
                      </div>
                    </div>
                    <button 
                      className="pmodal-start-btn" 
                      onClick={() => onUpgradeBuilding('school')}
                      disabled={biPoints < upgradeCosts.school}
                      style={{
                        background: biPoints >= upgradeCosts.school ? '#2563eb' : 'rgba(255,255,255,0.05)',
                        color: biPoints >= upgradeCosts.school ? '#fff' : 'rgba(255,255,255,0.2)',
                        padding: '6px 12px',
                        fontSize: '11px',
                        width: 'auto',
                        borderRadius: '6px'
                      }}
                    >
                      Evoluir (筆 {upgradeCosts.school})
                    </button>
                  </div>

                  {/* QUARTEL */}
                  <div className="feudo-building-card" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>⛺</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>Quartel Imperial</span>
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'rgba(255,255,255,0.6)' }}>
                          Nível {buildings.barracks}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Produção: <span style={{ color: '#60a5fa' }}>+{buildings.barracks * 0.4} tropas/hora</span> (acumulado: {playerState?.extraTroops || 0} extra)
                      </div>
                    </div>
                    <button 
                      className="pmodal-start-btn" 
                      onClick={() => onUpgradeBuilding('barracks')}
                      disabled={biPoints < upgradeCosts.barracks}
                      style={{
                        background: biPoints >= upgradeCosts.barracks ? '#2563eb' : 'rgba(255,255,255,0.05)',
                        color: biPoints >= upgradeCosts.barracks ? '#fff' : 'rgba(255,255,255,0.2)',
                        padding: '6px 12px',
                        fontSize: '11px',
                        width: 'auto',
                        borderRadius: '6px'
                      }}
                    >
                      Evoluir (筆 {upgradeCosts.barracks})
                    </button>
                  </div>

                  {/* MURALHA */}
                  <div className="feudo-building-card" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🧱</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>Grande Muralha</span>
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'rgba(255,255,255,0.6)' }}>
                          Nível {buildings.wall}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                        Proteção: <span style={{ color: '#4ade80' }}>+{buildings.wall * 15}% resistência a invasões</span>
                      </div>
                    </div>
                    <button 
                      className="pmodal-start-btn" 
                      onClick={() => onUpgradeBuilding('wall')}
                      disabled={biPoints < upgradeCosts.wall}
                      style={{
                        background: biPoints >= upgradeCosts.wall ? '#2563eb' : 'rgba(255,255,255,0.05)',
                        color: biPoints >= upgradeCosts.wall ? '#fff' : 'rgba(255,255,255,0.2)',
                        padding: '6px 12px',
                        fontSize: '11px',
                        width: 'auto',
                        borderRadius: '6px'
                      }}
                    >
                      Evoluir (筆 {upgradeCosts.wall})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: TEIA DE CARACTERES (Se não conquistado, ou se tab ativa) */}
            {(!conquered || activeTab === 'teia') && (
              <>
                {/* Status Militar (WAR) */}
                <div className="pmodal-war-hud" style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px', color: '#e8d87a', fontFamily: 'Noto Serif SC, serif' }}>兵</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' }}>
                      Guarnição Imperial: {conqueredChars.length} / {province.chars.length} Tropas
                    </span>
                  </div>
                  {biGained > 0 && (
                    <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#4ade80', fontWeight: 'bold' }}>
                      + {biGained} Bi nesta sessão
                    </div>
                  )}
                </div>

                {/* Canvas do Grafo da Província */}
                <div className="pmodal-graph-container" style={{ position: 'relative', height: '280px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', background: '#070a13', overflow: 'hidden', marginTop: '12px' }}>
                  <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
                  <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '9px', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
                    Conquiste a raiz para liberar novos nós
                  </div>
                </div>

                {/* Painel do Caractere Selecionado */}
                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', minHeight: '90px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {selectedChar ? (
                    <>
                      <div style={{ fontSize: '44px', fontFamily: 'Noto Serif SC, serif', color: selectedChar.isUnlocked ? '#e8d87a' : selectedChar.isAvailable ? '#3b82f6' : 'rgba(255,255,255,0.25)', minWidth: '50px', textAlign: 'center', lineHeight: '1' }}>
                        {selectedChar.id}
                      </div>
                      <div style={{ flex: '1' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {selectedChar.isUnlocked ? 'Dominado' : selectedChar.isAvailable ? 'Disponível para Ataque' : 'Bloqueado (Trancado)'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginTop: '2px' }}>
                          Caractere da Teia de {province.nameCN}
                        </div>
                      </div>
                      <div>
                        {selectedChar.isUnlocked && (
                          <span style={{ fontSize: '12px', color: '#e8d87a', fontWeight: 'bold', fontFamily: 'Noto Serif SC, serif' }}>
                            完 Dominado
                          </span>
                        )}
                        {selectedChar.isAvailable && available && (
                          <button 
                            className="pmodal-start-btn" 
                            style={{ background: '#2563eb', padding: '8px 16px', fontSize: '12px', width: 'auto', borderRadius: '8px' }} 
                            onClick={startPractice}
                          >
                            征 Atacar Ideograma
                          </button>
                        )}
                        {!selectedChar.isUnlocked && !selectedChar.isAvailable && (
                          <span style={{ fontSize: '11px', color: '#ef4444' }}>
                            Requer nós anteriores
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', width: '100%', fontStyle: 'italic' }}>
                      Selecione um caractere na teia acima para praticá-lo
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Barra Geral de Progresso */}
            <div className="pmodal-bar-wrap" style={{ marginTop: '14px' }}>
              <div className="pmodal-bar-bg">
                <div className="pmodal-bar-fill" style={{ width: `${currentPct}%`, background: province.color }} />
              </div>
              <span className="pmodal-bar-label">{currentPct}% conquistado da província</span>
            </div>

            {/* Atalho de Conquista para testes */}
            {!conquered && (
              <button 
                onClick={() => {
                  const allChars = province.chars;
                  setConqueredChars(allChars);
                  setBiGained(prev => prev + allChars.length * BI_PER_CORRECT);
                  setSelectedChar(null);
                  if (user?.id) {
                    allChars.forEach(c => {
                      fetch('/api/cards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, char: c, srs_level: 1 })
                      }).catch(() => {});
                    });
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px dashed rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontSize: '11px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginTop: '10px',
                  width: '100%',
                  display: 'block',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              >
                ⚡ Conquista Rápida (Debug / Testes)
              </button>
            )}

            {bot && (
              <div className="pmodal-bot-threat" style={{ borderColor: bot.color + '60', color: bot.color, marginTop: '12px', marginBottom: '0' }}>
                <span className="pmodal-bot-hanzi">{bot.hanzi}</span>
                {bot.fullName} avança aqui ({botState.pct}%)
              </div>
            )}

            {conquered && (
              <div className="pmodal-conquered" style={{ marginTop: '12px', padding: '6px' }}>
                完 Província sob total domínio imperial!
              </div>
            )}
          </div>
        )}

        {/* QUIZ INDIVIDUAL DO CARACTERE */}
        {phase === 'quiz' && questions[currentQ] && (
          <div className="pmodal-body">
            <div className="quiz-dots">
              {questions.map((_, i) => (
                <div key={i} className={`qdot ${i < currentQ ? (answers[i]?.correct ? 'ok' : 'err') : i === currentQ ? 'active' : ''}`} />
              ))}
            </div>

            <div className="quiz-char-box" onClick={() => speak(quizChar)}>
              <div className="quiz-big-char">{quizChar}</div>
              {questions[currentQ].type === 'listening' ? (
                <div className="quiz-tap-hint">🔊 Ouvir pronúncia novamente</div>
              ) : (
                <div className="quiz-tap-hint">叩 toque para ouvir pronúncia</div>
              )}
            </div>

            <p className="quiz-question">{questions[currentQ].question}</p>

            <div className="quiz-opts">
              {questions[currentQ].options.map((opt, i) => {
                let cls = 'qopt';
                if (revealed) {
                  cls += opt.correct ? ' correct' : opt === selectedOpt ? ' wrong' : ' disabled';
                }
                return (
                  <button 
                    key={i} 
                    className={cls} 
                    onClick={() => handleSelectOpt(opt)}
                    disabled={revealed}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <button className="quiz-next" onClick={handleNextQ}>
                {currentQ + 1 >= questions.length ? '結 Ver Resultado' : '次 Próxima Pergunta'}
              </button>
            )}
          </div>
        )}

        {/* RESULTADO DA PRÁTICA */}
        {phase === 'result' && (
          <div className="pmodal-body pmodal-result">
            <div className="result-score-big" style={{ marginTop: '16px' }}>
              <span style={{ color: quizScore === questions.length ? '#e8d87a' : '#ef4444' }}>{quizScore}</span>
              <span className="result-of">/{questions.length}</span>
            </div>
            
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '20px' }}>
              {quizScore === questions.length 
                ? `Sucesso! O ideograma "${quizChar}" foi dominado e adicionado à guarnição militar.`
                : `Você errou algumas perguntas. Domínio de "${quizChar}" mal sucedido.`
              }
            </p>

            <div className="result-gains" style={{ display: 'flex', justifyCenter: 'center', gap: '30px', marginBottom: '20px' }}>
              <div className="gain-chip">
                <span className="gain-val" style={{ color: quizScore === questions.length ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                  {quizScore === questions.length ? '+1' : '0'}
                </span>
                <span className="gain-lbl">Guarnição (兵)</span>
              </div>
              <div className="gain-chip">
                <span className="gain-val" style={{ color: quizScore === questions.length ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                  筆 {quizScore === questions.length ? `+${BI_PER_CORRECT}` : '0'}
                </span>
                <span className="gain-lbl">Pontos Imperial</span>
              </div>
            </div>

            <button 
              className="pmodal-start-btn" 
              style={{ background: province.color }} 
              onClick={handleApplyResult}
            >
              定 Voltar à Teia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
