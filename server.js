import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Imports nativos e diretos (agora vão funcionar perfeitamente)
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Rotas da API
app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
    req.query = req.query || {};
    req.query.id = req.params.id; 
    charHandler(req, res);
});

// Servir o Frontend gerado pelo Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Redirecionar tudo o resto para o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lumi Server a rodar na porta ${PORT}`);
});