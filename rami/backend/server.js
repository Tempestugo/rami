const express = require('express');
const cors = require('cors');
const path = require('path');

const graphRoutes = require('./routes/graph');
const phraseRoutes = require('./routes/phrases');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/graph', graphRoutes);
app.use('/api/phrases', phraseRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🀄 Rami server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
});
