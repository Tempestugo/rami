import pool from '../../db.js';

export default async function handler(req, res) {
    const { attackerHanzi, targetHanzi } = req.body;

    try {
        // Verifica se o atacante é um componente direto do inimigo (Sinergia)
        const [rows] = await pool.query(
            `SELECT * FROM character_components 
             WHERE parent_id = (SELECT id FROM characters WHERE hanzi = ?) 
             AND component_id = (SELECT id FROM characters WHERE hanzi = ?)`,
            [targetHanzi, attackerHanzi]
        );

        const isEffective = rows.length > 0;
        const damage = isEffective ? 30 : 10; // 3x mais dano se for radical/parente

        return res.status(200).json({ 
            success: true, 
            damage, 
            isEffective,
            message: isEffective ? 'Sinergia de Radical!' : 'Ataque Normal'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}