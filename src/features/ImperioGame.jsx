/**
 * src/features/ImperioGame.jsx
 * Página principal do jogo "Império Hanzi" — inspirado em Plague Inc
 */
import { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import ChinaMap from './components/ChinaMap.jsx';
import ProvinceModal from './components/ProvinceModal.jsx';
import AbilityTree from './components/AbilityTree.jsx';
import BotPanel from './components/BotPanel.jsx';
import { PROVINCES, BOTS, ADJACENCY } from '../data/imperioData.js';

const STORAGE_KEY = 'rami_imperio_state';

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

function getInitialGameState() {
  // Bots começam nas suas províncias com 20%
  const botConquest = {};
  Object.values(BOTS).forEach(bot => {
    botConquest[bot.startProvince] = {
      botId: bot.id,
      pct: 20,
      lastTick: Date.now(),
    };
  });

  return {
    started: false,
    playerProvince: null,       // objeto { [provinceId]: { pct, conquered } }
    botConquest,                // { [provinceId]: { botId, pct, lastTick } }
    biPoints: 0,                // 筆 points acumulados
    unlockedAbilities: [],
    startedAt: null,
    lastActiveAt: Date.now(),
  };
}

function tickBots(state) {
  const now = Date.now();
  const updated = { ...state, botConquest: { ...state.botConquest } };

  Object.entries(state.botConquest).forEach(([provId, botState]) => {
    const bot = BOTS[botState.botId];
    if (!bot) return;
    const hoursElapsed = (now - botState.lastTick) / (1000 * 60 * 60);
    const gain = Math.floor(hoursElapsed * bot.advanceRate);
    if (gain > 0) {
      updated.botConquest[provId] = {
        ...botState,
        pct: Math.min(100, botState.pct + gain),
        lastTick: now,
      };
    }
  });

  return updated;
}

export default function ImperioGame() {
  const user = useStore(state => state.user);
  const [gameState, setGameState] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [showAbilities, setShowAbilities] = useState(false);
  const [showBots, setShowBots] = useState(false);
  const [notification, setNotification] = useState(null);

  // Carrega estado salvo
  useEffect(() => {
    if (!user?.id) return;
    const saved = loadState(user.id);
    if (saved) {
      setGameState(tickBots(saved));
    } else {
      setGameState(getInitialGameState());
    }
  }, [user?.id]);

  // Salva estado quando muda
  useEffect(() => {
    if (gameState && user?.id) {
      saveState(user.id, gameState);
    }
  }, [gameState, user?.id]);

  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // Jogador escolhe sua primeira província
  const handleChooseStart = useCallback((provId) => {
    const prov = PROVINCES[provId];
    if (!prov) return;

    // Verifica se bot já ocupou
    const botHere = gameState.botConquest[provId];
    if (botHere?.pct >= 100) {
      notify(`${BOTS[botHere.botId]?.fullName} já conquistou ${prov.nameCN}!`, 'error');
      return;
    }

    setGameState(prev => {
      const newPlayer = { [provId]: { pct: 0, conquered: false } };
      // Desbloquear adjacentes
      const adj = ADJACENCY[provId] || [];
      adj.forEach(adjId => {
        if (!newPlayer[adjId]) newPlayer[adjId] = { pct: 0, conquered: false, available: true };
      });

      return {
        ...prev,
        started: true,
        playerProvince: newPlayer,
        startedAt: Date.now(),
      };
    });

    setSelectedProvince(provId);
    notify(`Iniciando conquista de ${prov.nameCN} — ${prov.nameCN}!`, 'success');
  }, [gameState, notify]);

  // Atualiza progresso da conquista de uma província
  const handleConquestUpdate = useCallback((provId, newPct, biEarned) => {
    setGameState(prev => {
      const playerProv = { ...(prev.playerProvince || {}) };
      playerProv[provId] = { ...playerProv[provId], pct: newPct, conquered: newPct >= 100 };

      // Se conquistou 100%, desbloquear adjacentes
      if (newPct >= 100) {
        const adj = ADJACENCY[provId] || [];
        adj.forEach(adjId => {
          if (!playerProv[adjId]) {
            playerProv[adjId] = { pct: 0, conquered: false, available: true };
          }
        });
        notify(`🎉 ${PROVINCES[provId]?.nameCN} conquistada!`, 'success');
      }

      return {
        ...prev,
        playerProvince: playerProv,
        biPoints: (prev.biPoints || 0) + biEarned,
      };
    });
  }, [notify]);

  // Desbloquear habilidade
  const handleUnlockAbility = useCallback((abilityId, cost) => {
    setGameState(prev => {
      if ((prev.biPoints || 0) < cost) return prev;
      return {
        ...prev,
        biPoints: prev.biPoints - cost,
        unlockedAbilities: [...(prev.unlockedAbilities || []), abilityId],
      };
    });
  }, []);

  if (!gameState) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ink-950">
        <div className="text-ink-400 animate-pulse">Carregando Império...</div>
      </div>
    );
  }

  const totalProvinces = Object.keys(PROVINCES).length;
  const conqueredCount = Object.values(gameState.playerProvince || {})
    .filter(p => p.conquered).length;

  return (
    <div className="imperio-container flex flex-col h-full overflow-hidden bg-ink-950 relative">

      {/* Notificação flutuante */}
      {notification && (
        <div className={`imperio-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {/* Header do jogo */}
      <div className="imperio-header">
        <div className="imperio-stats">
          <div className="stat-item">
            <span className="stat-icon">🗺️</span>
            <span className="stat-value">{conqueredCount}</span>
            <span className="stat-label">/ {totalProvinces} províncias</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">筆</span>
            <span className="stat-value">{gameState.biPoints}</span>
            <span className="stat-label">points</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🛡️</span>
            <span className="stat-value">{gameState.unlockedAbilities?.length || 0}</span>
            <span className="stat-label">habilidades</span>
          </div>
        </div>

        <div className="imperio-actions">
          <button
            className={`imperio-btn ${showAbilities ? 'active' : ''}`}
            onClick={() => { setShowAbilities(v => !v); setShowBots(false); }}
          >
            ⚡ Habilidades
          </button>
          <button
            className={`imperio-btn ${showBots ? 'active' : ''}`}
            onClick={() => { setShowBots(v => !v); setShowAbilities(false); }}
          >
            ⚔️ Rivais
          </button>
        </div>
      </div>

      {/* Área principal */}
      <div className="imperio-main">

        {/* Painel lateral esquerdo (habilidades ou bots) */}
        {(showAbilities || showBots) && (
          <div className="imperio-side-panel">
            {showAbilities && (
              <AbilityTree
                unlocked={gameState.unlockedAbilities || []}
                biPoints={gameState.biPoints}
                onUnlock={handleUnlockAbility}
              />
            )}
            {showBots && (
              <BotPanel
                botConquest={gameState.botConquest}
                playerProvince={gameState.playerProvince}
              />
            )}
          </div>
        )}

        {/* Mapa central */}
        <div className="imperio-map-area">
          {!gameState.started ? (
            <div className="imperio-start-overlay">
              <div className="start-card">
                <div className="start-title">🗺️ Império Hanzi</div>
                <div className="start-subtitle">
                  Escolha sua província inicial para começar a conquista
                </div>
                <div className="start-hint">
                  Clique em qualquer província no mapa
                </div>
                <div className="start-bots-warning">
                  ⚠️ {Object.keys(BOTS).length} impérios rivais já estão avançando...
                </div>
              </div>
            </div>
          ) : null}

          <ChinaMap
            playerProvince={gameState.playerProvince || {}}
            botConquest={gameState.botConquest}
            onProvinceClick={(provId) => {
              if (!gameState.started) {
                handleChooseStart(provId);
              } else {
                setSelectedProvince(provId);
              }
            }}
            started={gameState.started}
          />
        </div>
      </div>

      {/* Modal de conquista */}
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
