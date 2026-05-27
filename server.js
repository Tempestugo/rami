import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import graphHandler  from './api/graph/index.js';
import charHandler   from './api/graph/character/[id].js';
import phraseHandler from './api/phrases/build.js';
import attackHandler from './attack.js';          // BUG FIX: era './api/game/logic.js' (não existe)
import siegeHandler  from './api/game/siege.js';  // NOVO

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

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lumi Server na porta ${PORT}`));
