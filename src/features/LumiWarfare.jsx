import React, { useEffect, useRef, useState } from 'react';

const LumiWarfare = ({ allies = ['人', '水', '火'] }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Usamos ref para o estado do jogo para não disparar re-renderizações no React a 60fps
  const gameState = useRef({
    troops: [],
    enemies: [],
    particles: [],     // Array de partículas das explosões
    floatingTexts: [], // Textos flutuantes
    projectiles: [],   // Array dos raios e ataques
    draggingId: null,
    pointerX: 0,
    pointerY: 0,
    lastBeat: 0        // Controle do BPM (Sincronia rítmica)
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
        shake: 0,
        class: isHealer ? 'healer' : isMage ? 'mage' : 'warrior',
        trail: [], // Histórico de posições
        lastAttack: 0,
        lastHeal: 0,
        damageMultiplier: 1
      };
    });

    // Spawn de Horda Inimiga
    gameState.current.enemies = [
      { id: 'en_1', char: '他', x: canvas.width * 0.2, y: -50, hp: 120, maxHp: 120, radius: 25, shake: 0 },
      { id: 'en_2', char: '妈', x: canvas.width * 0.8, y: -150, hp: 120, maxHp: 120, radius: 25, shake: 0 },
      { id: 'en_3', char: '你', x: canvas.width * 0.5, y: -250, hp: 120, maxHp: 120, radius: 25, shake: 0 }
    ];

    // --- HELPER DE PARTÍCULAS ---
    const spawnParticles = (x, y, color, count) => {
      for(let i = 0; i < count; i++) {
        gameState.current.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12,
          life: 1.0,
          color,
          size: Math.random() * 4 + 2
        });
      }
    };

    // --- FUNÇÃO DE ATAQUE (Fetch) ---
    const performAttack = async (attacker, target) => {
      try {
        const res = await fetch('/api/game/attack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attackerId: attacker.char, targetId: target.char, baseDamage: 10 })
        });
        const data = await res.json();
        
        if (data.success) {
          const { damage, isSynergy } = data.data;
          const finalDamage = Math.round(damage * attacker.damageMultiplier);
          target.hp -= finalDamage;
          target.shake = 15; // Camera/Impact Shake de 15 frames

          if (isSynergy) {
            spawnParticles(target.x, target.y, '#fcd34d', 15); // Explosão Dourada
            gameState.current.floatingTexts.push({
              x: target.x + (Math.random() * 20 - 10), y: target.y - 40,
              text: `⚡ CRÍTICO! -${finalDamage}`, color: '#fcd34d', life: 1.0, vy: -1.5, isCrit: true
            });
          } else {
            gameState.current.floatingTexts.push({
              x: target.x + (Math.random() * 20 - 10), y: target.y - 40,
              text: `-${finalDamage}`, color: '#f87171', life: 1.0, vy: -1, isCrit: false
            });
          }
        }
      } catch (err) {
        console.error("Erro no ataque:", err);
      }
    };

    // =======================================================
    // 1. UPDATE LOOP (Apenas Lógica e Física)
    // =======================================================
    const update = (timestamp) => {
      const state = gameState.current;
      
      // Sincronia Rítmica (BPM do jogo: 120 Batidas por Minuto)
      const BPM = 120;
      const msPerBeat = 60000 / BPM; 
      const currentBeat = Math.floor(timestamp / msPerBeat);
      const isBeat = currentBeat > state.lastBeat;
      if (isBeat) state.lastBeat = currentBeat;

      // 1. Atualizar Tropas (Movimento e IA de Perseguição Suave)
      state.troops.forEach(t => {
        if (state.draggingId === t.id) {
          t.x = state.pointerX;
          t.y = state.pointerY;
        } else if (state.enemies.length > 0) {
          // IA: Buscar inimigo mais próximo
          const target = state.enemies.reduce((prev, curr) => 
            Math.hypot(curr.x - t.x, curr.y - t.y) < Math.hypot(prev.x - t.x, prev.y - t.y) ? curr : prev
          );
          // Smooth Pursuit (Lerp)
          const speed = 0.03;
          t.x += (target.x - t.x) * speed;
          t.y += (target.y - t.y) * speed;
        }

        t.damageMultiplier = 1; // Reseta buff do mago

        // Rastro Histórico para o Guerreiro
        if (t.class === 'warrior') {
          t.trail.push({ x: t.x, y: t.y });
          if (t.trail.length > 10) t.trail.shift(); // Guarda só as últimas 10 posições
        }
      });

      state.troops.forEach(mage => {
        if (mage.class === 'mage') {
          state.troops.forEach(ally => {
            if (Math.hypot(ally.x - mage.x, ally.y - mage.y) < 150) {
              ally.damageMultiplier = 1.5;
            }
          });
        }
      });

      // Ações Rítmicas sincronizadas no BEAT
      if (isBeat) {
        state.troops.forEach(t => {
          if (t.class === 'healer') {
            state.troops.forEach(ally => {
              if (ally.hp < ally.maxHp && Math.hypot(ally.x - t.x, ally.y - t.y) < 120) {
                ally.hp = Math.min(ally.maxHp, ally.hp + 12);
                state.floatingTexts.push({ x: ally.x, y: ally.y - 40, text: '+12', color: '#4ade80', life: 1.0, vy: -1 });
              }
            });
          } else if (state.enemies.length > 0) { // Guerreiros e Magos atacam
            const target = state.enemies.reduce((prev, curr) => 
              Math.hypot(curr.x - t.x, curr.y - t.y) < Math.hypot(prev.x - t.x, prev.y - t.y) ? curr : prev
            );
            const dist = Math.hypot(target.x - t.x, target.y - t.y);
            const range = t.class === 'mage' ? 200 : t.radius + target.radius + 15;
            
            if (dist < range) {
              if (t.class === 'mage') {
                // Dispara o raio projeta para a fila de renderização (Vida de 200ms)
                state.projectiles.push({ type: 'lightning', start: {x: t.x, y: t.y}, end: {x: target.x, y: target.y}, life: 200 });
              }
              performAttack(t, target);
            }
          }
        });

        // NOVO: Inimigos agora atacam as tropas!
        state.enemies.forEach(en => {
          if (state.troops.length > 0) {
            const target = state.troops.reduce((prev, curr) => 
              Math.hypot(curr.x - en.x, curr.y - en.y) < Math.hypot(prev.x - en.x, prev.y - en.y) ? curr : prev
            );
            const dist = Math.hypot(target.x - en.x, target.y - en.y);
            const range = en.radius + target.radius + 10;
            
            if (dist < range) {
              target.hp -= 15; // Inimigo bate tirando 15 de vida
              target.shake = 15;
              state.floatingTexts.push({
                x: target.x + (Math.random() * 20 - 10), y: target.y - 40,
                text: `-15`, color: '#ef4444', life: 1.0, vy: -1, isCrit: false
              });
            }
          }
        });
      }

      // 2. Atualizar Inimigos (Agora eles perseguem as tropas ativamente)
      state.enemies.forEach(en => {
        let targetX = canvas.width / 2;
        let targetY = canvas.height;
        
        if (state.troops.length > 0) {
          const target = state.troops.reduce((prev, curr) => 
            Math.hypot(curr.x - en.x, curr.y - en.y) < Math.hypot(prev.x - en.x, prev.y - en.y) ? curr : prev
          );
          targetX = target.x;
          targetY = target.y;
        }

        const dx = targetX - en.x;
        const dy = targetY - en.y;
        const distToTarget = Math.hypot(dx, dy);
        
        // Só anda se não estiver encostado (evita que fiquem exatamente em cima um do outro)
        if (distToTarget > en.radius + 20) {
          en.x += (dx / distToTarget) * 0.4;
          en.y += (dy / distToTarget) * 0.4 + 0.5;
        }
      });

      // Gerenciar Mortes (Explosão de Partículas)
      state.enemies.forEach(en => {
        if (en.hp <= 0) spawnParticles(en.x, en.y, '#ef4444', 20);
      });
      state.enemies = state.enemies.filter(en => en.hp > 0);

      // NOVO: Gerenciar Mortes das suas Tropas
      state.troops.forEach(t => {
        if (t.hp <= 0) spawnParticles(t.x, t.y, '#3b82f6', 20);
      });
      state.troops = state.troops.filter(t => t.hp > 0);

      // 3. Atualizar Efeitos (Física de Partículas e Textos)
      state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; });
      state.particles = state.particles.filter(p => p.life > 0);

      state.floatingTexts.forEach(ft => { 
        ft.y -= 1.2; // Sobe suavemente
        ft.life -= 0.02; // Fade out 
      });
      state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);

      state.projectiles.forEach(p => { p.life -= 16.6; }); // -1 frame
      state.projectiles = state.projectiles.filter(p => p.life > 0);
    };

    // =======================================================
    // 2. DRAW LOOP (Apenas Renderização Visual)
    // =======================================================
    const draw = (timestamp) => {
      const state = gameState.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Helper interno para HP Bars
      const drawHPBar = (x, y, hp, maxHp) => {
        const width = 40; const height = 6; const percent = Math.max(0, hp / maxHp);
        ctx.fillStyle = '#111827'; ctx.fillRect(x - width/2, y, width, height); // Bg preto sólido
        ctx.fillStyle = percent > 0.5 ? '#10b981' : percent > 0.2 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(x - width/2, y, width * percent, height);
      };

      // 1. DRAW TROPAS ALIADAS (Rainbow Trails e Auras)
      state.troops.filter(t => t.class === 'warrior').forEach(t => {
        if (t.trail.length > 1) {
          for(let i = 1; i < t.trail.length; i++) {
            ctx.beginPath();
            ctx.moveTo(t.trail[i-1].x, t.trail[i-1].y);
            ctx.lineTo(t.trail[i].x, t.trail[i].y);
            ctx.strokeStyle = `hsla(${(i * 20 + timestamp / 2) % 360}, 100%, 60%, ${i / t.trail.length})`;
            ctx.lineWidth = t.radius * (i / t.trail.length); // Afina no final
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }
      });

      state.troops.forEach(t => {
        // Efeito de tremor para a tropa sofrendo dano
        let drawX = t.x; 
        let drawY = t.y;
        if (t.shake > 0) {
          drawX += (Math.random() - 0.5) * 8;
          drawY += (Math.random() - 0.5) * 8;
          t.shake--;
        }

        if (t.class === 'healer') {
          const pulse = (Math.sin(timestamp / 200) + 1) / 2;
          ctx.beginPath();
          ctx.arc(drawX, drawY, 60 + pulse * 60, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(74, 222, 128, ${(1 - pulse) * 0.3})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (t.class === 'mage') {
          ctx.beginPath();
          ctx.arc(drawX, drawY, 150, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(drawX, drawY, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = t.class === 'healer' ? '#10b981' : t.class === 'mage' ? '#9333ea' : '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = '#ffffff20';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 26px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.char, drawX, drawY);

        drawHPBar(drawX, drawY - 45, t.hp, t.maxHp);
      });

      // 2. DRAW PROJÉTEIS (Lightning Jagged Lines)
      state.projectiles.forEach(p => {
        if (p.type === 'lightning') {
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#a855f7';
          ctx.beginPath();
          ctx.moveTo(p.start.x, p.start.y);
          
          let currentX = p.start.x;
          let currentY = p.start.y;
          for (let i = 0; i < 6; i++) {
            currentX += (p.end.x - currentX) / (6 - i) + (Math.random() * 30 - 15);
            currentY += (p.end.y - currentY) / (6 - i) + (Math.random() * 30 - 15);
            ctx.lineTo(currentX, currentY);
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset
        }
      });

      // 3. DRAW INIMIGOS (com Shake de Colisão)
      state.enemies.forEach(en => {
        let drawX = en.x; let drawY = en.y;
        if (en.shake > 0) {
          drawX += (Math.random() - 0.5) * 8; // Efeito Tremor
          drawY += (Math.random() - 0.5) * 8;
          en.shake--;
        }

        ctx.beginPath();
        ctx.arc(drawX, drawY, en.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#7f1d1d';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '22px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(en.char, drawX, drawY);
        
        drawHPBar(drawX, drawY - 40, en.hp, en.maxHp);
      });

      // 4. DRAW PARTÍCULAS E TEXTOS (Juice UI)
      state.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      state.floatingTexts.forEach(ft => {
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.font = ft.isCrit ? 'bold 22px Arial' : '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;
      });
    };

    // =======================================================
    // ENGINE HEARTBEAT
    // =======================================================
    const loop = (timestamp) => {
      update(timestamp);
      draw(timestamp);

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