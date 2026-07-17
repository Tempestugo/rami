import { ABILITIES } from '../../data/imperioData.js';

export default function AbilityTree({ unlocked, biPoints, onUnlock }) {
  return (
    <div className="ability-tree">
      <div className="side-panel-title">
        <span className="side-panel-hanzi">術</span>
        Habilidades
      </div>
      <div className="bi-bar">
        <span className="bi-hanzi">筆</span>
        <span className="bi-count">{biPoints}</span>
        <span className="bi-label">points</span>
      </div>
      <div className="ability-list">
        {ABILITIES.map(ability => {
          const isUnlocked = unlocked.includes(ability.id);
          const canAfford = biPoints >= ability.cost;
          const reqsMet = ability.requires.every(r => unlocked.includes(r));
          const canUnlock = !isUnlocked && canAfford && reqsMet;

          return (
            <div key={ability.id} className={`ability-card ${isUnlocked ? 'unlocked' : ''} ${!reqsMet ? 'locked' : ''}`}>
              <div className="ability-hanzi">{ability.hanzi}</div>
              <div className="ability-info">
                <div className="ability-name">{ability.name}</div>
                <div className="ability-name-cn">{ability.nameCN}</div>
                <div className="ability-desc">{ability.description}</div>
                {!reqsMet && ability.requires.length > 0 && (
                  <div className="ability-requires">
                    Requer: {ability.requires.map(r => ABILITIES.find(a => a.id === r)?.name).join(', ')}
                  </div>
                )}
              </div>
              <div className="ability-action">
                {isUnlocked
                  ? <span className="ability-done">完</span>
                  : <button
                      className={`ability-btn ${canUnlock ? 'can' : 'cant'}`}
                      onClick={() => canUnlock && onUnlock(ability.id, ability.cost)}
                      disabled={!canUnlock}
                    >
                      <span className="ability-cost-val">筆{ability.cost}</span>
                    </button>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
