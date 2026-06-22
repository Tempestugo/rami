import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../_data/hanziData.js');
const MAHE_SOURCE_URL = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const HSK_SOURCE_URL = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json';

// Importa os caracteres curados originais para não sobrescrevê-los
import { hanziData as originalHanzi } from '../_data/hanziData.js';

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    console.log(`🌐 Baixando de: ${url}...`);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Falha no download: Código ${res.statusCode} para ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Extrai o nível HSK (1 a 6) das tags de nível
function parseHskLevel(levelArray) {
  if (!levelArray || levelArray.length === 0) return 7;
  let minLevel = 7;
  for (const tag of levelArray) {
    // Procura padrões como 'old-1', 'new-2', 'newest-3'
    const match = tag.match(/(old|new|newest)-([1-9])/);
    if (match) {
      const val = parseInt(match[2]);
      if (val < minLevel) minLevel = val;
    }
  }
  return minLevel;
}

// Converte a string de decomposição CJK em um array de caracteres válidos
function parseComponents(decomp) {
  if (!decomp) return [];
  if (Array.isArray(decomp)) return decomp;
  if (typeof decomp !== 'string') return [];
  
  const descriptionChars = new Set([
    '⿰', '⿱', '⿲', '⿳', '⿴', '⿵', '⿶', '⿷', '⿸', '⿺', '⿻', '？', '?', ' '
  ]);
  
  return [...decomp].filter(char => !descriptionChars.has(char));
}

async function run() {
  try {
    // 1. Download do HSK complete.json e do MakeMeAHanzi dictionary.txt em paralelo
    const [hskRaw, makemeRaw] = await Promise.all([
      downloadFile(HSK_SOURCE_URL),
      downloadFile(MAHE_SOURCE_URL)
    ]);

    // 2. Construir mapa de HSK por caractere
    console.log('📊 Mapeando níveis HSK para caracteres...');
    const charHskMap = new Map();
    const hskWords = JSON.parse(hskRaw);

    for (const word of hskWords) {
      if (!word.simplified) continue;
      const hsk = parseHskLevel(word.level);
      
      // Para cada caractere da palavra HSK
      for (const char of word.simplified) {
        const currentHsk = charHskMap.get(char) || 7;
        if (hsk < currentHsk) {
          charHskMap.set(char, hsk);
        }
      }
    }

    // 3. Processar MakeMeAHanzi
    const lines = makemeRaw.split('\n');
    console.log(`📊 Processando ${lines.length} linhas do dataset MakeMeAHanzi...`);

    const originalMap = new Map(originalHanzi.map(h => [h.id, h]));
    const importedList = [...originalHanzi];

    let newCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        const char = item.character;

        // Apenas caracteres individuais válidos
        if (!char || char.length !== 1) continue;

        // Pula se já existe na nossa base curada
        if (originalMap.has(char)) continue;

        const pinyin = item.pinyin && item.pinyin.length > 0 ? item.pinyin[0] : '';
        const meaning = item.definition || '';
        const components = parseComponents(item.decomposition);

        // HSK resolvido dinamicamente pelo mapa, fallback para 7
        const hsk = charHskMap.get(char) || 7;

        importedList.push({
          id: char,
          pinyin: pinyin,
          meaning: meaning,
          hsk: hsk,
          components: components,
          visual_parents: [],
          tags: []
        });
        newCount++;
      } catch (err) {
        // Ignora erros de linhas mal-formadas
      }
    }

    console.log(`✅ Adicionados ${newCount} novos caracteres ao banco de dados!`);
    console.log(`📦 Total de caracteres agora: ${importedList.length}`);

    // Gera o código fonte do arquivo JS
    const fileContent = `/**
 * hanziData.js — Master character database
 * Atualizado automaticamente via script de importação.
 */

export const hanziData = ${JSON.stringify(importedList, null, 2)};
`;

    fs.writeFileSync(TARGET_FILE, fileContent, 'utf-8');
    console.log(`🎉 Gravação realizada com sucesso em: ${TARGET_FILE}`);
  } catch (err) {
    console.error('❌ Erro na importação do dataset:', err);
  }
}

run();
