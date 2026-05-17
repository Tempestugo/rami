import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Imports dos Handlers
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';
import phraseHandler from './api/phrases/build.js'; 
import gameLogicHandler from './api/game/logic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// IMPORTANTE: Para ler o corpo (body) do POST enviado pelo Axios
app.use(express.json());

// --- Rotas da API ---

// Rota de Grafos
app.get('/api/graph', graphHandler);

// Rota de Caracteres Individuais
app.get('/api/graph/character/:id', (req, res) => {
    req.query = req.query || {};
    req.query.id = req.params.id; 
    charHandler(req, res);
});

/** * CORREÇÃO AQUI: 
 * O frontend chama POST /api/phrases/build 
 */
app.post('/api/phrases/build', phraseHandler);

// Opcional: manter essa rota se você usar em outros lugares
app.get('/api/phrase', phraseHandler);

// --- Rotas de Batalha ---
app.post('/api/game/attack', gameLogicHandler);

// --- Servir o Frontend ---

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Inicialização ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lumi Server a rodar na porta ${PORT}`);
});