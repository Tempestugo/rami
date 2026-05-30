import React, { useEffect, useState } from 'react';

export default function LearningTrail({ onSelectLesson }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    fetch('/api/lessons')
      .then(async (r) => {
        const contentType = r.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("A API não retornou JSON. O servidor foi reiniciado?");
        }
        if (!r.ok) throw new Error(`Erro HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.success) {
          setLessons(data.data);
        } else {
          setError(data.error || "Erro desconhecido na API");
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-azure-300 font-mono">
        Desenhando mapa de estudos...
      </div>
    );
  }

  if (error || lessons.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4 items-center justify-center text-ink-300 font-mono text-center px-6">
        <p className="text-vermillion-400 text-lg">⚠️ Ocorreu um problema ao carregar as missões.</p>
        <p className="text-sm bg-ink-900 p-3 rounded-lg border border-white/10">{error || "Lista de lições vazia."}</p>
        <p className="text-xs mt-4">Dica: Execute <code className="text-gold-300 bg-black/40 px-1 py-0.5 rounded">touch tmp/restart.txt</code> no SSH para garantir que o backend atualizou.</p>
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
                  onClick={() => setActiveModal(lesson)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-azure-600/20 border border-azure-500/50 text-azure-300 font-bold tracking-wider hover:bg-azure-600/30 hover:scale-105 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                >
                  VER ATIVIDADES
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Escolha de Atividade */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-ink-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-white text-3xl font-display font-bold text-center mb-2">{activeModal.hanzi}</h3>
            <p className="text-azure-300 font-mono text-center text-sm mb-1">
              {Array.isArray(activeModal.pinyin) ? activeModal.pinyin.join(' ') : activeModal.pinyin}
            </p>
            <p className="text-ink-400 text-sm text-center mb-8">{activeModal.translation_pt}</p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => onSelectLesson({ id: activeModal.id, type: 'stroke' })} 
                className="flex items-center gap-4 bg-white/5 hover:bg-azure-600/20 border border-white/10 hover:border-azure-500/50 transition-colors rounded-xl p-4 text-left group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">✍️</span>
                <div>
                  <h4 className="text-white font-bold">Praticar Traços</h4>
                  <p className="text-ink-400 text-xs">Aprenda a ordem de escrita</p>
                </div>
              </button>

              <button 
                onClick={() => onSelectLesson({ id: activeModal.id, type: 'build' })} 
                className="flex items-center gap-4 bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/50 transition-colors rounded-xl p-4 text-left group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🀄</span>
                <div>
                  <h4 className="text-white font-bold">Montar Frase</h4>
                  <p className="text-ink-400 text-xs">Estilo Duolingo (ordene os blocos)</p>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setActiveModal(null)} 
              className="mt-8 w-full text-ink-500 hover:text-white font-bold text-sm tracking-widest uppercase transition-colors"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}