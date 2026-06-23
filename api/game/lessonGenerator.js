/**
 * api/game/lessonGenerator.js
 *
 * Fábrica de Lições — recebe uma sentença estruturada do dataset HSK1
 * e devolve um JSON de "Fase" com exercícios gerados dinamicamente.
 *
 * Contrato de saída (LessonPayload):
 * {
 *   lesson_id: string,
 *   sentence_id: string,
 *   hanzi_full: string,        // "我喝水"
 *   translation_pt: string,
 *   exercises: Exercise[]
 * }
 *
 * Tipos de Exercise:
 *   SIEGE_STROKE  — um caractere para desenhar (→ SiegeMode)
 *   MEANING_QUIZ  — reconhecer o significado de uma palavra
 *   SENTENCE_COOK — montar a frase embaralhada (→ FraseCook)
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SENTENCES_PATH = path.resolve(__dirname, '../../src/data/hsk1_sentences.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Embaralha um array (Fisher-Yates) sem mutar o original */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Gera um ID de lição único baseado em timestamp + sentença */
function makeLessonId(sentenceId) {
  return `lesson_${sentenceId}_${Date.now()}`;
}

// ─── Builders de exercício ────────────────────────────────────────────────────

/**
 * SIEGE_STROKE: um exercício de caligrafia por caractere.
 * Props repassadas ao <SiegeMode />:
 *   character  — o hanzi a ser desenhado
 *   pinyin     — exibido como dica
 *   meaning    — exibido como dica secundária
 */
function buildSiegeExercises(sentence) {
  // Itera sobre TODOS os caracteres únicos da frase (não só as palavras)
  // para que cada traço seja praticado individualmente.

  const hanziStr = sentence.hanzi || '';
  const chars = [...new Set([...hanziStr])].filter((c) => c.trim());
  const words = sentence.words || []; // Proteção!

  return chars.map((char, idx) => {
    // Tenta encontrar pinyin/meaning na decomposição de palavras
    const wordMatch = words.find((w) => w.hanzi.includes(char));
    return {
      id: `siege_${sentence.id}_${idx}`,
      type: 'SIEGE_STROKE',
      // Props diretas para <SiegeMode character={...} pinyin={...} meaning={...} />
      character: char,
      pinyin: wordMatch?.pinyin ?? '',
      meaning: wordMatch?.meaning_pt ?? '',
      // Metadados para o LessonManager
      xp_reward: 10,
    };
  });
}

/**
 * MEANING_QUIZ: reconhecer o significado de uma palavra da frase.
 * Gera um quiz de múltipla escolha (1 correto + 3 distratores).
 * O frontend renderiza isso sem precisar de SiegeMode ou FraseCook.
 */
function buildMeaningQuiz(sentence, allSentences) {
  const words = sentence.words || []; // Proteção!
  if (words.length === 0) return [];

  // Pega uma palavra aleatória da sentença como alvo
  const target = words[Math.floor(Math.random() * words.length)];

  // Distratores: palavras de outras sentenças
  const distractors = allSentences
    .filter((s) => s.id !== sentence.id)
    .flatMap((s) => s.words || []) // Proteção contra arrays aninhados undefined
    .filter((w) => w.hanzi !== target.hanzi && w.meaning_pt)
    .slice(0, 6); // pega 6 candidatos

  const wrongOptions = shuffle(distractors)
    .slice(0, 3)
    .map((w) => ({ label: w.meaning_pt, correct: false }));

  const options = shuffle([
    { label: target.meaning_pt, correct: true },
    ...wrongOptions,
  ]);

  return [
    {
      id: `meaning_${sentence.id}`,
      type: 'MEANING_QUIZ',
      // O que mostrar: o hanzi ou o pinyin?
      prompt_hanzi: target.hanzi,
      prompt_pinyin: target.pinyin,
      options,
      xp_reward: 15,
    },
  ];
}

/**
 * SENTENCE_COOK: montar a frase completa embaralhada.
 * Props repassadas ao <FraseCook />:
 *   blocks      — array de { id, text } embaralhado
 *   solution    — array de ids na ordem correta
 */
function buildSentenceCookExercise(sentence) {
  // Usa as PALAVRAS (não caracteres individuais) como blocos
  const words = sentence.words || []; // Proteção!
  if (words.length === 0) return [];

  const orderedBlocks = words.map((w, idx) => ({
    id: `block_${idx}`,
    text: w.hanzi,
    pinyin: w.pinyin,
  }));

  return [
    {
      id: `cook_${sentence.id}`,
      type: 'SENTENCE_COOK',
      // Props diretas para <FraseCook blocks={...} solution={...} translation={...} />
      blocks: shuffle(orderedBlocks),
      solution: orderedBlocks.map((b) => b.id),
      translation_pt: sentence.translation_pt,
      translation_en: sentence.translation_en,
      full_sentence_hanzi: sentence.hanzi,
      xp_reward: 25,
    },
  ];
}

// ─── Função principal exportada ───────────────────────────────────────────────

/**
 * Gera o payload de uma lição completa a partir de um sentence_id.
 *
 * @param {string} sentenceId - Ex: 'hsk1_s003'
 * @returns {Promise<LessonPayload>}
 */
export async function generateLesson(sentenceId) {
  let raw, allSentences;
  try {
    raw = await readFile(SENTENCES_PATH, 'utf8');
    allSentences = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Erro Crítico IO: ${err.message} (Caminho tentado: ${SENTENCES_PATH})`);
  }

  const sentence = allSentences.find((s) => s.id === sentenceId);
  if (!sentence) {
    throw new Error(`Sentença não encontrada: ${sentenceId}`);
  }

  const exercises = [
    ...buildSiegeExercises(sentence),         // Ex 1..N : SIEGE_STROKE
    ...buildMeaningQuiz(sentence, allSentences), // Ex N+1  : MEANING_QUIZ
    ...buildSentenceCookExercise(sentence),    // Ex Final: SENTENCE_COOK
  ];

  return {
    lesson_id: makeLessonId(sentenceId),
    sentence_id: sentenceId,
    hanzi_full: sentence.hanzi,
    pinyin_full: Array.isArray(sentence.pinyin) ? sentence.pinyin.join(' ') : (sentence.pinyin || ''),
    translation_pt: sentence.translation_pt,
    hsk_level: sentence.hsk_level,
    total_xp: exercises.reduce((acc, e) => acc + (e.xp_reward ?? 0), 0),
    exercises,
  };
}

/**
 * Retorna todas as sentenças disponíveis (para o mapa de mundos).
 */
export async function listSentences() {
  const raw = await readFile(SENTENCES_PATH, 'utf8');
  return JSON.parse(raw);
}

// ─── Rota Express (uso direto) ────────────────────────────────────────────────
// Importe este handler em api/routes/game.js:
//
//   import { lessonHandler } from './game/lessonGenerator.js';
//   router.get('/lesson/:id', lessonHandler);

export async function lessonHandler(req, res) {
  try {
    const lesson = await generateLesson(req.params.id);
    res.json(lesson);
  } catch (err) {
    console.error('CRASH NO LESSON GENERATOR:', err);
    const status = err.message.includes('não encontrada') ? 404 : 500;
    res.status(status).json({ error: err.message, stack: err.stack });
  }
}
