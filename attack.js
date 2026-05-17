import { calculateSynergyDamage } from './logic.js';

export default async function attackHandler(req, res) {
    const { attackerId, targetId, baseDamage = 10 } = req.body || {};

    if (!attackerId || !targetId) {
        return res.status(400).json({ success: false, message: 'Faltam os Hanzi do atacante e do alvo.' });
    }

    try {
        const result = await calculateSynergyDamage(attackerId, targetId, baseDamage);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Erro no ataque tático:', error);
        return res.status(500).json({ success: false, message: 'Erro interno ao calcular dano.' });
    }
}