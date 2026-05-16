import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Importe seus handlers da pasta API
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 1. Rotas da API (Mapeando o que era Vercel para Express)
app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
    req.query.id = req.params.id; // Ajusta o ID para o seu handler
    charHandler(req, res);
});

// 2. Servir Arquivos Estáticos (Onde o Vite coloca o build)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Suporte ao React Router (Qualquer rota cai no index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Lumi rodando na porta ${PORT}`);
});