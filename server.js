import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Imports dos Handlers (Caminhos corrigidos conforme o seu sistema de arquivos)
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';
import phraseHandler from './api/phrases/build.js'; // Corrigido: plural 'phrases' e arquivo 'build.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// Rota de Formar Frase (Resolve o erro 404 do Axios)
app.get('/api/phrase', phraseHandler);

// --- Servir o Frontend ---

// Servir os arquivos estáticos do Vite (pasta dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Redirecionar qualquer outra rota para o index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Inicialização ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lumi Server a rodar na porta ${PORT}`);
});