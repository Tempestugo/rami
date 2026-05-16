const express = require('express');
const path = require('path');
const app = express();

// Importar os teus ficheiros da pasta API (adaptando para CommonJS se necessário)
const graphRoutes = require('./api/graph/index');
const characterRoutes = require('./api/graph/character/[id]');

app.use(express.json());

// Configurar as rotas da API manualmente
app.get('/api/graph', (req, res) => graphRoutes(req, res));
app.get('/api/graph/character/:id', (req, res) => characterRoutes(req, res));

// Servir os ficheiros estáticos que o VITE gerou (pasta dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Qualquer outra rota redireciona para o index.html do Vite
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Lumi Server a correr na porta ${PORT}`);
});