import pool from '../../db.js';

export async function calculateSynergyDamage(attackerHanzi, targetHanzi, baseDamage) {
    // Verifica se o atacante é componente direto do alvo através do mapeamento
    // Ex: Atacante = '人', Alvo = '他' (Ele é montado por '人' e '也')
    const [rows] = await pool.query(`
        SELECT 1 
        FROM character_components cc
        JOIN characters p ON cc.parent_id = p.id
        JOIN characters c ON cc.component_id = c.id
        WHERE p.hanzi = ? AND c.hanzi = ?
    `, [targetHanzi, attackerHanzi]);

    if (rows.length > 0) {
        // Ataque crítico sinérgico: o radical ataca sua forma derivada
        return { damage: baseDamage * 3.0, multiplier: 3.0, isSynergy: true };
    }

    return { damage: baseDamage, multiplier: 1.0, isSynergy: false };
}