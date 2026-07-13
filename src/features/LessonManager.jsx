/**
 * src/features/LessonManager.jsx
 *
 * Máquina de estados que:
 * 1. Busca o JSON da lição na API (/api/lesson/:id)
 * 2. Itera sobre os exercícios em ordem
 * 3. Renderiza <SiegeMode> ou <FraseCook> conforme o `type`
 * 4. Ao concluir, envia POST /api/progress com XP acumulado
 *
 * Props:
 *   sentenceId  {string}   — ex: 'hsk1_s003'
 *   onComplete  {function} — callback ao finalizar a lição
 */

import { useState, useEffect, useCallback } from 'react';
import SiegeMode from './SiegeMode.jsx';
import FraseCook from './FraseCook.jsx';
import useStore from '../store/useStore';

// ─── Sub-componentes internos ─────────────────────────────────────────────────

/** Tela de quiz de significado — não depende de SiegeMode nem FraseCook */
function MeaningQuiz({ exercise, onSuccess }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  function handleSelect(option) {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
    if (option.correct) {
      // Avança após breve feedback visual
      setTimeout(onSuccess, 900);
    }
  }

  return (
    <div className="meaning-quiz">
      <p className="quiz-prompt-pinyin">{exercise.prompt_pinyin}</p>
      <h2 className="quiz-prompt-hanzi">{exercise.prompt_hanzi}</h2>
      <p className="quiz-label">Qual o significado?</p>
      <div className="quiz-options">
        {exercise.options.map((opt, i) => {
          let cls = 'quiz-option';
          if (revealed) {
            if (opt.correct) cls += ' correct';
            else if (opt === selected) cls += ' wrong';
          }
          return (
            <button key={i} className={cls} onClick={() => handleSelect(opt)}>
              {opt.label}
            </button>
          );
        })}
      </div>
      {revealed && !selected?.correct && (
        <p className="quiz-hint">
          Resposta correta: {exercise.options.find((o) => o.correct)?.label}
        </p>
      )}
    </div>
  );
}

/** Tela de conclusão da lição */
function LessonComplete({ lesson, xpEarned, onContinue }) {
  return (
    <div className="lesson-complete">
      <h2> Lição concluída!</h2>
      <p className="complete-sentence">{lesson.hanzi_full}</p>
      <p className="complete-pinyin">{lesson.pinyin_full}</p>
      <p className="complete-translation">{lesson.translation_pt}</p>
      <p className="complete-xp">+{xpEarned} XP</p>
      <button className="btn-continue" onClick={onContinue}>
        Continuar
      </button>
    </div>
  );
}

// ─── Máquina de estados ───────────────────────────────────────────────────────

const STATE = {
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  PLAYING: 'PLAYING',
  COMPLETE: 'COMPLETE',
};

export default function LessonManager({ sentenceId, onComplete }) {
  const user = useStore(state => state.user);
  const [status, setStatus] = useState(STATE.LOADING);
  const [lesson, setLesson] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Fetch da lição ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sentenceId) return;
    setStatus(STATE.LOADING);

    fetch(`/api/lesson/${sentenceId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setLesson(data);
        setCurrentIndex(0);
        setXpEarned(0);
        setStatus(STATE.PLAYING);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus(STATE.ERROR);
      });
  }, [sentenceId]);

  // ── Callback de sucesso de cada exercício ───────────────────────────────────
  const handleExerciseSuccess = useCallback(() => {
    const exercise = lesson.exercises[currentIndex];
    const gained = exercise?.xp_reward ?? 0;
    setXpEarned((prev) => prev + gained);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= lesson.exercises.length) {
      // Todas os exercícios concluídos → salva progresso
      saveProgress(lesson.lesson_id, lesson.sentence_id, xpEarned + gained);
      setStatus(STATE.COMPLETE);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [lesson, currentIndex, xpEarned]);

  // ── POST de progresso ───────────────────────────────────────────────────────
  async function saveProgress(lessonId, sentenceId, totalXp) {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user?.id,
          lesson_id: lessonId, 
          sentence_id: sentenceId, 
          xp: totalXp 
        }),
      });
    } catch (err) {
      console.warn('Falha ao salvar progresso:', err.message);
      // Não bloqueia o fluxo do jogador
    }
  }

  // ── Renderização por estado ─────────────────────────────────────────────────

  if (status === STATE.LOADING) {
    return (
      <div className="lesson-loading">
        <p>Carregando lição...</p>
      </div>
    );
  }

  if (status === STATE.ERROR) {
    return (
      <div className="lesson-error">
        <p>Erro ao carregar: {errorMsg}</p>
        <button onClick={() => setStatus(STATE.LOADING)}>Tentar novamente</button>
      </div>
    );
  }

  if (status === STATE.COMPLETE) {
    return (
      <LessonComplete
        lesson={lesson}
        xpEarned={xpEarned}
        onContinue={() => onComplete?.({ xp: xpEarned, sentence_id: lesson.sentence_id })}
      />
    );
  }

  // ── STATE.PLAYING ───────────────────────────────────────────────────────────
  const exercise = lesson.exercises[currentIndex];
  const progress = `${currentIndex + 1} / ${lesson.exercises.length}`;

  return (
    <div className="lesson-manager">
      {/* HUD */}
      <div className="lesson-hud">
        <span className="hud-sentence">{lesson.hanzi_full}</span>
        <span className="hud-progress">{progress}</span>
        <span className="hud-xp"> {xpEarned} XP</span>
      </div>

      {/* Exercício atual */}
      <div className="lesson-stage">
        {exercise.type === 'SIEGE_STROKE' && (
          <SiegeMode
            character={exercise.character}
            pinyin={exercise.pinyin}
            meaning={exercise.meaning}
            onSuccess={handleExerciseSuccess}
          />
        )}

        {exercise.type === 'MEANING_QUIZ' && (
          <MeaningQuiz
            exercise={exercise}
            onSuccess={handleExerciseSuccess}
          />
        )}

        {exercise.type === 'SENTENCE_COOK' && (
          <FraseCook
            blocks={exercise.blocks}
            solution={exercise.solution}
            translation={exercise.translation_pt}
            onSuccess={handleExerciseSuccess}
          />
        )}
      </div>
    </div>
  );
}
