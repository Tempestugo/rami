/**
 * src/features/components/BotPanel.jsx
 * Painel de status dos bots rivais (Impérios históricos)
 */
import { BOTS, PROVINCES } from '../../data/imperioData.js';

export default function BotPanel({ botConquest, playerProvince }) {
  const botEntries = Object.values(BOTS);

  return (
    <div className="bot-panel">
      <div className="bot-panel-title">⚔️ Impérios Rivais</div>

      <div className="bot-list">
        {botEntries.map(bot => {
          // Quantas províncias o bot controla
          const botProvinces = Object.entries(botConquest || {})
            .filter(([, s]) => s.botId === bot.id)
            .map(([provId, s]) => ({ provId, ...s }));

          const conquered = botProvinces.filter(p => p.pct >= 100);
          const inProgress = botProvinces.filter(p => p.pct < 100);

          // Províncias ameaçadas do player
          const threats = inProgress.filter(p => {
            const playerProv = playerProvince?.[p.provId];
            return playerProv !== undefined; // bot na mesma que o player
          });

          return (
            <div key={bot.id} className="bot-card" style={{ borderColor: bot.color + '60' }}>
              <div className="bot-header">
                <span className="bot-emoji">{bot.emoji}</span>
                <div className="bot-info">
                  <div className="bot-name" style={{ color: bot.color }}>{bot.fullName}</div>
                  <div className="bot-personality">{bot.personality}</div>
                </div>
                <div className="bot-score">
                  <span className="bot-conquered">{conquered.length}</span>
                  <span className="bot-score-label">provs.</span>
                </div>
              </div>

              <div className="bot-desc">{bot.description}</div>

              {/* Províncias em progresso */}
              {inProgress.length > 0 && (
                <div className="bot-provinces">
                  {inProgress.map(p => (
                    <div key={p.provId} className="bot-province-row">
                      <span className="bot-prov-name">
                        {PROVINCES[p.provId]?.nameCN || p.provId}
                      </span>
                      <div className="bot-prov-bar-bg">
                        <div
                          className="bot-prov-bar-fill"
                          style={{ width: `${p.pct}%`, background: bot.color }}
                        />
                      </div>
                      <span className="bot-prov-pct">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Alertas de ameaça */}
              {threats.length > 0 && (
                <div className="bot-threat-alert">
                  ⚠️ Disputando {threats.length} suas províncias!
                </div>
              )}

              {/* Províncias conquistadas */}
              {conquered.length > 0 && (
                <div className="bot-conquered-list">
                  {conquered.map(p => (
                    <span key={p.provId} className="conquered-chip" style={{ background: bot.color + '40' }}>
                      {PROVINCES[p.provId]?.nameCN || p.provId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
