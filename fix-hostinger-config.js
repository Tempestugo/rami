import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, '.builds', 'config');
const targetFile = path.join(targetDir, 'package.json');

try {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(targetFile, JSON.stringify({ type: 'commonjs' }, null, 2), 'utf8');
  console.log('[Fix] Criado .builds/config/package.json com type: commonjs');
} catch (err) {
  console.error('[Fix] Erro ao criar configuração do Hostinger:', err.message);
}
