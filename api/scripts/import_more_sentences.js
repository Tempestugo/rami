import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILE = path.join(__dirname, '../_data/phraseData.js');

// Import the existing phrases
import { phraseData as originalPhrases } from '../_data/phraseData.js';
// Import the characters database to build HSK map
import { hanziData } from '../_data/hanziData.js';

const SOURCE_URL = 'https://raw.githubusercontent.com/krmanik/Chinese-Example-Sentences/main/Chinese%20Example%20Sentences/cmn_sen_db_2.tsv';

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download (Status ${res.statusCode})`));
        return;
      }
      let chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject);
  });
}

// Extract only Chinese characters
const chineseCharRegex = /[\u4e00-\u9fa5]/;
function extractChineseChars(str) {
  return [...str].filter(char => chineseCharRegex.test(char));
}

// Clean fields
function cleanString(str) {
  if (!str) return '';
  return str.trim().replace(/^\uFEFF/, '');
}

async function run() {
  console.log(`🚀 Loading database state...`);
  
  // 1. Build HSK map from hanziData
  const hanziHskMap = new Map();
  const knownChars = new Set();
  for (const item of hanziData) {
    const char = item.id;
    knownChars.add(char);
    let lvl = 7; // default HSK level for extra/beyond
    if (typeof item.hsk === 'number') {
      lvl = item.hsk;
    } else if (item.hsk && !isNaN(parseInt(item.hsk))) {
      lvl = parseInt(item.hsk);
    }
    hanziHskMap.set(char, lvl);
  }
  
  console.log(`   ✓ Loaded HSK map for ${hanziHskMap.size} characters.`);

  const existingPhrases = new Set(originalPhrases.map(p => p.phrase));
  console.log(`   ✓ Current phraseData has ${originalPhrases.length} phrases.`);

  console.log(`📥 Downloading Tatoeba sentences from:\n   ${SOURCE_URL}...`);
  let tsvContent;
  try {
    tsvContent = await downloadFile(SOURCE_URL);
    console.log(`   ✓ Downloaded ${Math.round(tsvContent.length / 1024 / 1024 * 100) / 100} MB of TSV data.`);
  } catch (err) {
    console.error(`❌ Error downloading TSV:`, err.message);
    process.exit(1);
  }

  console.log(`⚙️ Processing sentences...`);
  const lines = tsvContent.split('\n');
  const candidates = [];
  let skippedDuplicates = 0;
  let skippedUnknownChars = 0;
  let skippedInvalidLength = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split('\t');
    if (cols.length < 5) continue;

    const simplified = cleanString(cols[1]);
    const traditional = cleanString(cols[2]);
    const pinyin = cleanString(cols[3]);
    const english = cleanString(cols[4]);

    if (!simplified || !pinyin || !english) continue;

    // Check duplicates
    if (existingPhrases.has(simplified)) {
      skippedDuplicates++;
      continue;
    }

    const chars = extractChineseChars(simplified);
    if (chars.length < 2 || chars.length > 15) {
      skippedInvalidLength++;
      continue;
    }

    // Verify all Chinese characters in this sentence exist in hanziData
    let hasUnknownChar = false;
    for (const c of chars) {
      if (!knownChars.has(c)) {
        hasUnknownChar = true;
        break;
      }
    }
    if (hasUnknownChar) {
      skippedUnknownChars++;
      continue;
    }

    // Compute dynamic HSK level of the sentence (max HSK of its characters)
    let sentenceHsk = 1;
    for (const c of chars) {
      const cLvl = hanziHskMap.get(c) || 7;
      if (cLvl > sentenceHsk) {
        sentenceHsk = cLvl;
      }
    }

    // Build unique characters list for the sentence (preserving order if possible or just unique list)
    const uniqueCharsInSentence = Array.from(new Set(chars));

    candidates.push({
      phrase: simplified,
      pinyin: pinyin,
      translation: english,
      hsk: sentenceHsk,
      chars: uniqueCharsInSentence
    });
  }

  console.log(`📊 Statistics of parsed sentences:`);
  console.log(`   - Duplicates skipped: ${skippedDuplicates}`);
  console.log(`   - Unknown characters skipped: ${skippedUnknownChars}`);
  console.log(`   - Invalid length skipped (<2 or >15 chars): ${skippedInvalidLength}`);
  console.log(`   - Valid candidates found: ${candidates.length}`);

  // Shuffle candidates to get a random distribution across HSK levels
  console.log(`🔀 Shuffling and selecting sentences to merge...`);
  const shuffledCandidates = candidates.sort(() => 0.5 - Math.random());

  // Cap total phrases to 15,000
  const maxTotal = 15000;
  const needToAdd = Math.max(0, maxTotal - originalPhrases.length);
  const selectedCandidates = shuffledCandidates.slice(0, needToAdd);

  console.log(`➕ Merging ${selectedCandidates.length} new phrases into existing bank (Total cap: ${maxTotal})...`);
  const mergedPhrases = [...originalPhrases, ...selectedCandidates];

  // Group or sort merged phrases by HSK level (ascending) and then by phrase length
  mergedPhrases.sort((a, b) => {
    if (a.hsk !== b.hsk) return a.hsk - b.hsk;
    return a.phrase.length - b.phrase.length;
  });

  const hskDistribution = {};
  mergedPhrases.forEach(p => {
    hskDistribution[p.hsk] = (hskDistribution[p.hsk] || 0) + 1;
  });

  console.log(`📈 HSK Distribution of the final phrase bank:`);
  Object.keys(hskDistribution).forEach(lvl => {
    console.log(`   - HSK ${lvl}: ${hskDistribution[lvl]} phrases`);
  });

  // Write file
  console.log(`✍️ Saving to ${TARGET_FILE}...`);
  const fileContent = `/**
 * phraseData.js — Curated phrase bank for the Algorithmic Phrase Builder.
 * Atualizado automaticamente via script de importação de frases.
 */

export const phraseData = ${JSON.stringify(mergedPhrases, null, 2)};
`;

  try {
    fs.writeFileSync(TARGET_FILE, fileContent, 'utf-8');
    console.log(`🎉 Successfully updated phraseData.js with ${mergedPhrases.length} total phrases!`);
  } catch (err) {
    console.error(`❌ Error writing phraseData.js:`, err.message);
    process.exit(1);
  }
}

run();
