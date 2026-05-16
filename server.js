import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
// Importe seus handlers (garanta que o caminho termina em .js)
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// API Routes
app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
    req.query.id = req.params.id; 
    charHandler(req, res);
});

// Servir o Frontend
// IMPORTANTE: A Hostinger precisa que os arquivos fiquem na pasta onde o Node roda
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// A Hostinger injeta a porta automaticamente, se não houver, usamos 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});