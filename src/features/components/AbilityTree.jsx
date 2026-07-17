/**
 * src/features/components/AbilityTree.jsx
 * Árvore de habilidades do Império Hanzi
 */
import { ABILITIES } from '../../data/imperioData.js';

export default function AbilityTree({ unlocked, biPoints, onUnlock }) {
  return (
    <div className="ability-tree">
      <div className="ability-tree-title">⚡ Habilidades</div>
      <div className="ability-bi-display">
        <span className="bi-icon">筆</span>
        <span className="bi-count">{biPoints}</span>
        <span className="bi-label">points disponíveis</span>
      </div>

      <div className="ability-list">
        {ABILITIES.map(ability => {
          const isUnlocked = unlocked.includes(ability.id);
          const canAfford = biPoints >= ability.cost;
          const reqsMet = ability.requires.every(r => unlocked.includes(r));
          const canUnlock = !isUnlocked && canAfford && reqsMet;

          return (
            <div
              key={ability.id}
              className={`ability-card ${isUnlocked ? 'unlocked' : ''} ${!reqsMet ? 'locked' : ''}`}
            >
              <div className="ability-icon">{ability.icon}</div>
              <div className="ability-info">
                <div className="ability-name">{ability.name}</div>
                <div className="ability-name-cn">{ability.nameCN}</div>
                <div className="ability-desc">{ability.description}</div>
                {ability.requires.length > 0 && !reqsMet && (
                  <div className="ability-requires">
                    Requer: {ability.requires.map(r => ABILITIES.find(a => a.id === r)?.name).join(', ')}
                  </div>
                )}
              </div>
              <div className="ability-right">
                {isUnlocked ? (
                  <span className="ability-done">✅</span>
                ) : (
                  <button
                    className={`ability-unlock-btn ${canUnlock ? 'can' : 'cant'}`}
                    onClick={() => canUnlock && onUnlock(ability.id, ability.cost)}
                    disabled={!canUnlock}
                  >
                    <span className="ability-cost">筆 {ability.cost}</span>
                    <span className="ability-btn-label">{reqsMet ? 'Desbloquear' : '🔒'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
