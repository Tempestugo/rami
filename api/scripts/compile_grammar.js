import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auxiliar para download
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        console.log(`Não encontrado (404): ${url}`);
        resolve(false);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Status HTTP ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Baixado com sucesso em: ${dest}`);
        resolve(true);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Parser de linha CSV robusto
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // pula aspas escapadas
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Limpa delimitadores da estrutura
function cleanStructure(struct) {
  if (!struct) return '';
  return struct.replace(/^::\s*/, '').replace(/\s*::$/, '').trim();
}

async function run() {
  const dataDir = path.resolve(__dirname, '../_data');
  const grammarDataFile = path.join(dataDir, 'grammarData.js');

  // 1. Carrega base existente para não perder HSK 1 e 2 curados com explicações completas
  let existingPoints = [];
  if (fs.existsSync(grammarDataFile)) {
    console.log('Lendo base de dados grammarData.js existente...');
    const fileContent = fs.readFileSync(grammarDataFile, 'utf8');
    try {
      const jsonStart = fileContent.indexOf('[');
      const jsonEnd = fileContent.lastIndexOf(']') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonText = fileContent.substring(jsonStart, jsonEnd);
        existingPoints = JSON.parse(jsonText);
        console.log(`Carregados ${existingPoints.length} pontos de gramática existentes.`);
      }
    } catch (e) {
      console.warn('Não foi possível fazer o parse de grammarData.js como JSON. Começando do zero.', e.message);
    }
  }

  // Mapeia por URL
  const existingMap = new Map(existingPoints.map(p => [p.url, p]));

  // 2. Garante downloads de HSK 3, 4, 5 e 6 da fonte oficial do Anki-Chinese-Grammar
  const levelsToImport = [3, 4, 5, 6];
  for (const lvl of levelsToImport) {
    const csvPath = path.join(dataDir, `grammar_hsk${lvl}.csv`);
    const githubUrl = `https://raw.githubusercontent.com/krmanik/Chinese-Grammar/master/CSV%20Files%20HSK1%20-%20HSK6/hsk${lvl}.csv`;
    
    // Sempre baixa o arquivo para garantir integridade e formato
    console.log(`Baixando HSK ${lvl} CSV do GitHub...`);
    await downloadFile(githubUrl, csvPath);
  }

  // 3. Processa cada arquivo CSV de HSK 3, 4, 5, e 6 e adiciona no mapa
  for (const lvl of levelsToImport) {
    const csvPath = path.join(dataDir, `grammar_hsk${lvl}.csv`);
    if (!fs.existsSync(csvPath)) {
      console.warn(`Arquivo HSK ${lvl} não encontrado. Pulando.`);
      continue;
    }

    console.log(`Processando HSK ${lvl} CSV...`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split(/\r?\n/);

    // Agrupamento por URL
    const groups = new Map();

    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = parseCSVLine(line);
      
      // Valida se possui as colunas necessárias (Col 7: Title, Col 8: URL)
      if (cols.length < 9) continue;

      const title = cols[7].trim();
      const url = cols[8].trim();
      if (!title || !url) continue;

      const chinese = cols[1].trim();
      const pinyin = cols[2].trim();
      const translation = cols[3].trim();
      const structure = cleanStructure(cols[5]);

      if (!groups.has(url)) {
        groups.set(url, {
          hsk: lvl,
          title: title,
          structure: structure || 'N/A',
          url: url,
          examples: []
        });
      }

      if (chinese) {
        groups.get(url).examples.push({
          chinese,
          pinyin,
          translation
        });
      }
    }

    // Mescla no mapa principal
    let addedCount = 0;
    for (const [url, item] of groups) {
      if (!existingMap.has(url)) {
        // Limita a 5 exemplos por ponto para não explodir tamanho
        item.examples = item.examples.slice(0, 5);
        item.explanation = `Use este ponto de gramática para praticar a estrutura: ${item.structure}`;
        
        existingMap.set(url, item);
        addedCount++;
      }
    }
    console.log(`Adicionados ${addedCount} novos pontos de gramática para HSK ${lvl}.`);
  }

  // 4. Salva a nova base combinada ordenada por nível HSK
  const finalPoints = Array.from(existingMap.values());
  finalPoints.sort((a, b) => a.hsk - b.hsk);

  const newFileContent = `// Grammar data sourced from Chinese Grammar Wiki © AllSet Learning (CC BY-NC-SA 3.0)
// https://resources.allsetlearning.com/chinese/grammar/
export const grammarData = ${JSON.stringify(finalPoints, null, 2)};
`;

  fs.writeFileSync(grammarDataFile, newFileContent, 'utf8');
  console.log(`Concluído! Gravação realizada com sucesso em: ${grammarDataFile}`);
  console.log(`Total final de pontos de gramática no banco: ${finalPoints.length}`);
}

run().catch(console.error);
