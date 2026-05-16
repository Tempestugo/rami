import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Importa as funções da sua API (com a extensão .js obrigatória)
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 1. Configurar as rotas da API
app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
    req.query = req.query || {};
    req.query.id = req.params.id; 
    charHandler(req, res);
});

// 2. Servir o site React (Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Qualquer outra rota devolve o site (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Ligar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor do Lumi a correr na porta ${PORT}`);
});