import fs from 'fs';

// Fix automático do preload-timestamp para a Hostinger
try {
  const d = '/home/u556180082/domains/ramimandirim.com.br/public_html/.builds/config';
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(d + '/preload-timestamp.cjs', '// preload');
  fs.writeFileSync(d + '/preload-timestamp.js', '// preload');
  const p = d + '/package.json';
  try {
    let pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
    delete pkg.type;
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
  } catch(e) {}
} catch(e) {}

// Importa e executa o servidor real
import('./server_real.js').catch(err => {
  console.error('Erro fatal ao importar server_real.js:', err);
  process.exit(1);
});
