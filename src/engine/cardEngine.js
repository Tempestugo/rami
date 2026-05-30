/**
 * src/engine/cardEngine.js
 *
 * Lógica pura do sistema de cartas — sem dependência de React ou DOM.
 * Importar onde precisar (GameLoop, BattleManager, etc).
 */

// ─── Tabelas de escala ────────────────────────────────────────────────────────

export const LEVEL_SCALE = {
  1: { damageMulti: 1.0,  ricochetTargets: 0, aura: false, secondaryEffect: false },
  2: { damageMulti: 1.1,  ricochetTargets: 0, aura: true,  secondaryEffect: false },
  3: { damageMulti: 1.1,  ricochetTargets: 1, aura: true,  secondaryEffect: false },
  4: { damageMulti: 1.2,  ricochetTargets: 2, aura: true,  secondaryEffect: true  },
  5: { damageMulti: 1.4,  ricochetTargets: Infinity, aura: true, secondaryEffect: true },
};

export const FAMILY_EFFECTS = {
  '水': {
    name: 'Slow',
    // Aplica lentidão a todos os inimigos no raio da aura
    apply: (targets, _caster) => targets.map(t => ({ ...t, speedMulti: (t.speedMulti ?? 1) * 0.6 })),
  },
  '火': {
    name: 'Burn',
    // Dano em área: todos os inimigos num raio recebem 40% do dano base
    apply: (targets, caster) => targets.map(t => ({
      ...t, hp: t.hp - Math.floor(caster.baseDamage * 0.4),
    })),
  },
  '木': {
    name: 'Shield',
    // Adiciona escudo ao player
    apply: (targets, _caster, player) => ({ ...player, shield: (player.shield ?? 0) + 15 }),
  },
  '金': {
    name: 'Ricochet',
    // Redirecionado para a lógica de ricochete em resolveAttack()
    apply: () => null,
  },
  '土': {
    name: 'Stun',
    // Paralisa alvo por N frames
    apply: (targets, _caster) => targets.map(t => ({ ...t, stunFrames: 90 })),
  },
  '人': {
    name: 'Buff',
    // Bônus passivo de dano ao deck inteiro
    apply: (_targets, _caster, player) => ({ ...player, damageBonus: (player.damageBonus ?? 0) + 0.15 }),
  },
  '口': {
    name: 'Push',
    // Empurra inimigos para longe do castelo
    apply: (targets, _caster) => targets.map(t => ({ ...t, x: t.x + 80 })),
  },
};

// ─── Cálculo de dano ──────────────────────────────────────────────────────────

/**
 * Calcula o dano total de uma carta, incluindo bônus de sinergia do deck.
 *
 * @param {object} card        — { char, family, level, baseDamage }
 * @param {object[]} deckCards — todas as cartas no deck ativo do jogador
 * @returns {number} dano final arredondado
 */
export function calcCardDamage(card, deckCards = []) {
  const scale = LEVEL_SCALE[card.level] ?? LEVEL_SCALE[1];

  // Sinergia: +5% por carta da mesma família no deck (máx +35%)
  const sameFamily = deckCards.filter(c => c.family === card.family && c.char !== card.char);
  const synergyBonus = Math.min(sameFamily.length * 0.05, 0.35);

  const total = card.baseDamage * scale.damageMulti * (1 + synergyBonus);
  return Math.round(total);
}

/**
 * Resolve um ataque completo: dano primário + ricochete + efeito de família.
 *
 * @param {object}   card        — carta usada
 * @param {object}   primaryTarget — inimigo alvo principal
 * @param {object[]} nearbyEnemies — inimigos vizinhos (ordenados por distância)
 * @param {object[]} deckCards   — deck completo para cálculo de sinergia
 * @param {object}   player      — estado do jogador (para efeitos de buff/shield)
 * @returns {{ hits: DamageEvent[], playerMutations: object }}
 */
export function resolveAttack(card, primaryTarget, nearbyEnemies = [], deckCards = [], player = {}) {
  const scale = LEVEL_SCALE[card.level] ?? LEVEL_SCALE[1];
  const damage = calcCardDamage(card, deckCards);
  const hits = [];

  // Dano no alvo primário
  hits.push({ targetId: primaryTarget.id, damage, type: 'primary', family: card.family });

  // Ricochete
  if (scale.ricochetTargets > 0) {
    const ricoTargets = scale.ricochetTargets === Infinity
      ? nearbyEnemies
      : nearbyEnemies.slice(0, scale.ricochetTargets);

    const ricoDamage = Math.round(damage * 0.6); // ricochete = 60% do dano
    ricoTargets.forEach(enemy => {
      hits.push({ targetId: enemy.id, damage: ricoDamage, type: 'ricochet', family: card.family });
    });
  }

  // Efeito secundário (lv 4+)
  let playerMutations = {};
  if (scale.secondaryEffect) {
    const effectFn = FAMILY_EFFECTS[card.family]?.apply;
    if (effectFn) {
      const result = effectFn(nearbyEnemies, card, player);
      if (result && !Array.isArray(result)) playerMutations = result;
    }
  }

  return { hits, playerMutations };
}

// ─── SRS: progressão da carta ─────────────────────────────────────────────────

/**
 * Calcula o novo nível SRS após um resultado de sessão.
 *
 * @param {number} currentLevel — 1 a 5
 * @param {'success'|'fail'} result
 * @returns {number} novo nível (clamped entre 1 e 5)
 */
export function updateSrsLevel(currentLevel, result) {
  if (result === 'success') return Math.min(currentLevel + 1, 5);
  if (result === 'fail')    return Math.max(currentLevel - 1, 1);
  return currentLevel;
}

/**
 * Determina a próxima data de revisão baseada no nível SRS.
 * Retorna um Date object.
 *
 * Intervalos (inspirados no SM-2):
 * Lv1 → 1 dia | Lv2 → 3 dias | Lv3 → 7 dias | Lv4 → 14 dias | Lv5 → 30 dias
 */
export function nextReviewDate(level) {
  const days = [0, 1, 3, 7, 14, 30][level] ?? 1;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// ─── Sinergia de deck ─────────────────────────────────────────────────────────

/**
 * Calcula os bônus passivos do deck completo.
 * Chamado uma vez ao montar o deck, antes da batalha.
 *
 * @param {object[]} deckCards — até 8 cartas
 * @returns {object} { synergyBonuses: { [family]: bonus }, totalDamageBonus: number }
 */
export function calcDeckSynergies(deckCards) {
  const counts = {};
  deckCards.forEach(c => { counts[c.family] = (counts[c.family] ?? 0) + 1; });

  const synergyBonuses = {};
  let totalDamageBonus = 0;

  Object.entries(counts).forEach(([family, count]) => {
    const bonus = Math.min(count * 0.05, 0.35);
    synergyBonuses[family] = bonus;
    totalDamageBonus += bonus;
  });

  // Bônus especial: 人 (Humano) no deck adiciona +15% passivo a TODAS as cartas
  if (counts['人']) {
    totalDamageBonus += 0.15;
  }

  return { synergyBonuses, totalDamageBonus: Math.min(totalDamageBonus, 1.0) };
}
