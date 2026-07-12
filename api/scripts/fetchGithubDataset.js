/**
 * api/scripts/fetchGithubDataset.js
 *
 * Utilitário de ingestão de dados HSK1.
 * Fonte: drkameleon/complete-hsk-vocabulary (MIT License)
 * Raw URL: https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/hsk-new-1.json
 *
 * Execução: node api/scripts/fetchGithubDataset.js
 * Output:   api/_data/hsk1_words.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Fontes raw do GitHub ────────────────────────────────────────────────────
const SOURCES = {
  // Vocabulário HSK1 estruturado: { word, pinyin, meanings, pos, frequency }
  hsk1_vocab:
    'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/hsk-new-1.json',
};

// ─── Sentenças HSK1 curadas manualmente (fallback seguro) ────────────────────
// Cada sentença usa APENAS vocabulário real do HSK1 (150 palavras).
// Estrutura: hanzi, pinyin (por sílaba), tradução PT-BR, palavras decompostas.
const HSK1_SEED_SENTENCES = [
  {
    id: 'hsk1_s001',
    hanzi: '我爱你',
    pinyin: ['wǒ', 'ài', 'nǐ'],
    translation_pt: 'Eu te amo.',
    translation_en: 'I love you.',
    words: [
      { hanzi: '我', pinyin: 'wǒ', meaning_pt: 'eu' },
      { hanzi: '爱', pinyin: 'ài', meaning_pt: 'amar' },
      { hanzi: '你', pinyin: 'nǐ', meaning_pt: 'você' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s002',
    hanzi: '你好吗',
    pinyin: ['nǐ', 'hǎo', 'ma'],
    translation_pt: 'Como você está?',
    translation_en: 'How are you?',
    words: [
      { hanzi: '你', pinyin: 'nǐ', meaning_pt: 'você' },
      { hanzi: '好', pinyin: 'hǎo', meaning_pt: 'bem / bom' },
      { hanzi: '吗', pinyin: 'ma', meaning_pt: '(partícula interrogativa)' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s003',
    hanzi: '我喝水',
    pinyin: ['wǒ', 'hē', 'shuǐ'],
    translation_pt: 'Eu bebo água.',
    translation_en: 'I drink water.',
    words: [
      { hanzi: '我', pinyin: 'wǒ', meaning_pt: 'eu' },
      { hanzi: '喝', pinyin: 'hē', meaning_pt: 'beber' },
      { hanzi: '水', pinyin: 'shuǐ', meaning_pt: 'água' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s004',
    hanzi: '他是老师',
    pinyin: ['tā', 'shì', 'lǎo', 'shī'],
    translation_pt: 'Ele é professor.',
    translation_en: 'He is a teacher.',
    words: [
      { hanzi: '他', pinyin: 'tā', meaning_pt: 'ele' },
      { hanzi: '是', pinyin: 'shì', meaning_pt: 'ser / estar' },
      { hanzi: '老师', pinyin: 'lǎoshī', meaning_pt: 'professor(a)' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s005',
    hanzi: '我吃米饭',
    pinyin: ['wǒ', 'chī', 'mǐ', 'fàn'],
    translation_pt: 'Eu como arroz.',
    translation_en: 'I eat rice.',
    words: [
      { hanzi: '我', pinyin: 'wǒ', meaning_pt: 'eu' },
      { hanzi: '吃', pinyin: 'chī', meaning_pt: 'comer' },
      { hanzi: '米饭', pinyin: 'mǐfàn', meaning_pt: 'arroz (cozido)' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s006',
    hanzi: '今天天气很好',
    pinyin: ['jīn', 'tiān', 'tiān', 'qì', 'hěn', 'hǎo'],
    translation_pt: 'O tempo hoje está muito bom.',
    translation_en: 'The weather today is very good.',
    words: [
      { hanzi: '今天', pinyin: 'jīntiān', meaning_pt: 'hoje' },
      { hanzi: '天气', pinyin: 'tiānqì', meaning_pt: 'tempo / clima' },
      { hanzi: '很', pinyin: 'hěn', meaning_pt: 'muito' },
      { hanzi: '好', pinyin: 'hǎo', meaning_pt: 'bom' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s007',
    hanzi: '这是什么',
    pinyin: ['zhè', 'shì', 'shén', 'me'],
    translation_pt: 'O que é isso?',
    translation_en: 'What is this?',
    words: [
      { hanzi: '这', pinyin: 'zhè', meaning_pt: 'este / isso' },
      { hanzi: '是', pinyin: 'shì', meaning_pt: 'ser' },
      { hanzi: '什么', pinyin: 'shénme', meaning_pt: 'o quê' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s008',
    hanzi: '我有一个朋友',
    pinyin: ['wǒ', 'yǒu', 'yī', 'gè', 'péng', 'yǒu'],
    translation_pt: 'Eu tenho um amigo.',
    translation_en: 'I have a friend.',
    words: [
      { hanzi: '我', pinyin: 'wǒ', meaning_pt: 'eu' },
      { hanzi: '有', pinyin: 'yǒu', meaning_pt: 'ter' },
      { hanzi: '一', pinyin: 'yī', meaning_pt: 'um' },
      { hanzi: '个', pinyin: 'gè', meaning_pt: '(classificador geral)' },
      { hanzi: '朋友', pinyin: 'péngyǒu', meaning_pt: 'amigo(a)' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s009',
    hanzi: '她叫什么名字',
    pinyin: ['tā', 'jiào', 'shén', 'me', 'míng', 'zi'],
    translation_pt: 'Qual é o nome dela?',
    translation_en: 'What is her name?',
    words: [
      { hanzi: '她', pinyin: 'tā', meaning_pt: 'ela' },
      { hanzi: '叫', pinyin: 'jiào', meaning_pt: 'chamar-se' },
      { hanzi: '什么', pinyin: 'shénme', meaning_pt: 'o quê' },
      { hanzi: '名字', pinyin: 'míngzi', meaning_pt: 'nome' },
    ],
    hsk_level: 1,
  },
  {
    id: 'hsk1_s010',
    hanzi: '我不去学校',
    pinyin: ['wǒ', 'bù', 'qù', 'xué', 'xiào'],
    translation_pt: 'Eu não vou para a escola.',
    translation_en: 'I am not going to school.',
    words: [
      { hanzi: '我', pinyin: 'wǒ', meaning_pt: 'eu' },
      { hanzi: '不', pinyin: 'bù', meaning_pt: 'não' },
      { hanzi: '去', pinyin: 'qù', meaning_pt: 'ir' },
      { hanzi: '学校', pinyin: 'xuéxiào', meaning_pt: 'escola' },
    ],
    hsk_level: 1,
  },
];

// ─── Funções auxiliares ───────────────────────────────────────────────────────

/**
 * Tenta fazer o fetch do vocabulário HSK1 do GitHub.
 * Retorna o array ou null em caso de falha (sem quebrar o script).
 */
async function fetchVocabFromGithub() {
  try {
    console.log(' Buscando vocabulário HSK1 do GitHub...');
    const res = await fetch(SOURCES.hsk1_vocab);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    // O schema do drkameleon/complete-hsk-vocabulary tem campos abreviados.
    // Normalizamos para o contrato interno do projeto.
    const normalized = raw.map((item) => ({
      word: item.w ?? item.word ?? '',
      pinyin: item.py ?? item.pinyin ?? '',
      meanings: item.m ?? item.meanings ?? [],
      pos: item.p ?? item.pos ?? [],
      frequency: item.q ?? item.frequency ?? 9999,
    }));

    console.log(` ${normalized.length} palavras carregadas do GitHub.`);
    return normalized;
  } catch (err) {
    console.warn(`️  GitHub fetch falhou (${err.message}). Usando seed local.`);
    return null;
  }
}

/**
 * Persiste um objeto como JSON em disco.
 */
async function saveJSON(relPath, data) {
  const fullPath = path.resolve(__dirname, '../_data', relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(` Salvo em: ${fullPath}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n Iniciando ingestão do dataset HSK1...\n');

  // 1. Vocabulário (palavras isoladas)
  const vocab = await fetchVocabFromGithub();
  if (vocab) {
    await saveJSON('hsk1_words.json', vocab);
  } else {
    // Fallback: extrai palavras das sentenças seed
    const seedWords = HSK1_SEED_SENTENCES.flatMap((s) => s.words).reduce(
      (acc, w) => {
        if (!acc.find((x) => x.word === w.hanzi)) {
          acc.push({ word: w.hanzi, pinyin: w.pinyin, meanings: [w.meaning_pt] });
        }
        return acc;
      },
      []
    );
    await saveJSON('hsk1_words.json', seedWords);
  }

  // 2. Sentenças estruturadas (sempre salva as seeds)
  await saveJSON('hsk1_sentences.json', HSK1_SEED_SENTENCES);

  console.log('\n Ingestão concluída. Próximo passo: rodar lessonGenerator.js\n');
}

main().catch((err) => {
  console.error(' Erro fatal:', err);
  process.exit(1);
});
