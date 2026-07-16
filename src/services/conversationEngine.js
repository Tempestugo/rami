/**
 * conversationEngine.js
 * Motor híbrido de conversação: Máquina de Estados + Similaridade + LLM Judge
 */

import { pinyin } from 'pinyin-pro';
import Fuse from 'fuse.js';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza texto para comparação (remove espaços, pontuação, lowercase) */
function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\s.,!?;:'"\-—…~～]/g, '')
    .trim();
}

/** Converte hanzi para pinyin com tons */
export function toPinyin(hanzi) {
  try {
    return pinyin(hanzi, { toneType: 'symbol', type: 'string' });
  } catch (e) {
    return '';
  }
}

/** Extrai array de pinyin por caractere para comparação de tons */
export function toPinyinArray(hanzi) {
  try {
    return pinyin(hanzi, { toneType: 'symbol', type: 'array' });
  } catch (e) {
    return [];
  }
}

/** Compara pinyin arrays e retorna diferenças */
export function comparePinyin(expectedHanzi, actualHanzi) {
  const expectedArr = toPinyinArray(expectedHanzi);
  const actualArr = toPinyinArray(actualHanzi);
  const diffs = [];
  
  const maxLen = Math.max(expectedArr.length, actualArr.length);
  for (let i = 0; i < maxLen; i++) {
    const exp = expectedArr[i] || '';
    const act = actualArr[i] || '';
    if (exp !== act) {
      diffs.push({
        index: i,
        char: expectedHanzi[i] || '?',
        expectedChar: expectedHanzi[i] || '?',
        actualChar: actualHanzi[i] || '?',
        expectedPinyin: exp,
        actualPinyin: act,
        isToneError: exp.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, 'a') === act.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, 'a') && exp !== act,
        isMissing: !act,
        isExtra: !exp
      });
    }
  }
  return diffs;
}

// ─── Similaridade com Fuse.js ─────────────────────────────────────────────────

const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/** Avalia se a frase do usuário atinge a intenção esperada */
export function evaluateIntent(userInput, intent) {
  const normalizedInput = normalize(userInput);
  const inputPinyin = normalize(toPinyin(userInput));
  
  // 1. Verificação exata (hanzi)
  const exactMatches = intent.expectedResponses.filter(r => normalize(r) === normalizedInput);
  if (exactMatches.length > 0) {
    return { matched: true, score: 1.0, intentId: intent.id, method: 'exact' };
  }

  // 2. Verificação por keywords (hanzi)
  const keywordMatches = intent.keywordsZh.filter(kw => normalizedInput.includes(normalize(kw)));
  const keywordScore = keywordMatches.length / Math.max(intent.keywordsZh.length, 1);
  
  // 3. Verificação por keywords (pinyin)
  const pinyinKeywordMatches = intent.keywordsPinyin.filter(kw => inputPinyin.includes(normalize(kw)));
  const pinyinScore = pinyinKeywordMatches.length / Math.max(intent.keywordsPinyin.length, 1);
  
  // 4. Fuzzy matching nas expectedResponses
  const fuse = new Fuse(intent.expectedResponses, fuseOptions);
  const fuseResults = fuse.search(userInput);
  const fuseScore = fuseResults.length > 0 ? 1 - (fuseResults[0].score || 0) : 0;

  // Score combinado: ponderamos keyword match mais alto (intenção > exatidão)
  const combinedScore = Math.max(
    keywordScore * 0.6 + pinyinScore * 0.4,
    fuseScore * 0.8
  );

  // Threshold de passagem: 0.5 (flexível para aprendizagem)
  const matched = combinedScore >= 0.5;
  
  return {
    matched,
    score: combinedScore,
    intentId: intent.id,
    method: matched ? (keywordScore > 0.5 ? 'keyword' : 'fuzzy') : 'none',
    details: { keywordScore, pinyinScore, fuseScore, keywordMatches, pinyinKeywordMatches }
  };
}

/** Encontra a melhor intenção correspondente entre todas as opções do nó */
export function findBestIntent(userInput, node) {
  if (!node.intents || node.intents.length === 0) return null;
  
  let best = null;
  let bestScore = -1;
  
  for (const intent of node.intents) {
    const result = evaluateIntent(userInput, intent);
    if (result.score > bestScore) {
      bestScore = result.score;
      best = result;
    }
  }
  
  return best;
}

// ─── Engine Principal ──────────────────────────────────────────────────────────

export class ConversationEngine {
  constructor(scenario) {
    this.scenario = scenario;
    this.currentNodeId = 'start';
    this.history = [];
    this.pendingLLMFeedback = null;
    this.pendingNpcResponse = null;
  }

  get currentNode() {
    return this.scenario.nodes[this.currentNodeId];
  }

  /** Processa input do usuário e retorna resultado da interação */
  processInput(userInput) {
    const node = this.currentNode;
    const bestIntent = findBestIntent(userInput, node);
    
    // Adiciona à história
    this.history.push({
      role: 'user',
      text: userInput,
      pinyin: toPinyin(userInput),
      timestamp: Date.now()
    });

    if (!bestIntent || !bestIntent.matched) {
      // Não entendeu — dá dica
      const hints = node.intents.map(i => i.hint).filter(Boolean);
      const randomHint = hints.length > 0 ? hints[Math.floor(Math.random() * hints.length)] : 'Tente novamente!';
      
      this.history.push({
        role: 'system',
        text: randomHint,
        type: 'hint',
        timestamp: Date.now()
      });
      
      return {
        success: false,
        hint: randomHint,
        didAdvance: false,
        node: this.currentNodeId
      };
    }

    // Achou intenção — verifica exatidão gramatical
    const matchedIntent = node.intents.find(i => i.id === bestIntent.intentId);
    const isExact = bestIntent.method === 'exact';
    
    // Avança o jogo IMEDIATAMENTE (não bloqueia pela LLM)
    const prevNode = this.currentNodeId;
    this.currentNodeId = matchedIntent.nextNode;
    const nextNode = this.currentNode;
    
    // Store NPC response to add after feedback
    this.pendingNpcResponse = {
      role: 'npc',
      text: nextNode.npcText,
      textZh: nextNode.npcTextZh,
      pinyin: nextNode.npcPinyin,
      timestamp: Date.now()
    };

    // Se não foi exato, prepara feedback para LLM async
    if (!isExact && matchedIntent.expectedResponses.length > 0) {
      const expected = matchedIntent.expectedResponses[0];
      this.pendingLLMFeedback = {
        userInput,
        expected,
        intentId: matchedIntent.id,
        nodeId: prevNode
      };
    } else {
      // If exact match, add NPC response immediately
      this.history.push(this.pendingNpcResponse);
      this.pendingNpcResponse = null;
    }

    return {
      success: true,
      didAdvance: true,
      fromNode: prevNode,
      toNode: this.currentNodeId,
      isExact,
      pendingFeedback: !isExact,
      isEnd: nextNode.isEnd || false,
      node: nextNode
    };
  }

  /** Reinicia a conversa */
  restart() {
    this.currentNodeId = 'start';
    this.history = [];
    this.pendingLLMFeedback = null;
    this.pendingNpcResponse = null;
    
    const startNode = this.currentNode;
    this.history.push({
      role: 'npc',
      text: startNode.npcText,
      textZh: startNode.npcTextZh,
      pinyin: startNode.npcPinyin,
      timestamp: Date.now()
    });
    
    return this.currentNode;
  }

  /** Aplica feedback do LLM à história */
  applyLLMFeedback(feedback) {
    if (!feedback) return;
    this.history.push({
      role: 'system',
      type: 'llm_feedback',
      correct: feedback.correct || false,
      originalPhrase: feedback.originalPhrase || '',
      correctedPhrase: feedback.correctedPhrase || '',
      explanation: feedback.explanation || '',
      errorType: feedback.errorType || null,
      corrections: feedback.corrections || [],
      generalFeedback: feedback.feedback || '',
      highlightedOriginal: feedback.highlightedOriginal || [],
      highlightedCorrected: feedback.highlightedCorrected || [],
      timestamp: Date.now()
    });
    
    // Add pending NPC response after feedback
    if (this.pendingNpcResponse) {
      this.history.push(this.pendingNpcResponse);
      this.pendingNpcResponse = null;
    }
    
    this.pendingLLMFeedback = null;
  }
}

export default ConversationEngine;
