import { BOTS, PROVINCES } from '../../data/imperioData.js';

export default function BotPanel({ botConquest, playerProvince }) {
  return (
    <div className="bot-panel">
      <div className="side-panel-title">
        <span className="side-panel-hanzi">敵</span>
        Impérios Rivais
      </div>
      <div className="bot-list">
        {Object.values(BOTS).map(bot => {
          const botProvs = Object.entries(botConquest || {})
            .filter(([, s]) => s.botId === bot.id)
            .map(([provId, s]) => ({ provId, ...s }));
          const conquered = botProvs.filter(p => p.pct >= 100);
          const inProgress = botProvs.filter(p => p.pct < 100);
          const threats = inProgress.filter(p => playerProvince?.[p.provId] !== undefined);

          return (
            <div key={bot.id} className="bot-card" style={{ '--bot-color': bot.color }}>
              <div className="bot-header">
                <div className="bot-hanzi-badge" style={{ color: bot.color, borderColor: bot.color + '60' }}>
                  {bot.hanzi}
                </div>
                <div className="bot-info">
                  <div className="bot-name" style={{ color: bot.color }}>{bot.fullName}</div>
                  <div className="bot-personality">{bot.personality}</div>
                </div>
                <div className="bot-score">
                  <span className="bot-count">{conquered.length}</span>
                  <span className="bot-count-label">prov.</span>
                </div>
              </div>
              <div className="bot-desc">{bot.description}</div>
              {inProgress.map(p => (
                <div key={p.provId} className="bot-prov-row">
                  <span className="bot-prov-cn">{PROVINCES[p.provId]?.nameCN || p.provId}</span>
                  <div className="bot-bar-bg">
                    <div className="bot-bar-fill" style={{ width: `${p.pct}%`, background: bot.color }} />
                  </div>
                  <span className="bot-pct">{p.pct}%</span>
                </div>
              ))}
              {threats.length > 0 && (
                <div className="bot-threat">危 Disputando {threats.length} sua(s) província(s)</div>
              )}
              {conquered.length > 0 && (
                <div className="bot-conquered-row">
                  {conquered.map(p => (
                    <span key={p.provId} className="conquered-tag" style={{ background: bot.color + '22', color: bot.color }}>
                      {PROVINCES[p.provId]?.nameCN}
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
