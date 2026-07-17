/**
 * src/features/components/ProvinceModal.jsx
 * Modal de conquista de província — quiz de 5 caracteres
 */
import { useState, useEffect, useCallback } from 'react';
import { PROVINCES, BOTS } from '../../data/imperioData.js';
import { hanziData } from '@/data/hanziData.js';

const BI_PER_CORRECT = 10;
const QUESTIONS_PER_SESSION = 5;

function buildQuestion(char, allChars) {
  const entry = hanziData.find(h => h.id === char);
  if (!entry) return null;

  // Gerar 3 distractors aleatórios
  const pool = hanziData.filter(h => h.id !== char && h.meaning_pt);
  const distractors = pool.sort(() => Math.random() - 0.5).slice(0, 3);

  const options = [
    { char: entry.id, pinyin: entry.pinyin, meaning: entry.meaning_pt || entry.meaning, correct: true },
    ...distractors.map(d => ({ char: d.id, pinyin: d.pinyin, meaning: d.meaning_pt || d.meaning, correct: false })),
  ].sort(() => Math.random() - 0.5);

  return {
    char: entry.id,
    pinyin: entry.pinyin,
    question: `Qual o significado de "${entry.id}"?`,
    options,
  };
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN';
  utt.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

export default function ProvinceModal({
  province,
  playerState,
  botState,
  unlockedAbilities,
  onConquestUpdate,
  onClose,
}) {
  const [phase, setPhase] = useState('info'); // 'info' | 'quiz' | 'result'
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);

  const hasAudio = unlockedAbilities.includes('audio_hint');
  const hasContext = unlockedAbilities.includes('context_phrase');
  const hasRadical = unlockedAbilities.includes('radical_vision');

  // Montar quiz ao entrar na fase
  useEffect(() => {
    if (phase === 'quiz' && questions.length === 0) {
      const chars = (province?.chars || []).sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_SESSION);
      const qs = chars.map(c => buildQuestion(c, province.chars)).filter(Boolean);
      setQuestions(qs);
      setCurrentQ(0);
      setScore(0);
      setAnswers([]);
      setSelected(null);
      setRevealed(false);
    }
  }, [phase, province]);

  // Auto-play audio se habilidade ativa
  useEffect(() => {
    if (phase === 'quiz' && hasAudio && questions[currentQ]) {
      speak(questions[currentQ].char);
    }
  }, [currentQ, phase, hasAudio, questions]);

  const handleSelect = useCallback((opt) => {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    if (opt.correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, { char: questions[currentQ]?.char, correct: opt.correct }]);
  }, [revealed, currentQ, questions]);

  const handleNext = useCallback(() => {
    if (currentQ + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setRevealed(false);
    }
  }, [currentQ, questions.length]);

  const handleApplyResult = useCallback(() => {
    const pctGain = score * 20; // 5 perguntas × 20% = 100% se acertar tudo
    const currentPct = playerState?.pct || 0;
    const newPct = Math.min(100, currentPct + pctGain);
    const biEarned = score * BI_PER_CORRECT;
    onConquestUpdate(newPct, biEarned);
    onClose();
  }, [score, playerState, onConquestUpdate, onClose]);

  if (!province) return null;

  const currentPct = playerState?.pct || 0;
  const bot = botState ? BOTS[botState.botId] : null;
  const conquered = playerState?.conquered;
  const available = playerState?.available || playerState?.pct >= 0;

  return (
    <div className="province-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="province-modal">

        {/* Header */}
        <div className="province-modal-header" style={{ borderColor: province.color }}>
          <div className="province-header-left">
            <span className="province-domain-icon">{province.domainIcon}</span>
            <div>
              <div className="province-name-cn">{province.nameCN}</div>
              <div className="province-name">{province.name}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Conteúdo por fase */}
        {phase === 'info' && (
          <div className="province-info-phase">
            <div className="province-domain-tag" style={{ color: province.color }}>
              {province.domainIcon} {province.domain}
            </div>
            <p className="province-desc">{province.description}</p>

            {/* Radical chave */}
            <div className="province-radical-box">
              <span className="radical-char">{province.radical}</span>
              <span className="radical-label">Radical Principal</span>
            </div>

            {/* Caracteres do domínio */}
            <div className="province-chars-preview">
              {province.chars.map(c => (
                <span key={c} className="char-chip" onClick={() => speak(c)}>{c}</span>
              ))}
            </div>

            {/* Status de conquista */}
            <div className="conquest-status-bar">
              <div className="conquest-bar-bg">
                <div
                  className="conquest-bar-fill"
                  style={{ width: `${currentPct}%`, background: province.color }}
                />
              </div>
              <span className="conquest-pct">{currentPct}% conquistado</span>
            </div>

            {/* Aviso de bot */}
            {bot && (
              <div className="bot-threat-warning" style={{ borderColor: bot.color }}>
                ⚠️ {bot.emoji} {bot.fullName} avança aqui ({botState.pct}%)
              </div>
            )}

            {conquered && (
              <div className="conquered-badge">✅ Província conquistada!</div>
            )}

            {/* Botão de ação */}
            {!conquered && available && (
              <button
                className="start-conquest-btn"
                style={{ background: province.color }}
                onClick={() => setPhase('quiz')}
              >
                ⚔️ Iniciar Conquista ({QUESTIONS_PER_SESSION} desafios)
              </button>
            )}
            {!available && (
              <div className="locked-notice">🔒 Conquiste uma província adjacente primeiro</div>
            )}
          </div>
        )}

        {phase === 'quiz' && questions[currentQ] && (
          <div className="province-quiz-phase">
            <div className="quiz-progress">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`quiz-dot ${i < currentQ ? (answers[i]?.correct ? 'correct' : 'wrong') : i === currentQ ? 'active' : ''}`}
                />
              ))}
            </div>

            <div className="quiz-char-display" onClick={() => speak(questions[currentQ].char)}>
              <span className="quiz-char">{questions[currentQ].char}</span>
              {hasRadical && (
                <span className="quiz-radical-hint">radical: {province.radical}</span>
              )}
              <span className="quiz-pinyin">{hasAudio ? questions[currentQ].pinyin : '?'}</span>
              <span className="quiz-audio-hint">🔊 clique para ouvir</span>
            </div>

            <p className="quiz-question">{questions[currentQ].question}</p>

            <div className="quiz-options">
              {questions[currentQ].options.map((opt, i) => {
                let cls = 'quiz-opt';
                if (revealed) {
                  if (opt.correct) cls += ' correct';
                  else if (opt === selected) cls += ' wrong';
                }
                return (
                  <button key={i} className={cls} onClick={() => handleSelect(opt)}>
                    {opt.meaning}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <button className="quiz-next-btn" onClick={handleNext}>
                {currentQ + 1 >= questions.length ? 'Ver Resultado →' : 'Próximo →'}
              </button>
            )}
          </div>
        )}

        {phase === 'result' && (
          <div className="province-result-phase">
            <div className="result-score">
              <span className="result-number">{score}</span>
              <span className="result-total">/ {questions.length}</span>
            </div>

            <div className="result-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < score ? 'star filled' : 'star'}>★</span>
              ))}
            </div>

            <div className="result-gains">
              <div className="gain-item">
                <span>+{score * 20}%</span>
                <span>conquista</span>
              </div>
              <div className="gain-item">
                <span>+{score * BI_PER_CORRECT}</span>
                <span>筆 points</span>
              </div>
            </div>

            <div className="result-answers">
              {answers.map((a, i) => (
                <span key={i} className={`result-char ${a.correct ? 'ok' : 'err'}`}>
                  {a.char}
                </span>
              ))}
            </div>

            <button
              className="apply-result-btn"
              style={{ background: province.color }}
              onClick={handleApplyResult}
            >
              Aplicar no Mapa →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
