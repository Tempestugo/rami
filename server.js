import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// IMPORTANTE: Adicione o .js no final de todos os caminhos
import graphHandler from './api/graph/index.js';
import charHandler from './api/graph/character/[id].js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Middleware para log (ajuda a ver se a requisição chegou)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Rotas da API
app.get('/api/graph', async (req, res) => {
  try {
    await graphHandler(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/graph/character/:id', async (req, res) => {
  try {
    // A função original espera o ID em req.query
    req.query.id = req.params.id;
    await charHandler(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir os arquivos estáticos do Vite
// Garanta que a pasta 'dist' existe na raiz após o build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback: Qualquer rota que não seja API volta para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// A Hostinger define a porta dinamicamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});