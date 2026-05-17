export default async function enemiesHandler(req, res) {
    const userLevel = parseInt(req.query.level) || 1;

    // Mock inicial de horda procedimental. Futuramente pode vir do BD baseado nos pontos fracos do usuário.
    const baseEnemies = [
        { hanzi: '火', baseHp: 50, baseAtk: 5 },
        { hanzi: '病', baseHp: 80, baseAtk: 8 },
    ];

    const enemies = baseEnemies.map((e, index) => ({
        id: `enemy-${Date.now()}-${index}`,
        hanzi: e.hanzi,
        hp: e.baseHp * userLevel,
        atk: e.baseAtk * userLevel
    }));

    return res.status(200).json({ success: true, data: enemies });
}