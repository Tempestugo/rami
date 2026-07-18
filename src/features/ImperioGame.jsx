/**
 * src/features/ImperioGame.jsx — v3
 * Layout: mapa full-screen + painéis flutuantes
 */
import { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import ChinaMap from './components/ChinaMap.jsx';
import ProvinceModal from './components/ProvinceModal.jsx';
import AbilityGraph from './components/AbilityGraph.jsx';
import BotPanel from './components/BotPanel.jsx';
import { PROVINCES, BOTS, ADJACENCY, STARTING_BI } from '../data/imperioData.js';

const STORAGE_KEY = 'rami_imperio_v3';

function loadState(userId) {
  try { const r = localStorage.getItem(`${STORAGE_KEY}_${userId}`); if (r) return JSON.parse(r); } catch (_) {}
  return null;
}
function saveState(userId, state) {
  try { localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(state)); } catch (_) {}
}
function getInitialBotConquest() {
  const bc = {};
  Object.values(BOTS).forEach(bot => {
    bc[bot.startProvince] = { botId: bot.id, pct: 20, lastTick: Date.now() };
  });
  return bc;
}
function tickBots(state) {
  const now = Date.now();
  const bc = { ...state.botConquest };
  Object.entries(bc).forEach(([provId, bs]) => {
    const bot = BOTS[bs.botId];
    if (!bot) return;
    const hrs = (now - bs.lastTick) / 3600000;
    const gain = Math.floor(hrs * bot.advanceRate);
    if (gain > 0) bc[provId] = { ...bs, pct: Math.min(100, bs.pct + gain), lastTick: now };
  });
  return { ...state, botConquest: bc };
}
const PRODUCTION_RATES = {
  school: 6,      // 6 Bi por nível por hora
  barracks: 0.4,   // 0.4 tropas por nível por hora (1 a cada 2.5h)
};

export function getUpgradeCost(buildingType, currentLevel) {
  const base = { school: 60, barracks: 80, wall: 100 }[buildingType] || 50;
  return (currentLevel + 1) * base;
}

export function calculatePassiveResources(playerProvState) {
  if (!playerProvState?.conquered || !playerProvState.buildings) {
    return { bi: 0, troops: 0, hours: 0 };
  }
  const lastColl = playerProvState.lastCollected || Date.now();
  const diffMs = Date.now() - lastColl;
  const hours = diffMs / 3600000;

  const schoolLvl = playerProvState.buildings.school || 1;
  const barracksLvl = playerProvState.buildings.barracks || 0;

  const bi = Math.floor(hours * schoolLvl * PRODUCTION_RATES.school);
  const troops = Math.floor(hours * barracksLvl * PRODUCTION_RATES.barracks);

  return { bi, troops, hours };
}

function getInitialState() {
  return {
    started: false,
    playerProvince: {},
    botConquest: getInitialBotConquest(),
    biPoints: STARTING_BI,
    unlockedAbilities: [],
    startedAt: null,
  };
}

export default function ImperioGame() {
  const user = useStore(s => s.user);
  const [gameState, setGameState] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [panel, setPanel] = useState(null); // 'abilities' | 'bots' | null
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const saved = loadState(user.id);
    if (saved) {
      // Garante que províncias conquistadas tenham estruturas e timestamp de colheita
      Object.keys(saved.playerProvince || {}).forEach(provId => {
        const prov = saved.playerProvince[provId];
        if (prov.conquered && !prov.buildings) {
          prov.buildings = { school: 1, barracks: 0, wall: 0 };
          prov.lastCollected = Date.now();
        }
      });
      setGameState(tickBots(saved));
    } else {
      setGameState(getInitialState());
    }
  }, [user?.id]);

  useEffect(() => {
    if (gameState && user?.id) saveState(user.id, gameState);
  }, [gameState, user?.id]);

  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const handleChooseStart = useCallback((provId) => {
    if (!PROVINCES[provId]) return;
    const botHere = gameState.botConquest[provId];
    if (botHere?.pct >= 100) { notify(`Região já dominada por um rival!`, 'error'); return; }
    setGameState(prev => {
      const pp = { [provId]: { pct: 0, conquered: false, available: true } };
      (ADJACENCY[provId] || []).forEach(adj => { if (!pp[adj]) pp[adj] = { pct: 0, conquered: false, available: true }; });
      return { ...prev, started: true, playerProvince: pp, startedAt: Date.now() };
    });
    setSelectedProvince(provId);
    notify(`${PROVINCES[provId].nameCN} — início da conquista!`, 'success');
  }, [gameState, notify]);

  const handleConquestUpdate = useCallback((provId, newPct, biEarned, conqueredChars) => {
    setGameState(prev => {
      const pp = { ...(prev.playerProvince || {}) };
      const isAlreadyConquered = pp[provId]?.conquered;
      pp[provId] = { 
        ...pp[provId], 
        pct: newPct, 
        conquered: newPct >= 100,
        conqueredChars: conqueredChars || pp[provId]?.conqueredChars || []
      };
      if (newPct >= 100 && !isAlreadyConquered) {
        (ADJACENCY[provId] || []).forEach(adj => { if (!pp[adj]) pp[adj] = { pct: 0, conquered: false, available: true }; });
        notify(`${PROVINCES[provId]?.nameCN} conquistada!`, 'success');
      }
      return { ...prev, playerProvince: pp, biPoints: (prev.biPoints || 0) + biEarned };
    });
  }, [notify]);

  const handleUnlockAbility = useCallback((abilityId, cost) => {
    setGameState(prev => {
      if ((prev.biPoints || 0) < cost) return prev;
      return { ...prev, biPoints: prev.biPoints - cost, unlockedAbilities: [...(prev.unlockedAbilities || []), abilityId] };
    });
  }, []);

  const handleReset = useCallback(() => {
    if (!user?.id) return;
    const fresh = getInitialState();
    setGameState(fresh);
    saveState(user.id, fresh);
    setSelectedProvince(null);
    setPanel(null);
  }, [user?.id]);

  const handleUpgradeBuilding = useCallback((provId, buildingType) => {
    setGameState(prev => {
      const pp = { ...(prev.playerProvince || {}) };
      const prov = pp[provId];
      if (!prov || !prov.conquered) return prev;

      const currentLevel = prov.buildings?.[buildingType] || 0;
      const cost = getUpgradeCost(buildingType, currentLevel);

      if (prev.biPoints < cost) {
        notify('Pontos Bi insuficientes!', 'error');
        return prev;
      }

      const updatedBuildings = {
        ...prov.buildings,
        [buildingType]: currentLevel + 1
      };

      pp[provId] = {
        ...prov,
        buildings: updatedBuildings
      };

      notify(`Evoluído ${buildingType === 'school' ? 'Escola' : buildingType === 'barracks' ? 'Quartel' : 'Muralha'} para Nível ${currentLevel + 1}!`, 'success');

      return {
        ...prev,
        biPoints: prev.biPoints - cost,
        playerProvince: pp
      };
    });
  }, [notify]);

  const handleCollectResources = useCallback((provId) => {
    setGameState(prev => {
      const pp = { ...(prev.playerProvince || {}) };
      const prov = pp[provId];
      if (!prov || !prov.conquered) return prev;

      const { bi, troops } = calculatePassiveResources(prov);
      if (bi === 0 && troops === 0) {
        notify('Nenhum recurso acumulado ainda.', 'info');
        return prev;
      }

      pp[provId] = {
        ...prov,
        lastCollected: Date.now(),
        extraTroops: (prov.extraTroops || 0) + troops
      };

      notify(`Colhido +${bi} Bi e +${troops} Tropas em ${PROVINCES[provId].nameCN}!`, 'success');

      return {
        ...prev,
        biPoints: prev.biPoints + bi,
        playerProvince: pp
      };
    });
  }, [notify]);

  const handleCollectAll = useCallback(() => {
    setGameState(prev => {
      const pp = { ...(prev.playerProvince || {}) };
      let totalBi = 0;
      let totalTroops = 0;
      let collectedCount = 0;

      Object.keys(pp).forEach(provId => {
        const prov = pp[provId];
        if (prov.conquered) {
          const { bi, troops } = calculatePassiveResources(prov);
          if (bi > 0 || troops > 0) {
            totalBi += bi;
            totalTroops += troops;
            pp[provId] = {
              ...prov,
              lastCollected: Date.now(),
              extraTroops: (prov.extraTroops || 0) + troops
            };
            collectedCount++;
          }
        }
      });

      if (collectedCount === 0) {
        notify('Nenhuma colheita disponível no momento.', 'info');
        return prev;
      }

      notify(`Coletado +${totalBi} Bi e +${totalTroops} Tropas de ${collectedCount} feudos!`, 'success');

      return {
        ...prev,
        biPoints: prev.biPoints + totalBi,
        playerProvince: pp
      };
    });
  }, [notify]);

  if (!gameState) return (
    <div className="ig-loading"><span className="ig-loading-hanzi">帝</span><span>載入中...</span></div>
  );

  const conqueredCount = Object.values(gameState.playerProvince).filter(p => p.conquered).length;
  const totalProvinces = Object.keys(PROVINCES).length;
  const unlockedSet = new Set(gameState.unlockedAbilities || []);

  // Calcula recursos pendentes para colheita
  const pendingCollections = {};
  if (gameState.playerProvince) {
    Object.keys(gameState.playerProvince).forEach(provId => {
      const prov = gameState.playerProvince[provId];
      if (prov.conquered) {
        const { bi } = calculatePassiveResources(prov);
        if (bi > 0) pendingCollections[provId] = bi;
      }
    });
  }
  const hasPending = Object.keys(pendingCollections).length > 0;

  return (
    <div className="ig-root">
      {/* Notification toast */}
      {notification && (
        <div className={`ig-toast ${notification.type}`}>{notification.msg}</div>
      )}

      {/* Header overlay */}
      <div className="ig-hud">
        <div className="ig-hud-left">
          <span className="ig-hud-brand">帝國漢字</span>
          <div className="ig-hud-sep" />
          <div className="ig-stat">
            <span className="ig-stat-icon">地</span>
            <span className="ig-stat-val">{conqueredCount}</span>
            <span className="ig-stat-of">/{totalProvinces}</span>
          </div>
          <div className="ig-hud-sep" />
          <div className="ig-stat">
            <span className="ig-stat-icon">筆</span>
            <span className="ig-stat-val" style={{ color: '#e8d87a' }}>{gameState.biPoints}</span>
          </div>
          <div className="ig-hud-sep" />
          <div className="ig-stat">
            <span className="ig-stat-icon">術</span>
            <span className="ig-stat-val">{gameState.unlockedAbilities?.length || 0}</span>
          </div>
        </div>

        <div className="ig-hud-right">
          {hasPending && (
            <button className="ig-hud-btn" onClick={handleCollectAll} style={{ background: 'rgba(234,179,8,0.15)', borderColor: '#eab308', color: '#eab308' }}>
              <span className="ig-btn-hanzi">收</span>
              <span>Colher Tudo</span>
            </button>
          )}
          <button
            className={`ig-hud-btn ${panel === 'abilities' ? 'active' : ''}`}
            onClick={() => setPanel(p => p === 'abilities' ? null : 'abilities')}
          >
            <span className="ig-btn-hanzi">術</span>
            <span>Habilidades</span>
          </button>
          <button
            className={`ig-hud-btn ${panel === 'bots' ? 'active' : ''}`}
            onClick={() => setPanel(p => p === 'bots' ? null : 'bots')}
          >
            <span className="ig-btn-hanzi">敵</span>
            <span>Rivais</span>
          </button>
          <button className="ig-hud-btn ig-reset-btn" onClick={handleReset} title="Reiniciar">
            <span className="ig-btn-hanzi">新</span>
          </button>
        </div>
      </div>

      {/* Full-screen map */}
      <div className="ig-map">
        {!gameState.started && (
          <div className="ig-start-overlay">
            <div className="ig-start-card">
              <div className="ig-start-hanzi">帝國漢字</div>
              <div className="ig-start-title">Império Hanzi</div>
              <div className="ig-start-sub">Escolha uma província para iniciar a conquista</div>
              <div className="ig-start-hint">Clique em qualquer região no mapa</div>
              <div className="ig-start-bi">
                <span className="ig-start-bi-icon">筆</span>
                <span>{gameState.biPoints} points iniciais</span>
              </div>
              <div className="ig-start-rivals">{Object.keys(BOTS).length} impérios rivais avançando...</div>
            </div>
          </div>
        )}

        <ChinaMap
          playerProvince={gameState.playerProvince}
          botConquest={gameState.botConquest}
          pendingCollections={pendingCollections}
          onCollect={handleCollectResources}
          onProvinceClick={provId => {
            if (!gameState.started) handleChooseStart(provId);
            else setSelectedProvince(provId);
          }}
          started={gameState.started}
        />
      </div>

      {/* Floating: Ability Graph */}
      {panel === 'abilities' && (
        <div className="ig-float-panel ig-float-left">
          <AbilityGraph
            unlocked={unlockedSet}
            biPoints={gameState.biPoints}
            onUnlock={handleUnlockAbility}
            onClose={() => setPanel(null)}
          />
        </div>
      )}

      {/* Floating: Bot Panel */}
      {panel === 'bots' && (
        <div className="ig-float-panel ig-float-right">
          <BotPanel
            botConquest={gameState.botConquest}
            playerProvince={gameState.playerProvince}
          />
          <button className="ig-float-close" onClick={() => setPanel(null)}>✕</button>
        </div>
      )}

      {/* Province Modal */}
      {selectedProvince && gameState.started && (
        <ProvinceModal
          province={PROVINCES[selectedProvince]}
          playerState={gameState.playerProvince?.[selectedProvince]}
          botState={gameState.botConquest?.[selectedProvince]}
          biPoints={gameState.biPoints}
          unlockedAbilities={gameState.unlockedAbilities || []}
          onConquestUpdate={(pct, bi, conqueredChars) => handleConquestUpdate(selectedProvince, pct, bi, conqueredChars)}
          onUpgradeBuilding={(type) => handleUpgradeBuilding(selectedProvince, type)}
          onCollectResources={() => handleCollectResources(selectedProvince)}
          onClose={() => setSelectedProvince(null)}
        />
      )}
    </div>
  );
}
