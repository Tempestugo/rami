import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import graphHandler  from './api/graph/index.js';
import charHandler   from './api/graph/character/[id].js';
import phraseHandler from './api/phrases/build.js';
import attackHandler from './attack.js';          // BUG FIX: era './api/game/logic.js' (não existe)
import siegeHandler  from './api/game/siege.js';  // NOVO
import { lessonHandler, listSentences } from './api/game/lessonGenerator.js';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json());

app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
  req.query    = req.query || {};
  req.query.id = req.params.id;
  charHandler(req, res);
});
app.post('/api/phrases/build', phraseHandler);
app.get('/api/phrase', phraseHandler);

app.post('/api/game/attack', attackHandler);
app.get('/api/game/siege',   siegeHandler);

// --- Sistema de Lições e Progressão ---
app.get('/api/lesson/:id', lessonHandler);

app.get('/api/lessons', async (req, res) => {
  try {
    const data = await listSentences();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress (
        user_id INT,
        lesson_id VARCHAR(60),
        sentence_id VARCHAR(30),
        xp INT,
        completed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const { lesson_id, sentence_id, xp, user_id = 1 } = req.body;
    await pool.query(
      `INSERT INTO progress (user_id, lesson_id, sentence_id, xp) VALUES (?, ?, ?, ?)`,
      [user_id, lesson_id, sentence_id, xp]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sistema de Cartas e Deck ---
app.get('/api/cards/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT uc.char, uc.srs_level, hd.pinyin, hd.meaning_pt, hd.family, hd.base_damage 
       FROM user_cards uc 
       JOIN hanzi_dict hd ON uc.char = hd.char 
       WHERE uc.user_id = ?`,
      [req.params.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deck/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ud.char, ud.slot, hd.pinyin, hd.meaning_pt, hd.family, hd.base_damage 
       FROM user_deck ud 
       JOIN hanzi_dict hd ON ud.char = hd.char 
       WHERE ud.user_id = ?`,
      [req.params.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deck', async (req, res) => {
  try {
    const { user_id, slots } = req.body;
    for (const s of slots) {
      await pool.query(
        `INSERT INTO user_deck (user_id, char, slot) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE char = VALUES(char)`,
        [user_id, s.char, s.slot]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lumi Server na porta ${PORT}`));
