import React, { useEffect, useState } from 'react';

export default function LearningTrail({ onSelectLesson }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setLessons(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-azure-300 font-mono">
        Desenhando mapa de estudos...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-y-auto bg-ink-950 flex flex-col items-center py-16">
      {/* Título da Trilha */}
      <div className="mb-12 text-center z-10 fade-up">
        <h2 className="text-3xl font-display text-azure-400 font-bold mb-2">Trilha de Aprendizado</h2>
        <p className="text-ink-400 text-sm font-body">Complete as missões para dominar o HSK 1</p>
      </div>

      {/* Linha vertical central do caminho */}
      <div className="absolute top-40 bottom-0 w-2 bg-ink-800 rounded-t-full left-1/2 -translate-x-1/2 z-0" />

      <div className="relative z-10 flex flex-col gap-8 w-full max-w-2xl px-4">
        {lessons.map((lesson, idx) => {
          // Alterna as informações do texto entre a esquerda e a direita
          const isLeft = idx % 2 === 0;

          return (
            <div key={lesson.id} className="relative flex w-full h-24 items-center justify-center group">
              {/* Textos Informativos */}
              <div className={`absolute w-1/2 px-10 flex flex-col transition-opacity ${isLeft ? 'left-0 items-end text-right' : 'right-0 items-start text-left'} opacity-70 group-hover:opacity-100`}>
                <p className="text-white font-bold font-display text-2xl drop-shadow-md">{lesson.hanzi}</p>
                <p className="text-azure-300 text-sm font-mono">{Array.isArray(lesson.pinyin) ? lesson.pinyin.join(' ') : lesson.pinyin}</p>
                <p className="text-ink-400 text-xs font-body mt-1">{lesson.translation_pt}</p>
              </div>

              {/* Nó Interativo (Botão da Trilha) */}
              <button
                onClick={() => onSelectLesson(lesson.id)}
                className="relative z-10 w-16 h-16 rounded-full bg-ink-900 border-4 border-azure-500 hover:bg-azure-500/20 hover:scale-110 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <span className="font-display text-xl text-azure-100 group-hover:text-white transition-colors">
                  {idx + 1}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}