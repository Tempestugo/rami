import pool from '../../db.js';

export default async function troopsHandler(req, res) {
    try {
        // TODO: Substituir por Auth real posteriormente
        const userId = 1;

        const [rows] = await pool.query(`
            SELECT c.hanzi, c.hsk_level, c.meaning, ut.srs_status 
            FROM user_troops ut
            JOIN characters c ON ut.character_id = c.id
            WHERE ut.user_id = ?
        `, [userId]);

        const troops = rows.map(troop => {
            let hp = (troop.hsk_level || 1) * 100;
            let atk = (troop.hsk_level || 1) * 15;
            
            // Mecânica do SRS: Personagens enferrujados perdem status base
            if (troop.srs_status === 'rusty') {
                hp = Math.floor(hp * 0.7);
                atk = Math.floor(atk * 0.7);
            }

            return { ...troop, hp, atk };
        });

        return res.status(200).json({ success: true, data: troops });
    } catch (error) {
        console.error('Erro ao recrutar tropas:', error);
        return res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
}