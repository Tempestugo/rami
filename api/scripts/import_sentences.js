import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../_data/phraseData.js');

// Importa as frases curadas originais
import { phraseData as originalPhrases } from '../_data/phraseData.js';

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Falha no download (Status ${res.statusCode})`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Filtra apenas caracteres chineses válidos
const chineseCharRegex = /[\u4e00-\u9fa5]/;
function extractChineseChars(str) {
  return [...str].filter(char => chineseCharRegex.test(char));
}

// Limpa pontuações repetidas ou espaços indesejados no pinyin/tradução
function cleanString(str) {
  if (!str) return '';
  return str.replace(/^\uFEFF/, '').trim(); // Remove BOM byte se houver
}

async function run() {
  const importedPhrases = [...originalPhrases];
  const existingPhrases = new Set(originalPhrases.map(p => p.phrase));

  console.log(`🚀 Iniciando importação da biblioteca de frases HSK...`);

  for (let level = 1; level <= 6; level++) {
    const url = `https://raw.githubusercontent.com/krmanik/Chinese-Grammar/master/CSV%20Files%20HSK1%20-%20HSK6/hsk${level}.csv`;
    console.log(`📥 Baixando frases HSK ${level} de: ${url}...`);

    try {
      const csvData = await downloadFile(url);
      const lines = csvData.split('\n');
      let count = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cols = parseCsvLine(line);
        // Esperamos pelo menos 4 colunas (Chinese, Simplified, Pinyin, Translation)
        if (cols.length < 4) continue;

        // Limpeza de campos
        const simplified = cleanString(cols[1]);
        const pinyin = cleanString(cols[2]);
        const translation = cleanString(cols[3]);

        if (!simplified || !pinyin || !translation) continue;

        // Evita duplicatas
        if (existingPhrases.has(simplified)) continue;

        const chars = extractChineseChars(simplified);
        if (chars.length === 0) continue;

        importedPhrases.push({
          phrase: simplified,
          pinyin: pinyin,
          translation: translation,
          hsk: level,
          chars: chars
        });
        existingPhrases.add(simplified);
        count++;
      }

      console.log(`✅ Adicionadas ${count} frases para o nível HSK ${level}`);
    } catch (err) {
      console.error(`❌ Erro ao processar frases HSK ${level}:`, err.message);
    }
  }

  console.log(`📦 Biblioteca de frases unificada: ${importedPhrases.length} frases total!`);

  // Gera código fonte do arquivo JS
  const fileContent = `/**
 * phraseData.js — Curated phrase bank for the Algorithmic Phrase Builder.
 * Atualizado automaticamente via script de importação de frases.
 */

export const phraseData = ${JSON.stringify(importedPhrases, null, 2)};
`;

  fs.writeFileSync(TARGET_FILE, fileContent, 'utf-8');
  console.log(`🎉 Gravado com sucesso em: ${TARGET_FILE}`);
}

run();
