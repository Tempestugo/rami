import React, { useState, useEffect, useCallback } from 'react';
import { hanziData } from '@/data/hanziData.js';
import { grammarData } from '@/data/grammarData.js';

const hanziMap = new Map(hanziData.map(h => [h.id, h]));

const LEVEL_NAMES = ['', 'Aprendendo', 'Familiar', 'Consolidando', 'Dominando', 'Mestre'];
const SRS_COLORS = {
  1: 'bg-red-500/20 border-red-500/40 text-red-300',
  2: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  3: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  4: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  5: 'bg-jade-500/20 border-jade-500/40 text-jade-300',
};

const SRS_BAR_COLORS = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-jade-500',
};

function getDailyGrammarPoint(dateObj = new Date()) {
  const levelSetting = localStorage.getItem('rami_wiki_hsk_level') || 'hsk1';
  let pool = grammarData.filter(g => g.hsk === 1);
  if (levelSetting === 'hsk1_hsk2') {
    pool = grammarData.filter(g => g.hsk === 1 || g.hsk === 2);
  }
  if (pool.length === 0) return grammarData[0];
  const localTime = dateObj.getTime() - dateObj.getTimezoneOffset() * 60000;
  const dayIndex = Math.floor(localTime / 86400000);
  return pool[dayIndex % pool.length];
}

export default function UserProfile() {
  const [knownCards, setKnownCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wikiLevel, setWikiLevel] = useState(() => localStorage.getItem('rami_wiki_hsk_level') || 'hsk1');

  // Carrega cartas conhecidas
  const loadCards = useCallback(() => {
    setLoading(true);
    fetch('/api/cards/1')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.success) {
          setKnownCards(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleWikiLevelChange = (level) => {
    setWikiLevel(level);
    localStorage.setItem('rami_wiki_hsk_level', level);
    // Dispara um evento customizado para que outras abas (como a Home) saibam que as configurações mudaram
    window.dispatchEvent(new Event('storage'));
  };

  // 1. Progresso HSK 1
  const hsk1Total = hanziData.filter(h => h.hsk === 1).length;
  const hsk1Known = knownCards.filter(c => {
    const h = hanziMap.get(c.char);
    return h && h.hsk === 1;
  }).length;
  const hsk1Pct = hsk1Total > 0 ? Math.round((hsk1Known / hsk1Total) * 100) : 0;

  // 2. Progresso de Lições Wiki
  const dailyDone = (() => {
    try {
      return JSON.parse(localStorage.getItem('rami_daily_done') || '{}');
    } catch {
      return {};
    }
  })();

  const doneKeys = Object.keys(dailyDone).filter(k => k.endsWith(':grammar') && dailyDone[k]);
  const completedGrammarTitles = new Set();
  doneKeys.forEach(k => {
    const datePart = k.split(':grammar')[0];
    const dateObj = new Date(datePart);
    if (!isNaN(dateObj.getTime())) {
      const pt = getDailyGrammarPoint(dateObj);
      if (pt) {
        completedGrammarTitles.add(pt.title);
      }
    }
  });

  const grammarPool = grammarData.filter(g => {
    if (wikiLevel === 'hsk1_hsk2') {
      return g.hsk === 1 || g.hsk === 2;
    }
    return g.hsk === 1;
  });
  const totalGrammarInPool = grammarPool.length;
  // Conta apenas lições concluídas que pertencem ao pool atual
  const completedInPool = Array.from(completedGrammarTitles).filter(title => 
    grammarPool.some(g => g.title === title)
  ).length;

  const wikiPct = totalGrammarInPool > 0 ? Math.round((completedInPool / totalGrammarInPool) * 100) : 0;

  // 3. Distribuição SRS
  const srsDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  knownCards.forEach(c => {
    const lvl = Math.min(Math.max(c.srs_level || 1, 1), 5);
    srsDistribution[lvl]++;
  });

  const maxSrsCount = Math.max(...Object.values(srsDistribution), 1);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ink-950 text-jade-300 font-mono">
        Carregando perfil do usuário...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-ink-950 p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Header de Perfil */}
        <div className="flex items-center gap-4 bg-ink-900 border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-vermillion-500 to-orange-400 flex items-center justify-center text-3xl shadow-md">
            👤
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-2xl">Perfil do Estudante</h1>
            <p className="text-ink-400 font-body text-sm mt-0.5">
              Acompanhe seu progresso de aprendizado e personalize seu plano de estudos.
            </p>
          </div>
        </div>

        {/* Progresso Geral */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card Vocabulário HSK 1 */}
          <div className="bg-ink-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-md hover:border-jade-500/30 transition-all duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-jade-400 font-mono uppercase tracking-widest">Vocabulário</span>
                <h3 className="text-white font-display font-bold text-lg mt-0.5">Caracteres HSK 1</h3>
              </div>
              <span className="text-2xl">🏮</span>
            </div>
            
            <div className="mt-2">
              <div className="flex justify-between text-xs font-mono text-ink-300 mb-1.5">
                <span>{hsk1Known} de {hsk1Total} aprendidos</span>
                <span className="text-jade-400 font-bold">{hsk1Pct}%</span>
              </div>
              <div className="h-3 bg-ink-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-jade-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${hsk1Pct}%` }}
                />
              </div>
            </div>
            <p className="text-ink-400 text-xs font-body leading-relaxed mt-auto">
              Seu progresso com base em ideogramas HSK 1 adicionados à sua coleção SRS. Complete lições do dia para desbloquear mais!
            </p>
          </div>

          {/* Card Wiki de Gramática */}
          <div className="bg-ink-900 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-md hover:border-azure-500/30 transition-all duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-azure-400 font-mono uppercase tracking-widest">Gramática Wiki</span>
                <h3 className="text-white font-display font-bold text-lg mt-0.5">Pontos de Gramática</h3>
              </div>
              <span className="text-2xl">📚</span>
            </div>

            <div className="mt-2">
              <div className="flex justify-between text-xs font-mono text-ink-300 mb-1.5">
                <span>{completedInPool} de {totalGrammarInPool} concluídos</span>
                <span className="text-azure-400 font-bold">{wikiPct}%</span>
              </div>
              <div className="h-3 bg-ink-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-azure-500 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${wikiPct}%` }}
                />
              </div>
            </div>
            <p className="text-ink-400 text-xs font-body leading-relaxed mt-auto">
              Número de artigos do Chinese Grammar Wiki lidos e completados. Atualmente configurado para filtrar {wikiLevel === 'hsk1_hsk2' ? 'HSK 1 e HSK 2' : 'apenas HSK 1'}.
            </p>
          </div>

        </div>

        {/* Distribuição SRS */}
        <div className="bg-ink-900 border border-white/10 rounded-2xl p-6 shadow-md">
          <h3 className="text-white font-bold text-base font-display mb-2">Distribuição de Proficiência (SRS)</h3>
          <p className="text-ink-400 text-xs font-body mb-6">
            Seus caracteres conhecidos classificados pelos níveis do algoritmo de repetição espaçada.
          </p>

          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map(lvl => {
              const count = srsDistribution[lvl];
              const pct = knownCards.length > 0 ? Math.round((count / knownCards.length) * 100) : 0;
              const barWidth = Math.round((count / maxSrsCount) * 100);

              return (
                <div key={lvl} className="flex items-center gap-4">
                  {/* Nome do Nível */}
                  <div className="w-28 text-xs font-mono font-bold text-ink-300">
                    Lv {lvl} — {LEVEL_NAMES[lvl]}
                  </div>

                  {/* Barra de Distribuição */}
                  <div className="flex-1 h-6 bg-ink-800/50 rounded-lg overflow-hidden relative border border-white/5">
                    <div 
                      className={`h-full ${SRS_BAR_COLORS[lvl]} opacity-80 rounded-r-md transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-white drop-shadow">
                      {count} {count === 1 ? 'carta' : 'cartas'}
                    </span>
                  </div>

                  {/* Porcentagem */}
                  <div className="w-10 text-right text-xs font-mono text-ink-400">
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configurações */}
        <div className="bg-ink-900 border border-white/10 rounded-2xl p-6 shadow-md">
          <h3 className="text-white font-bold text-base font-display mb-1">Configurações de Estudo</h3>
          <p className="text-ink-400 text-xs font-body mb-5">
            Personalize a dificuldade e o escopo das lições diárias.
          </p>

          <div className="flex flex-col gap-6">
            
            {/* Seletor Wiki */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-black/20 rounded-xl border border-white/5">
              <div>
                <h4 className="text-white text-sm font-bold font-display">Escopo de Níveis da Gramática do Dia</h4>
                <p className="text-ink-400 text-xs font-body mt-0.5">
                  Selecione quais níveis do Chinese Grammar Wiki serão sugeridos na rotação diária.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleWikiLevelChange('hsk1')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition border ${
                    wikiLevel === 'hsk1'
                      ? 'bg-azure-500/15 border-azure-400 text-azure-300 font-extrabold shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                      : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
                  }`}
                >
                  Apenas HSK 1
                </button>
                <button
                  onClick={() => handleWikiLevelChange('hsk1_hsk2')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition border ${
                    wikiLevel === 'hsk1_hsk2'
                      ? 'bg-azure-500/15 border-azure-400 text-azure-300 font-extrabold shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                      : 'bg-white/5 border-white/10 text-ink-400 hover:bg-white/8'
                  }`}
                >
                  HSK 1 e HSK 2
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Estudos de Contexto (Coming Soon) */}
        <div className="bg-ink-900 border border-white/5 rounded-2xl p-6 shadow-md relative overflow-hidden select-none opacity-60 border-dashed">
          <div className="absolute top-4 right-4 text-xs font-mono bg-white/5 border border-white/10 text-ink-400 px-2 py-0.5 rounded flex items-center gap-1">
            <span>🔒</span> Em breve
          </div>
          
          <h3 className="text-white font-bold text-base font-display flex items-center gap-2 mb-2">
            Estudos de Contexto
          </h3>
          <p className="text-ink-400 text-xs font-body leading-relaxed max-w-xl">
            Pratique compreensão de textos e diálogos do mundo real compostos apenas por caracteres que você já domina. Uma forma dinâmica de testar a retenção de vocabulário e a leitura em contextos reais.
          </p>

          <div className="mt-4 flex gap-4 items-center">
            <div className="h-2 bg-ink-800 rounded-full flex-1" />
            <span className="text-xs font-mono text-ink-500">0% de proficiência contextual</span>
          </div>
        </div>

      </div>
    </div>
  );
}
