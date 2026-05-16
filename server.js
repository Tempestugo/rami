import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Importa os handlers da API
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 1. Rotas da API
app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
    req.query.id = req.params.id; 
    charHandler(req, res);
});

// 2. Servir o Frontend gerado pelo Vite (Pasta dist)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Redirecionar qualquer outra URL para o React (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// A Hostinger injeta a porta correta automaticamente através do process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lumi Server rodando na porta ${PORT}`);
});