/**
 * src/features/ImperioGame.jsx - Página principal do Império Hanzi
 */
import { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import ChinaMap from './components/ChinaMap.jsx';
import ProvinceModal from './components/ProvinceModal.jsx';
import AbilityTree from './components/AbilityTree.jsx';
import BotPanel from './components/BotPanel.jsx';
import { PROVINCES, BOTS, ADJACENCY, STARTING_BI } from '../data/imperioData.js';

const STORAGE_KEY = 'rami_imperio_v2';

function loadState(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveState(userId, state) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(state));
  } catch (_) {}
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
  const user = useStore(state => state.user);
  const [gameState, setGameState] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [panel, setPanel] = useState(null); // 'abilities' | 'bots' | null
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const saved = loadState(user.id);
    setGameState(saved ? tickBots(saved) : getInitialState());
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
    if (botHere?.pct >= 100) {
      notify(`${BOTS[botHere.botId]?.fullName} já domina esta província!`, 'error');
      return;
    }
    setGameState(prev => {
      const pp = { [provId]: { pct: 0, conquered: false, available: true } };
      (ADJACENCY[provId] || []).forEach(adj => { if (!pp[adj]) pp[adj] = { pct: 0, conquered: false, available: true }; });
      return { ...prev, started: true, playerProvince: pp, startedAt: Date.now() };
    });
    setSelectedProvince(provId);
    notify(`${PROVINCES[provId].nameCN} — início da conquista!`, 'success');
  }, [gameState, notify]);

  const handleConquestUpdate = useCallback((provId, newPct, biEarned) => {
    setGameState(prev => {
      const pp = { ...(prev.playerProvince || {}) };
      pp[provId] = { ...pp[provId], pct: newPct, conquered: newPct >= 100 };
      if (newPct >= 100) {
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

  if (!gameState) {
    return <div className="flex-1 flex items-center justify-center bg-ink-950"><span className="text-ink-400 text-sm">載入中...</span></div>;
  }

  const conqueredCount = Object.values(gameState.playerProvince).filter(p => p.conquered).length;
  const totalProvinces = Object.keys(PROVINCES).length;

  return (
    <div className="imperio-container">
      {notification && (
        <div className={`imperio-notification ${notification.type}`}>{notification.msg}</div>
      )}

      {/* Header */}
      <div className="imperio-header">
        <div className="imperio-stats">
          <div className="stat-item">
            <span className="stat-hanzi">地</span>
            <span className="stat-value">{conqueredCount}</span>
            <span className="stat-sep">/</span>
            <span className="stat-total">{totalProvinces}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-hanzi">筆</span>
            <span className="stat-value">{gameState.biPoints}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-hanzi">術</span>
            <span className="stat-value">{gameState.unlockedAbilities?.length || 0}</span>
          </div>
        </div>

        <div className="imperio-nav">
          <button className={`imperio-nav-btn ${panel === 'abilities' ? 'active' : ''}`}
            onClick={() => setPanel(p => p === 'abilities' ? null : 'abilities')}>
            <span className="nav-hanzi">術</span>
            <span>Habilidades</span>
          </button>
          <button className={`imperio-nav-btn ${panel === 'bots' ? 'active' : ''}`}
            onClick={() => setPanel(p => p === 'bots' ? null : 'bots')}>
            <span className="nav-hanzi">敵</span>
            <span>Rivais</span>
          </button>
          <button className="imperio-nav-btn reset" onClick={handleReset}>
            <span className="nav-hanzi">新</span>
          </button>
        </div>
      </div>

      {/* Corpo */}
      <div className="imperio-main">
        {panel && (
          <div className="imperio-side-panel">
            {panel === 'abilities' && (
              <AbilityTree unlocked={gameState.unlockedAbilities || []} biPoints={gameState.biPoints} onUnlock={handleUnlockAbility} />
            )}
            {panel === 'bots' && (
              <BotPanel botConquest={gameState.botConquest} playerProvince={gameState.playerProvince} />
            )}
          </div>
        )}

        <div className="imperio-map-area">
          {!gameState.started && (
            <div className="imperio-start-overlay">
              <div className="start-card">
                <div className="start-hanzi">帝國漢字</div>
                <div className="start-title">Império Hanzi</div>
                <div className="start-subtitle">Escolha uma província para iniciar a conquista</div>
                <div className="start-hint">Clique em qualquer região no mapa</div>
                <div className="start-bi">
                  <span className="start-bi-icon">筆</span>
                  <span className="start-bi-val">{gameState.biPoints} points iniciais</span>
                </div>
                <div className="start-rivals">{Object.keys(BOTS).length} impérios rivais avançando...</div>
              </div>
            </div>
          )}
          <ChinaMap
            playerProvince={gameState.playerProvince}
            botConquest={gameState.botConquest}
            onProvinceClick={provId => {
              if (!gameState.started) handleChooseStart(provId);
              else setSelectedProvince(provId);
            }}
            started={gameState.started}
          />
        </div>
      </div>

      {selectedProvince && gameState.started && (
        <ProvinceModal
          province={PROVINCES[selectedProvince]}
          playerState={gameState.playerProvince?.[selectedProvince]}
          botState={gameState.botConquest?.[selectedProvince]}
          unlockedAbilities={gameState.unlockedAbilities || []}
          onConquestUpdate={(pct, bi) => handleConquestUpdate(selectedProvince, pct, bi)}
          onClose={() => setSelectedProvince(null)}
        />
      )}
    </div>
  );
}
