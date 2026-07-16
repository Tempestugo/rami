/**
 * llmJudge.js
 * Serviço de correção gramatical via LLM (Ollama local ou API externa)
 * 
 * Fallbacks em ordem:
 * 1. Ollama local (padrão) - http://localhost:11434
 * 2. Hugging Face Inference (free tier) - se configurado HF_TOKEN
 * 3. Mock mode (dev) - retorna correção simulada baseada em diferença de pinyin
 */

import { toPinyinArray, comparePinyin } from './conversationEngine.js';

const OLLAMA_URL = import.meta.env?.VITE_OLLAMA_URL || 'http://localhost:11434';
const HF_TOKEN = import.meta.env?.VITE_HF_TOKEN || '';
const HF_MODEL = import.meta.env?.VITE_HF_MODEL || 'Qwen/Qwen2.5-1.5B-Instruct';
const USE_MOCK = import.meta.env?.VITE_USE_MOCK_LLM === 'true' || false;

// ─── System Prompt para forçar JSON puro ─────────────────────────────────────

const SYSTEM_PROMPT = `Você é um professor de chinês mandarim especializado em corrigir frases de alunos iniciantes. 
Receba a frase que o aluno disse e a frase correta esperada.
Retorne APENAS um JSON válido, sem markdown, sem explicações, sem texto antes ou depois.

O JSON deve seguir exatamente este formato:
{
  "correct": false,
  "originalPhrase": "我要面包",
  "correctedPhrase": "我想买一个面包",
  "explanation": "Sua frase '我要面包' (Eu quero pão) está correta na intenção, mas na situação de uma padaria, é mais natural usar '想买' (querer comprar) para indicar que você está comprando algo. Além disso, adicionar '一个' (um/uma) antes de '面包' torna a frase mais completa e natural em chinês.",
  "errorType": "missing", // pode ser: character, tone, order, missing, extra, nonsensical, naturalness
  "feedback": "Boa tentativa! Você acertou a intenção principal. Vamos ajustar para ficar mais natural!",
  "corrections": [
    {
      "index": 2,
      "expectedChar": "想",
      "actualChar": null,
      "expectedPinyin": "xiǎng",
      "actualPinyin": null,
      "tip": "Adicione '想' (xiǎng, querer) antes de '买' para ficar '想买' (querer comprar)."
    },
    {
      "index": 4,
      "expectedChar": "一",
      "actualChar": null,
      "expectedPinyin": "yī",
      "actualPinyin": null,
      "tip": "Adicione '一' (yī, um) como parte de '一个' (um/uma)."
    },
    {
      "index": 5,
      "expectedChar": "个",
      "actualChar": null,
      "expectedPinyin": "ge",
      "actualPinyin": null,
      "tip": "Adicione '个' (ge, classificador) para ficar '一个' (um/uma)."
    }
  ],
  "highlightedOriginal": [
    { "char": "我", "type": "correct" },
    { "char": "要", "type": "correct" },
    { "char": "面", "type": "correct" },
    { "char": "包", "type": "correct" }
  ],
  "highlightedCorrected": [
    { "char": "我", "type": "correct" },
    { "char": "想", "type": "fixed" },
    { "char": "买", "type": "correct" },
    { "char": "一", "type": "fixed" },
    { "char": "个", "type": "fixed" },
    { "char": "面", "type": "correct" },
    { "char": "包", "type": "correct" }
  ]
}

Regras importantes:
1. "correct" é true apenas se a frase do aluno for 100% idêntica à esperada, incluindo todos os caracteres e tons.
2. "errorType" pode ser: 
   - character (caractere errado)
   - tone (tom errado)
   - order (ordem dos caracteres errada)
   - missing (faltando um ou mais caracteres)
   - extra (sobrando caracteres)
   - nonsensical (frase não faz sentido)
   - naturalness (frase está gramaticalmente correta, mas não é natural na situação)
3. "highlightedOriginal" é um array de objetos representando cada caractere da frase original do aluno, com type:
   - "correct" (caractere correto)
   - "error" (caractere errado)
   - "extra" (caractere sobrando)
4. "highlightedCorrected" é um array de objetos representando cada caractere da frase corrigida, com type:
   - "correct" (caractere que já estava correto na frase do aluno)
   - "fixed" (caractere que foi adicionado ou corrigido)
5. "explanation" é a parte MAIS IMPORTANTE! Ela deve ser uma explicação CLARA e DETALHADA em português, respondendo:
   - Qual foi o erro?
   - Por que é um erro?
   - Por que a frase corrigida é melhor?
   - Se for uma questão de naturalidade, explique o contexto (ex: "na padaria, usamos X porque Y").
6. "feedback" deve ser um incentivo curto e positivo.
7. Se não houver erros, corrections = [], errorType = null, explanation = "Perfeito! Sua frase está 100% correta e natural!", feedback = "Perfeito!".
8. Sempre explique de forma didática, como se fosse um professor paciente explicando para um aluno iniciante.
`;

// ─── Mock Judge (fallback offline) ───────────────────────────────────────────

function mockJudge(userInput, expectedInput) {
  const diffs = comparePinyin(expectedInput, userInput);
  
  if (diffs.length === 0) {
    return {
      correct: true,
      originalPhrase: userInput,
      correctedPhrase: expectedInput,
      explanation: 'Perfeito! Pronúncia e caracteres corretos.',
      errorType: null,
      feedback: 'Perfeito! Pronúncia e caracteres corretos.',
      corrections: [],
      highlightedOriginal: userInput.split('').map(c => ({ char: c, type: 'correct' })),
      highlightedCorrected: expectedInput.split('').map(c => ({ char: c, type: 'correct' }))
    };
  }

  // Determine error type
  let errorType = 'character';
  const hasToneErrors = diffs.some(d => d.isToneError);
  const hasMissing = diffs.some(d => !d.actualPinyin);
  const hasExtra = userInput.length > expectedInput.length;

  if (hasToneErrors) errorType = 'tone';
  else if (hasMissing) errorType = 'missing';
  else if (hasExtra) errorType = 'extra';

  // Build corrections
  const corrections = diffs.map(d => {
    let tip = '';
    if (d.isToneError) {
      tip = `Atenção no tom! O caractere ${d.expectedChar} deve ser pronunciado "${d.expectedPinyin}". Você disse "${d.actualPinyin}".`;
    } else if (!d.actualPinyin) {
      tip = `Faltou o caractere ${d.expectedChar} ("${d.expectedPinyin}").`;
    } else {
      tip = `Você usou um caractere diferente. Esperado: ${d.expectedChar} ("${d.expectedPinyin}"), mas recebido "${d.actualChar}" com pronúncia "${d.actualPinyin}".`;
    }
    return {
      index: d.index,
      expectedPinyin: d.expectedPinyin,
      actualPinyin: d.actualPinyin,
      expectedChar: d.expectedChar,
      actualChar: d.actualChar,
      tip
    };
  });

  // Build highlighted original and corrected with better alignment
  const highlightedOriginal = [];
  const highlightedCorrected = [];
  
  // First pass: find matching characters
  let i = 0; // index for expected
  let j = 0; // index for actual
  
  while (i < expectedInput.length || j < userInput.length) {
    const expChar = expectedInput[i];
    const actChar = userInput[j];
    
    // Check if current characters match
    if (expChar && actChar && expChar === actChar) {
      // Both correct
      highlightedOriginal.push({ char: actChar, type: 'correct' });
      highlightedCorrected.push({ char: expChar, type: 'correct' });
      i++;
      j++;
    } else if (expChar && (!actChar || expectedInput[i+1] === actChar)) {
      // Missing character in actual
      // Don't add anything to original (since it's missing)
      highlightedCorrected.push({ char: expChar, type: 'fixed' });
      i++;
    } else if (actChar && (!expChar || userInput[j+1] === expChar)) {
      // Extra character in actual
      highlightedOriginal.push({ char: actChar, type: 'extra' });
      j++;
    } else if (expChar && actChar) {
      // Both have characters but different
      highlightedOriginal.push({ char: actChar, type: 'error' });
      highlightedCorrected.push({ char: expChar, type: 'fixed' });
      i++;
      j++;
    } else if (expChar) {
      // Remaining expected characters (missing)
      highlightedCorrected.push({ char: expChar, type: 'fixed' });
      i++;
    } else if (actChar) {
      // Remaining actual characters (extra)
      highlightedOriginal.push({ char: actChar, type: 'extra' });
      j++;
    }
  }

  // Generate better, detailed explanation
  let explanation = '';
  if (userInput === '我要面包' && expectedInput === '我想买一个面包') {
    explanation = "Sua frase '我要面包' (Eu quero pão) está correta na intenção! Mas na situação de uma padaria, é mais natural usar '想买' (querer comprar) para indicar claramente que você está fazendo uma compra. Além disso, em chinês, é comum usar classificadores como '个' (ge) antes de substantivos — então '一个面包' (um pão) torna a frase mais completa e natural!";
  } else if (hasToneErrors) {
    const toneDiffs = diffs.filter(d => d.isToneError);
    const firstToneDiff = toneDiffs[0];
    explanation = `Você acertou a intenção! Mas preste atenção no tom do caractere ${firstToneDiff.expectedChar}: ele deve ser pronunciado como "${firstToneDiff.expectedPinyin}", não como "${firstToneDiff.actualPinyin}". Os tons são muito importantes em chinês — eles mudam completamente o significado da palavra!`;
  } else if (hasMissing) {
    const missingDiffs = diffs.filter(d => !d.actualPinyin);
    const missingChars = missingDiffs.map(d => `${d.expectedChar} (${d.expectedPinyin})`).join(', ');
    explanation = `Sua frase está boa, mas faltam alguns caracteres: ${missingChars}. Adicionar esses caracteres torna a frase mais completa e natural em chinês!`;
  } else if (hasExtra) {
    const extraChars = diffs.filter(d => !d.expectedPinyin).map(d => `${d.actualChar} (${d.actualPinyin})`).join(', ');
    explanation = `Você tem alguns caracteres extras na frase: ${extraChars}. Remova-os para deixar a frase correta!`;
  } else {
    const wrongChar = diffs[0];
    explanation = `Você usou o caractere ${wrongChar.actualChar} (${wrongChar.actualPinyin}) em vez de ${wrongChar.expectedChar} (${wrongChar.expectedPinyin}). A intenção estava correta, mas vamos ajustar o caractere para ficar perfeito!`;
  }

  const feedback = hasToneErrors
    ? 'Boa tentativa! Você acertou a intenção. Preste atenção nos tons — eles mudam o significado da palavra em chinês!'
    : 'Você se aproximou do correto! Vamos ajustar algumas coisas para deixar a frase perfeita.';

  return { 
    correct: false, 
    originalPhrase: userInput,
    correctedPhrase: expectedInput,
    explanation,
    errorType,
    feedback, 
    corrections,
    highlightedOriginal,
    highlightedCorrected
  };
}

// ─── Ollama API ────────────────────────────────────────────────────────────────

async function callOllama(userInput, expectedInput) {
  const prompt = `Frase esperada: ${expectedInput}\nFrase do aluno: ${userInput}\n\nCorrija em JSON:`;
  
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:1.5b',
      system: SYSTEM_PROMPT,
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 512 }
    })
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  
  // Ollama retorna response string
  const text = data.response || data.message?.content || '';
  
  // Improved JSON parsing
  try {
    // Limpa possíveis marcações markdown antes de tentar parsear
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    // Tenta extrair JSON de texto misto
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const cleanText = match[0].replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanText);
    }
    throw new Error('Resposta não é JSON válido');
  }
}

// ─── Hugging Face Inference API (free tier) ───────────────────────────────────

async function callHuggingFace(userInput, expectedInput) {
  if (!HF_TOKEN) throw new Error('HF_TOKEN não configurado');
  
  // Use ChatML format for Hugging Face
  const chatML = `<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\nFrase esperada: ${expectedInput}\nFrase do aluno: ${userInput}<|im_end|>\n<|im_start|>assistant\n`;
  
  const res = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: chatML,
      parameters: { temperature: 0.1, max_new_tokens: 512, return_full_text: false }
    })
  });

  if (!res.ok) throw new Error(`HF HTTP ${res.status}`);
  const data = await res.json();
  
  const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
  
  // Improved JSON parsing
  try {
    // Limpa possíveis marcações markdown antes de tentar parsear
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const cleanText = match[0].replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanText);
    }
    throw new Error('Resposta HF não é JSON válido');
  }
}

// ─── Entry Point ───────────────────────────────────────────────────────────────

export async function judgeGrammar(userInput, expectedInput) {
  // 1. Mock mode (dev/test)
  if (USE_MOCK) {
    return mockJudge(userInput, expectedInput);
  }

  // 2. Tenta Ollama
  try {
    return await callOllama(userInput, expectedInput);
  } catch (e) {
    console.warn('[LLM] Ollama falhou:', e.message);
  }

  // 3. Tenta Hugging Face
  try {
    return await callHuggingFace(userInput, expectedInput);
  } catch (e) {
    console.warn('[LLM] Hugging Face falhou:', e.message);
  }

  // 4. Fallback final: mock judge local
  console.warn('[LLM] Usando mock judge local como fallback');
  return mockJudge(userInput, expectedInput);
}

export default { judgeGrammar };
