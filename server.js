const express = require('express');
const path = require('path');
const app = express();

// Importe os seus handlers que hoje estão na pasta /api
// Você vai precisar adaptar os imports para 'require' se não usar ESM
const graphIndex = require('./api/graph/index');
const characterDetail = require('./api/graph/character/[id]');

app.use(express.json());

// Mapeie as rotas manualmente para bater com o que o frontend espera
app.get('/api/graph', (req, res) => graphIndex.default(req, res));
app.get('/api/graph/character/:id', (req, res) => characterDetail.default(req, res));

// Servir os arquivos estáticos do React (a pasta dist que o Vite gera)
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));