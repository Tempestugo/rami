import React, { useEffect, useRef } from 'react';

const LumiWarfare = ({ allies = [] }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Definição das Tropas baseada nos seus desenhos
    const troops = allies.map((char, i) => ({
      x: 200 + i * 100,
      y: 400,
      char,
      hp: 100,
      // Lógica de classes simples por caractere
      class: char === '水' ? 'curandeiro' : char === '火' ? 'mago' : 'guerreiro'
    }));

    let enemies = [
      { x: 250, y: 50, char: '他', hp: 50 },
      { x: 450, y: 50, char: '妈', hp: 50 }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Desenhar Tropas Aliadas
      troops.forEach(t => {
        // Aura Verde para Curandeiro
        if (t.class === 'curandeiro') {
          ctx.beginPath();
          ctx.arc(t.x, t.y, 60, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
          ctx.fill();
        }
        // Aura Roxa para Mago
        if (t.class === 'mago') {
          ctx.beginPath();
          ctx.arc(t.x, t.y, 60, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
          ctx.fill();
        }

        // Círculo do Personagem
        ctx.beginPath();
        ctx.arc(t.x, t.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t.char, t.x, t.y + 10);
      });

      // Inimigos (Bolas Vermelhas)
      enemies.forEach(en => {
        en.y += 0.5; // Movimento lento para baixo
        ctx.beginPath();
        ctx.arc(en.x, en.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText(en.char, en.x, en.y + 10);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [allies]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-bold mb-4">Combate Lumi (Alpha)</h3>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={500} 
        className="w-full bg-slate-50 border border-slate-200 rounded-lg"
      />
    </div>
  );
};

export default LumiWarfare;