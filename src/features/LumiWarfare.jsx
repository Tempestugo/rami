import React, { useEffect, useRef, useState } from 'react';

const LumiWarfare = ({ allies = ['人', '水', '火'] }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Usamos ref para o estado do jogo para não disparar re-renderizações no React a 60fps
  const gameState = useRef({
    troops: [],
    enemies: [],
    floatingTexts: [],
    draggingId: null,
    pointerX: 0,
    pointerY: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Ajusta o canvas para o tamanho da div pai
    const resize = () => {
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Configuração Inicial de Tropas Aliadas
    gameState.current.troops = allies.map((char, i) => {
      const isHealer = char === '水' || char === '醫' || char === '艹';
      const isMage = char === '心' || char === '火' || char === '言';
      
      return {
        id: `troop_${i}`,
        char,
        x: canvas.width / 2 + (i - Math.floor(allies.length / 2)) * 120,
        y: canvas.height - 100,
        hp: 100,
        maxHp: 100,
        radius: 30,
        class: isHealer ? 'healer' : isMage ? 'mage' : 'warrior',
        trail: [], // Rastro para os guerreiros
        lastAttack: 0,
        lastHeal: 0,
        damageMultiplier: 1
      };
    });

    // Spawn de Horda Inimiga
    gameState.current.enemies = [
      { id: 'en_1', char: '他', x: canvas.width * 0.2, y: -50, hp: 120, maxHp: 120, radius: 25 },
      { id: 'en_2', char: '妈', x: canvas.width * 0.8, y: -150, hp: 120, maxHp: 120, radius: 25 },
      { id: 'en_3', char: '你', x: canvas.width * 0.5, y: -250, hp: 120, maxHp: 120, radius: 25 }
    ];

    // --- FUNÇÃO DE ATAQUE (Fetch) ---
    const performAttack = async (attacker, target) => {
      try {
        const res = await fetch('/api/game/attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attackerHanzi: attacker.char, targetHanzi: target.char })
        });
        const data = await res.json();
        
        if (data.success) {
          const finalDamage = data.damage * attacker.damageMultiplier;
          target.hp -= finalDamage;

          // Adiciona texto flutuante de dano
          gameState.current.floatingTexts.push({
            x: target.x + (Math.random() * 20 - 10),
            y: target.y - target.radius,
            text: data.isEffective ? `⚡ SINERGIA! -${finalDamage}` : `-${finalDamage}`,
            color: data.isEffective ? '#fcd34d' : '#f87171',
            life: 1.0,
            isCrit: data.isEffective
          });
        }
      } catch (err) {
        console.error("Erro no ataque:", err);
      }
    };

    // Helper: Desenhar Barra de HP
    const drawHPBar = (x, y, hp, maxHp) => {
      const width = 40;
      const height = 6;
      const percent = Math.max(0, hp / maxHp);
      ctx.fillStyle = '#374151';
      ctx.fillRect(x - width/2, y, width, height);
      ctx.fillStyle = percent > 0.5 ? '#10b981' : percent > 0.2 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(x - width/2, y, width * percent, height);
    };

    // --- LOOP PRINCIPAL ---
    const loop = (timestamp) => {
      const state = gameState.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. UPDATE TROPAS E AURAS
      state.troops.forEach(t => {
        if (state.draggingId === t.id) {
          t.x = state.pointerX;
          t.y = state.pointerY;
        }
        t.damageMultiplier = 1;

        if (t.class === 'warrior') {
          t.trail.push({ x: t.x, y: t.y, time: timestamp });
          t.trail = t.trail.filter(pt => timestamp - pt.time < 400); // 400ms trace
        }
      });

      // Auras Mago (+50% Dano para aliados)
      state.troops.forEach(mage => {
        if (mage.class === 'mage') {
          state.troops.forEach(ally => {
            if (Math.hypot(ally.x - mage.x, ally.y - mage.y) < 150) {
              ally.damageMultiplier = 1.5;
            }
          });
        }
      });

      // Auras Curandeiro (+5 HP)
      state.troops.forEach(healer => {
        if (healer.class === 'healer' && timestamp - healer.lastHeal > 1500) {
          let healedSomeone = false;
          state.troops.forEach(ally => {
            if (ally.hp < ally.maxHp && Math.hypot(ally.x - healer.x, ally.y - healer.y) < 120) {
              ally.hp = Math.min(ally.maxHp, ally.hp + 5);
              state.floatingTexts.push({ x: ally.x, y: ally.y - ally.radius, text: '+5', color: '#4ade80', life: 1.0 });
              healedSomeone = true;
            }
          });
          if (healedSomeone) healer.lastHeal = timestamp;
        }
      });

      // 2. UPDATE INIMIGOS E COLISÕES
      state.enemies.forEach(en => {
        // Inimigos caem suavemente
        const dx = (canvas.width / 2) - en.x;
        const dy = canvas.height - en.y;
        const distToCenter = Math.hypot(dx, dy);
        
        if (distToCenter > 10) {
          en.x += (dx / distToCenter) * 0.4;
          en.y += (dy / distToCenter) * 0.4 + 0.5;
        }

        // Colisão / Ataque
        state.troops.forEach(t => {
          if (Math.hypot(t.x - en.x, t.y - en.y) < (t.radius + en.radius + 15)) {
            if (timestamp - t.lastAttack > 1200) { // Cooldown de ataque
              t.lastAttack = timestamp;
              performAttack(t, en);
            }
          }
        });
      });

      state.enemies = state.enemies.filter(en => en.hp > 0);

      // 3. DRAW TROPAS ALIADAS
      state.troops.filter(t => t.class === 'warrior').forEach(t => {
        if (t.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(t.trail[0].x, t.trail[0].y);
          for(let i = 1; i < t.trail.length; i++) ctx.lineTo(t.trail[i].x, t.trail[i].y);
          ctx.strokeStyle = `hsla(${(timestamp / 5) % 360}, 100%, 60%, 0.5)`;
          ctx.lineWidth = t.radius;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      });

      state.troops.forEach(t => {
        if (t.class === 'healer') {
          const pulse = (Math.sin(timestamp / 200) + 1) / 2;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 60 + pulse * 60, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(74, 222, 128, ${(1 - pulse) * 0.3})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (t.class === 'mage') {
          ctx.beginPath();
          ctx.arc(t.x, t.y, 150, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = t.class === 'healer' ? '#10b981' : t.class === 'mage' ? '#9333ea' : '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff20';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 26px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.char, t.x, t.y);

        drawHPBar(t.x, t.y - t.radius - 12, t.hp, t.maxHp);
      });

      // 4. DRAW INIMIGOS
      state.enemies.forEach(en => {
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#7f1d1d';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '22px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(en.char, en.x, en.y);
        
        drawHPBar(en.x, en.y - en.radius - 12, en.hp, en.maxHp);
      });

      // 5. DRAW TEXTOS DE DANO/CURA
      state.floatingTexts.forEach(ft => {
        ft.y -= 1.5;
        ft.life -= 0.015;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.font = ft.isCrit ? 'bold 22px Arial' : '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
      });
      state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [allies]);

  // --- INTERAÇÕES DRAG & DROP ---
  const handlePointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const clickedTroop = gameState.current.troops.find(t => Math.hypot(t.x - px, t.y - py) < t.radius + 10);
    if (clickedTroop) {
      gameState.current.draggingId = clickedTroop.id;
      gameState.current.pointerX = px;
      gameState.current.pointerY = py;
    }
  };

  const handlePointerMove = (e) => {
    if (!gameState.current.draggingId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    gameState.current.pointerX = e.clientX - rect.left;
    gameState.current.pointerY = e.clientY - rect.top;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-2xl border border-white/10 bg-ink-900 overflow-hidden shadow-2xl flex flex-col items-center">
      <div className="absolute top-4 z-10 pointer-events-none text-center fade-up">
        <h3 className="text-xl font-display text-gold-300 font-bold tracking-widest drop-shadow-md">⚔️ LUMI WARFARE</h3>
        <p className="text-ink-400 text-xs mt-1 uppercase">Arraste seus aliados para o combate</p>
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => gameState.current.draggingId = null}
        onPointerLeave={() => gameState.current.draggingId = null}
      ></canvas>
    </div>
  );
};

export default LumiWarfare;