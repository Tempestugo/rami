import React, { useEffect, useRef, useState } from 'react';

const LumiWarfare = ({ allies = ['人', '水'] }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Estado do Jogo
    const troops = allies.map((char, i) => ({
      x: 200 + i * 100,
      y: 300,
      char,
      type: char === '水' ? 'healer' : 'warrior',
      hp: 100
    }));

    let enemies = [
      { x: Math.random() * 800, y: 0, char: '他', hp: 50 },
      { x: Math.random() * 800, y: 0, char: '妈', hp: 50 }
    ];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Desenhar Tropas (Aliados)
      troops.forEach(t => {
        // Aura do Healer
        if (t.type === 'healer') {
          ctx.beginPath();
          ctx.arc(t.x, t.y, 60, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(t.x, t.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#4A90E2';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(t.char, t.x - 10, t.y + 7);
      });

      // Mover e Desenhar Inimigos (Bolas Vermelhas)
      enemies.forEach(en => {
        en.y += 1; // Inimigos descem a tela
        
        ctx.beginPath();
        ctx.arc(en.x, en.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#FF4D4D';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText(en.char, en.x - 10, en.y + 7);

        // Lógica simples de colisão: Se chegar perto da tropa, ataca
        troops.forEach(t => {
          const dist = Math.hypot(t.x - en.x, t.y - en.y);
          if (dist < 50) {
            console.log(`Batalha: ${t.char} vs ${en.char}`);
            // Aqui chamaria a API de ataque que criamos
          }
        });
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [allies]);

  return (
    <div className="battle-arena flex flex-col items-center justify-center h-full w-full bg-ink-950 text-white z-50 absolute inset-0">
      <h3 className="mb-4 text-2xl font-display text-gold-300">⚔️ Lumi Warfare: Primeira Batalha</h3>
      <canvas ref={canvasRef} width={800} height={500} style={{ border: '2px solid rgba(255,255,255,0.1)', borderRadius: '10px', backgroundColor: '#111827' }} />
    </div>
  );
};

export default LumiWarfare;
