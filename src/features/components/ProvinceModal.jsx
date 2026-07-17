import { useState, useEffect, useCallback } from 'react';
import { BOTS } from '../../data/imperioData.js';
import { hanziData } from '@/data/hanziData.js';

const BI_PER_CORRECT = 10;
const QUESTIONS = 5;

function buildQuestion(char) {
  const entry = hanziData.find(h => h.id === char);
  if (!entry) return null;
  const pool = hanziData.filter(h => h.id !== char && (h.meaning_pt || h.meaning));
  const distractors = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [
    { meaning: entry.meaning_pt || entry.meaning, correct: true },
    ...distractors.map(d => ({ meaning: d.meaning_pt || d.meaning, correct: false })),
  ].sort(() => Math.random() - 0.5);
  return { char: entry.id, pinyin: entry.pinyin, options };
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'zh-CN'; utt.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

export default function ProvinceModal({ province, playerState, botState, unlockedAbilities, onConquestUpdate, onClose }) {
  const [phase, setPhase] = useState('info');
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);

  const hasAudio   = unlockedAbilities.includes('audio_hint');
  const hasRadical = unlockedAbilities.includes('radical_vision');

  useEffect(() => {
    if (phase === 'quiz' && questions.length === 0) {
      const chars = [...(province?.chars || [])].sort(() => Math.random() - 0.5).slice(0, QUESTIONS);
      setQuestions(chars.map(buildQuestion).filter(Boolean));
    }
  }, [phase, province]);

  useEffect(() => {
    if (phase === 'quiz' && hasAudio && questions[currentQ]) speak(questions[currentQ].char);
  }, [currentQ, phase, hasAudio, questions]);

  const handleSelect = useCallback((opt) => {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    if (opt.correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, { char: questions[currentQ]?.char, correct: opt.correct }]);
  }, [revealed, currentQ, questions]);

  const handleNext = useCallback(() => {
    if (currentQ + 1 >= questions.length) setPhase('result');
    else { setCurrentQ(q => q + 1); setSelected(null); setRevealed(false); }
  }, [currentQ, questions.length]);

  const handleApply = useCallback(() => {
    const gain = score * 20;
    const newPct = Math.min(100, (playerState?.pct || 0) + gain);
    onConquestUpdate(newPct, score * BI_PER_CORRECT);
    onClose();
  }, [score, playerState, onConquestUpdate, onClose]);

  if (!province) return null;

  const bot = botState ? BOTS[botState.botId] : null;
  const currentPct = playerState?.pct || 0;
  const conquered = playerState?.conquered;
  const available = playerState !== undefined;

  return (
    <div className="pmodal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pmodal">
        {/* Header */}
        <div className="pmodal-header" style={{ borderBottomColor: province.color + '60' }}>
          <div className="pmodal-title-group">
            <span className="pmodal-domain-hanzi" style={{ color: province.color }}>{province.domainHanzi}</span>
            <div>
              <div className="pmodal-cn">{province.nameCN}</div>
              <div className="pmodal-en">{province.name} · {province.domain}</div>
            </div>
          </div>
          <button className="pmodal-close" onClick={onClose}>✕</button>
        </div>

        {/* INFO */}
        {phase === 'info' && (
          <div className="pmodal-body">
            <p className="pmodal-desc">{province.description}</p>

            <div className="pmodal-radical-row">
              <span className="pmodal-radical" style={{ color: province.color }}>{province.radical}</span>
              <span className="pmodal-radical-label">Radical Principal</span>
            </div>

            <div className="pmodal-chars">
              {province.chars.map(c => (
                <button key={c} className="pmodal-char-chip" onClick={() => speak(c)}>{c}</button>
              ))}
            </div>

            <div className="pmodal-bar-wrap">
              <div className="pmodal-bar-bg">
                <div className="pmodal-bar-fill" style={{ width: `${currentPct}%`, background: province.color }} />
              </div>
              <span className="pmodal-bar-label">{currentPct}% conquistado</span>
            </div>

            {bot && (
              <div className="pmodal-bot-threat" style={{ borderColor: bot.color + '60', color: bot.color }}>
                <span className="pmodal-bot-hanzi">{bot.hanzi}</span>
                {bot.fullName} avança aqui ({botState.pct}%)
              </div>
            )}

            {conquered && <div className="pmodal-conquered">完 Província conquistada!</div>}

            {!conquered && available
              ? <button className="pmodal-start-btn" style={{ background: province.color }} onClick={() => setPhase('quiz')}>
                  征 Iniciar Conquista ({QUESTIONS} desafios)
                </button>
              : !available && <div className="pmodal-locked">封 Conquiste uma província adjacente primeiro</div>
            }
          </div>
        )}

        {/* QUIZ */}
        {phase === 'quiz' && questions[currentQ] && (
          <div className="pmodal-body">
            <div className="quiz-dots">
              {questions.map((_, i) => (
                <div key={i} className={`qdot ${i < currentQ ? (answers[i]?.correct ? 'ok' : 'err') : i === currentQ ? 'active' : ''}`} />
              ))}
            </div>

            <div className="quiz-char-box" onClick={() => speak(questions[currentQ].char)}>
              <div className="quiz-big-char">{questions[currentQ].char}</div>
              {hasRadical && <div className="quiz-radical-hint">部首 {province.radical}</div>}
              <div className="quiz-pinyin">{hasAudio ? questions[currentQ].pinyin : '?'}</div>
              <div className="quiz-tap-hint">叩 toque para ouvir</div>
            </div>

            <p className="quiz-question">Qual o significado de <strong>"{questions[currentQ].char}"</strong>?</p>

            <div className="quiz-opts">
              {questions[currentQ].options.map((opt, i) => {
                let cls = 'qopt';
                if (revealed) cls += opt.correct ? ' correct' : opt === selected ? ' wrong' : '';
                return <button key={i} className={cls} onClick={() => handleSelect(opt)}>{opt.meaning}</button>;
              })}
            </div>

            {revealed && (
              <button className="quiz-next" onClick={handleNext}>
                {currentQ + 1 >= questions.length ? '結 Ver Resultado' : '次 Próximo'}
              </button>
            )}
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <div className="pmodal-body pmodal-result">
            <div className="result-chars-row">
              {answers.map((a, i) => (
                <span key={i} className={`result-char ${a.correct ? 'ok' : 'err'}`}>{a.char}</span>
              ))}
            </div>
            <div className="result-score-big">
              <span style={{ color: '#e8d87a' }}>{score}</span>
              <span className="result-of">/{questions.length}</span>
            </div>
            <div className="result-gains">
              <div className="gain-chip">
                <span className="gain-val">+{score * 20}%</span>
                <span className="gain-lbl">conquista</span>
              </div>
              <div className="gain-chip">
                <span className="gain-val">筆+{score * BI_PER_CORRECT}</span>
                <span className="gain-lbl">points</span>
              </div>
            </div>
            <button className="pmodal-start-btn" style={{ background: province.color }} onClick={handleApply}>
              定 Aplicar no Mapa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
