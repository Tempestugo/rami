/**
 * GET /api/game/siege?hsk=1&count=5
 * Retorna horda de ofudas baseada em HSK — sem MySQL, usa hanziData local.
 */
import { hanziData } from '../_data/hanziData.js';

export default function siegeHandler(req, res) {
  const maxHsk = parseInt(req.query.hsk)   || 1;
  const count  = parseInt(req.query.count) || 5;

  const pool = hanziData
    .filter(h => h.hsk <= maxHsk)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  const enemies = pool.map((h, i) => ({
    id:      `ofuda_${Date.now()}_${i}`,
    char:    h.id,
    pinyin:  h.pinyin,
    meaning: h.meaning,
    hsk:     h.hsk,
    hp:      1,
    speed:   0.4 + (maxHsk * 0.1) + Math.random() * 0.3,
  }));

  return res.status(200).json({ success: true, data: enemies });
}