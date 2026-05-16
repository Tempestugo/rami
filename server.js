import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Truque para usar require() num projeto type: "module"
const require = createRequire(import.meta.url);

// Importa a sua API em modo de compatibilidade
const graphHandler = require('./api/graph/index.js');
const charHandler = require('./api/graph/character/[id].js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 1. Liga as rotas da API
app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
    req.query = req.query || {};
    req.query.id = req.params.id; 
    charHandler(req, res);
});

// 2. Serve o site React gerado pelo Vite (Pasta dist)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Qualquer outra rota (F5 na página) redireciona para o React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// A Hostinger define a porta dinamicamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lumi Server a rodar na porta ${PORT}`);
});