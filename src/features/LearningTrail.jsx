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
    <div className="relative w-full h-full overflow-y-auto bg-ink-950 flex flex-col items-center py-12 px-4">
      {/* Título da Trilha */}
      <div className="mb-10 text-center z-10 fade-up max-w-xl">
        <h2 className="text-3xl font-display text-azure-400 font-bold mb-2">Trilha de Aprendizado</h2>
        <p className="text-ink-400 text-sm font-body">Complete as missões para dominar o vocabulário e a gramática do HSK 1</p>
      </div>

      <div className="relative z-10 flex flex-col gap-6 w-full max-w-2xl">
        {lessons.map((lesson, idx) => {
          // Conta caracteres únicos para os exercícios de caligrafia
          const uniqueChars = new Set([...(lesson.hanzi || '')].filter(c => c.trim())).size;

          return (
            <div 
              key={lesson.id} 
              className="relative bg-ink-900 border border-white/10 rounded-2xl p-6 shadow-lg hover:border-azure-500/30 transition-colors flex flex-col sm:flex-row gap-6 items-center"
            >
              {/* Número da Lição */}
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-azure-600 text-white flex items-center justify-center font-bold shadow-md border-2 border-ink-950">
                {idx + 1}
              </div>

              {/* Info da Sentença */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-white font-bold font-display text-3xl tracking-wide mb-1 drop-shadow-sm">
                  {lesson.hanzi}
                </p>
                <p className="text-azure-300 text-sm font-mono mb-1">
                  {Array.isArray(lesson.pinyin) ? lesson.pinyin.join(' ') : lesson.pinyin}
                </p>
                <p className="text-ink-400 text-sm font-body">
                  {lesson.translation_pt}
                </p>
              </div>

              {/* Botões / Exercícios */}
              <div className="flex flex-col items-center sm:items-end gap-3 shrink-0 w-full sm:w-auto">
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-ink-300 text-xs" title={`${uniqueChars} traços para desenhar`}>
                    <span>✍️</span> <span>{uniqueChars}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-ink-300 text-xs" title="1 Quiz de significado">
                    <span>🧠</span> <span>1</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-ink-300 text-xs" title="1 Desafio de montar a frase">
                    <span>🀄</span> <span>1</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectLesson(lesson.id)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-azure-600/20 border border-azure-500/50 text-azure-300 font-bold tracking-wider hover:bg-azure-600/30 hover:scale-105 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                >
                  INICIAR MISSÃO
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}