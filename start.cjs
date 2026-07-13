import('./server.js').catch(err => {
  console.error('Erro fatal ao importar server.js:', err);
  process.exit(1);
});