const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. AJUSTE O CAMINHO DAS ROTAS AQUI
// Se você moveu a pasta 'routes' para dentro de um 'src', por exemplo, 
// mude para: path.join(__dirname, 'src', 'routes', 'graph')
const graphRoutes = require(path.join(__dirname, 'routes', 'graph'));
const phraseRoutes = require(path.join(__dirname, 'routes', 'phrases'));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Log para debug de todas as requisições
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

// API Routes
app.use('/api/graph', graphRoutes);
app.use('/api/phrases', phraseRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found: ' + req.url });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  // 2. AJUSTE O CAMINHO DA PASTA 'DIST' AQUI
  // Este caminho deve refletir exatamente o que está no 'outDir' do seu vite.config.js.
  // Se o frontend agora faz o build dentro dele mesmo, altere para '../frontend/dist'
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  res.status(500).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
  console.log(`🀄 Rami server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
});
