/**
 * src/features/LumiWarfare.jsx
 *
 * Arena de batalha — canvas 2D com cardEngine integrado.
 * O que foi adicionado vs versão anterior:
 *   - Tropas carregam { family, level, baseDamage } do cardEngine
 *   - performAttack usa resolveAttack() local (sem fetch, sem latência)
 *   - Efeitos de família aplicados no gameState:
 *       水 → speedMulti 0.6 (slow visual)
 *       火 → splash em área
 *       木 → shield no castelo
 *       金 → ricochete (lv 3+)
 *       土 → stunFrames nos inimigos
 *       人 → damageBonus passivo
 *       口 → push (empurra inimigo)
 *   - Aura visual ao redor da tropa proporcional ao level (lv2+)
 *   - Indicadores de ricochete (linhas tracejadas ao alvo secundário)
 *   - Castelo com barra de HP à esquerda
 *   - Slot de deck de 8 cartas no rodapé (mostra família + nível)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  LEVEL_SCALE,
  FAMILY_EFFECTS,
  resolveAttack,
  calcDeckSynergies,
} from '../engine/cardEngine.js';

// ─── Mapa visual por família ──────────────────────────────────────────────────
const FAMILY_VISUAL = {
  '水': { color: '#3b9ddd', auraColor: 'rgba(59,157,221,', label: 'Água'   },
  '火': { color: '#e67e22', auraColor: 'rgba(230,126,34,', label: 'Fogo'   },
  '木': { color: '#27ae60', auraColor: 'rgba(39,174,96,',  label: 'Madeira'},
  '金': { color: '#c0c0c0', auraColor: 'rgba(192,192,192,',label: 'Metal'  },
  '土': { color: '#c0834e', auraColor: 'rgba(192,131,78,', label: 'Terra'  },
  '人': { color: '#f1c40f', auraColor: 'rgba(241,196,15,', label: 'Humano' },
  '口': { color: '#9b59b6', auraColor: 'rgba(155,89,182,', label: 'Boca'   },
};

const DEFAULT_VISUAL = { color: '#3b82f6', auraColor: 'rgba(59,130,246,', label: '?' };

// Deck padrão se nenhum for passado via prop
const DEFAULT_DECK = [
  { char: '水', family: '水', level: 3, baseDamage: 12 },
  { char: '火', family: '火', level: 4, baseDamage: 15 },
  { char: '木', family: '木', level: 2, baseDamage: 10 },
  { char: '金', family: '金', level: 5, baseDamage: 18 },
  { char: '土', family: '土', level: 1, baseDamage: 8  },
  { char: '人', family: '人', level: 3, baseDamage: 11 },
  { char: '口', family: '口', level: 2, baseDamage: 9  },
  { char: '山', family: '土', level: 1, baseDamage: 7  },
];

// Horda inimiga inicial
const INITIAL_ENEMIES = [
  { id: 'en_1', char: '他', x: 0.2, y: -50,  hp: 120, maxHp: 120, radius: 26, speed: 0.5 },
  { id: 'en_2', char: '妈', x: 0.8, y: -150, hp: 100, maxHp: 100, radius: 26, speed: 0.6 },
  { id: 'en_3', char: '你', x: 0.5, y: -250, hp: 140, maxHp: 140, radius: 26, speed: 0.4 },
  { id: 'en_4', char: '们', x: 0.35, y: -380, hp: 90,  maxHp: 90,  radius: 22, speed: 0.7 },
];

// ─── Helpers de desenho ───────────────────────────────────────────────────────

function drawHPBar(ctx, x, y, hp, maxHp, width = 44) {
  const h = 6;
  const pct = Math.max(0, hp / maxHp);
  ctx.fillStyle = '#111827';
  ctx.fillRect(x - width / 2, y, width, h);
  ctx.fillStyle = pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(x - width / 2, y, width * pct, h);
}

function drawZigzag(ctx, x1, y1, x2, y2, segments = 6) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mx = x1 + (x2 - x1) * t + (Math.random() * 28 - 14);
    const my = y1 + (y2 - y1) * t + (Math.random() * 28 - 14);
    ctx.lineTo(mx, my);
  }
  ctx.stroke();
}

// ─── Componente ───────────────────────────────────────────────────────────────

const LumiWarfare = ({ deck = DEFAULT_DECK }) => {
  const canvasRef     = useRef(null);
  const containerRef  = useRef(null);
  const [selectedSlot, setSelectedSlot] = useState(0); // carta ativa no deck
  const selectedSlotRef = useRef(0);

  const gameState = useRef({
    troops:       [],
    enemies:      [],
    particles:    [],
    floatingTexts:[],
    projectiles:  [],
    ricochetLines:[],   // { x1,y1,x2,y2, life }
    draggingId:   null,
    pointerX:     0,
    pointerY:     0,
    lastBeat:     0,
    castleHp:     500,
    castleMaxHp:  500,
    synergies:    {},   // calculado uma vez do deck
    wave:         1,
    score:        0,
  });

  // Pre-calcula sinergias do deck
  useEffect(() => {
    gameState.current.synergies = calcDeckSynergies(deck);
  }, [deck]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    let animFrameId;

    const resize = () => {
      canvas.width  = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Inicializa tropas a partir do deck
    gameState.current.troops = deck.slice(0, 4).map((card, i) => {
      const vis = FAMILY_VISUAL[card.family] ?? DEFAULT_VISUAL;
      return {
        id:       `troop_${i}`,
        char:     card.char,
        family:   card.family,
        level:    card.level,
        baseDamage: card.baseDamage,
        color:    vis.color,
        auraColor:vis.auraColor,
        x:        canvas.width / 2 + (i - 1.5) * 130,
        y:        canvas.height - 110,
        hp:       80 + card.level * 20,
        maxHp:    80 + card.level * 20,
        radius:   28 + card.level * 1.5,
        shake:    0,
        trail:    [],
        stunFrames: 0,
        damageBonus: 0,
        shield:   0,
      };
    });

    // Inicializa inimigos com posição relativa ao canvas
    gameState.current.enemies = INITIAL_ENEMIES.map(e => ({
      ...e,
      x:          e.x * canvas.width,
      shake:      0,
      speedMulti: 1,
      stunFrames: 0,
    }));

    // ── Helpers internos ──────────────────────────────────────────────────────

    const spawnParticles = (x, y, color, count = 12) => {
      for (let i = 0; i < count; i++) {
        gameState.current.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.5) * 14,
          life: 1.0,
          color,
          size: Math.random() * 4 + 2,
        });
      }
    };

    const spawnText = (x, y, text, color, isCrit = false) => {
      gameState.current.floatingTexts.push({
        x, y: y - 40,
        text, color,
        life: 1.0, vy: isCrit ? -2 : -1.2,
        isCrit,
      });
    };

    // ── performAttack — usa cardEngine local ──────────────────────────────────
    const performAttack = (troop, primaryTarget) => {
      const card = {
        char:       troop.char,
        family:     troop.family,
        level:      troop.level,
        baseDamage: troop.baseDamage * (1 + (troop.damageBonus ?? 0)),
      };

      // Inimigos vizinhos do alvo primário (para ricochete e efeitos de área)
      const others = gameState.current.enemies
        .filter(e => e.id !== primaryTarget.id)
        .sort((a, b) =>
          Math.hypot(a.x - primaryTarget.x, a.y - primaryTarget.y) -
          Math.hypot(b.x - primaryTarget.x, b.y - primaryTarget.y)
        );

      const { hits, playerMutations } = resolveAttack(
        card, primaryTarget, others, deck, { shield: troop.shield }
      );

      // Aplica hits
      hits.forEach(hit => {
        const enemy = gameState.current.enemies.find(e => e.id === hit.targetId);
        if (!enemy) return;

        enemy.hp    -= hit.damage;
        enemy.shake  = 14;

        const isCrit = hit.type === 'ricochet';
        spawnParticles(enemy.x, enemy.y, isCrit ? troop.auraColor + '0.8)' : '#ef4444', isCrit ? 8 : 12);
        spawnText(enemy.x, enemy.y, `-${hit.damage}${isCrit ? ' ↩' : ''}`,
                  isCrit ? '#fcd34d' : '#f87171', isCrit);

        // Linha de ricochete visual
        if (hit.type === 'ricochet') {
          gameState.current.ricochetLines.push({
            x1: primaryTarget.x, y1: primaryTarget.y,
            x2: enemy.x, y2: enemy.y,
            color: troop.color,
            life: 0.6,
          });
        }
      });

      // Aplica efeitos de família nos inimigos
      const scale = LEVEL_SCALE[card.level] ?? LEVEL_SCALE[1];
      const effectFn = FAMILY_EFFECTS[card.family]?.apply;

      if (card.family === '水') {
        // Slow em todos no raio
        gameState.current.enemies.forEach(en => {
          if (Math.hypot(en.x - primaryTarget.x, en.y - primaryTarget.y) < 140) {
            en.speedMulti = 0.4;
            setTimeout(() => { en.speedMulti = 1; }, 2500);
          }
        });
        spawnText(primaryTarget.x, primaryTarget.y - 20, '❄ SLOW', '#3b9ddd');
      }

      if (card.family === '火' && scale.secondaryEffect) {
        // Splash 40% a todos no raio
        gameState.current.enemies.forEach(en => {
          if (en.id !== primaryTarget.id &&
              Math.hypot(en.x - primaryTarget.x, en.y - primaryTarget.y) < 120) {
            const splash = Math.floor(card.baseDamage * 0.4);
            en.hp -= splash;
            spawnParticles(en.x, en.y, '#e67e22', 6);
            spawnText(en.x, en.y, `-${splash} 🔥`, '#e67e22');
          }
        });
      }

      if (card.family === '土' && scale.secondaryEffect) {
        primaryTarget.stunFrames = 90;
        spawnText(primaryTarget.x, primaryTarget.y - 20, '⚡ STUN', '#c0834e');
      }

      if (card.family === '口' && scale.secondaryEffect) {
        const dx = primaryTarget.x - troop.x;
        const dy = primaryTarget.y - troop.y;
        const dist = Math.hypot(dx, dy) || 1;
        primaryTarget.x += (dx / dist) * 90;
        primaryTarget.y += (dy / dist) * 90;
        spawnText(primaryTarget.x, primaryTarget.y, '💨 PUSH', '#9b59b6');
      }

      if (card.family === '木') {
        // Escudo ao castelo
        gameState.current.castleHp = Math.min(
          gameState.current.castleMaxHp,
          gameState.current.castleHp + 8
        );
        spawnText(80, canvas.height / 2, '+8 🛡', '#27ae60');
      }

      // playerMutations (buff 人)
      if (playerMutations?.damageBonus) {
        gameState.current.troops.forEach(t => {
          t.damageBonus = (t.damageBonus ?? 0) + playerMutations.damageBonus;
        });
      }

      // Projétil visual
      gameState.current.projectiles.push({
        type: card.family === '火' ? 'fire' : card.family === '水' ? 'ice' : 'lightning',
        start: { x: troop.x, y: troop.y },
        end:   { x: primaryTarget.x, y: primaryTarget.y },
        color: troop.color,
        life:  250,
      });
    };

    // ==========================================================================
    // UPDATE LOOP
    // ==========================================================================
    const update = (ts) => {
      const s = gameState.current;

      const BPM      = 110;
      const msPBeat  = 60000 / BPM;
      const beat     = Math.floor(ts / msPBeat);
      const isBeat   = beat > s.lastBeat;
      if (isBeat) s.lastBeat = beat;

      // 人 passivo: damageBonus decai (temporário por 2 beats)
      s.troops.forEach(t => {
        if (t.family !== '人') t.damageBonus = Math.max(0, (t.damageBonus ?? 0) - 0.002);
      });

      // ── Movimento das tropas ────────────────────────────────────────────────
      s.troops.forEach(t => {
        if (t.stunFrames > 0) { t.stunFrames--; return; }

        if (s.draggingId === t.id) {
          t.x = s.pointerX;
          t.y = s.pointerY;
        } else if (s.enemies.length > 0) {
          const target = s.enemies.reduce((p, c) =>
            Math.hypot(c.x - t.x, c.y - t.y) < Math.hypot(p.x - t.x, p.y - t.y) ? c : p
          );
          
          const dx = target.x - t.x;
          const dy = target.y - t.y;
          const dist = Math.hypot(dx, dy);
          
          // Só se move se não estiver muito colado (evita sobrepor o inimigo)
          if (dist > t.radius + target.radius + 15) {
            t.x += dx * 0.025;
            t.y += dy * 0.025;
          }
        }

        // Trava as tropas dentro da tela (evita que fujam da visão do jogador)
        t.x = Math.max(t.radius, Math.min(canvas.width - t.radius, t.x));
        t.y = Math.max(t.radius + 50, Math.min(canvas.height - t.radius - 80, t.y));

        t.trail.push({ x: t.x, y: t.y });
        if (t.trail.length > 12) t.trail.shift();
      });

      // ── Ações rítmicas no BEAT ──────────────────────────────────────────────
      if (isBeat && s.enemies.length > 0) {
        s.troops.forEach(t => {
          if (t.stunFrames > 0) return;

          const target = s.enemies.reduce((p, c) =>
            Math.hypot(c.x - t.x, c.y - t.y) < Math.hypot(p.x - t.x, p.y - t.y) ? c : p
          );
          const dist  = Math.hypot(target.x - t.x, target.y - t.y);
          const range = t.radius + target.radius + 20;

          if (dist < range) performAttack(t, target);
        });

        // Inimigos atacam tropas / castelo
        s.enemies.forEach(en => {
          if (en.stunFrames > 0) return;

          if (s.troops.length > 0) {
            const target = s.troops.reduce((p, c) =>
              Math.hypot(c.x - en.x, c.y - en.y) < Math.hypot(p.x - en.x, p.y - en.y) ? c : p
            );
            const dist = Math.hypot(target.x - en.x, target.y - en.y);
            if (dist < en.radius + target.radius + 10) {
              target.hp -= 12;
              target.shake = 14;
              spawnText(target.x, target.y, '-12', '#ef4444');
            }
          } else {
            // Sem tropas → ataca castelo
            s.castleHp -= 8;
            spawnText(80, canvas.height / 2, '-8', '#ef4444');
          }
        });
      }

      // ── Movimento dos inimigos ──────────────────────────────────────────────
      s.enemies.forEach(en => {
        if (en.stunFrames > 0) { en.stunFrames--; return; }

        let tx = canvas.width / 2;
        let ty = canvas.height;

        if (s.troops.length > 0) {
          const t = s.troops.reduce((p, c) =>
            Math.hypot(c.x - en.x, c.y - en.y) < Math.hypot(p.x - en.x, p.y - en.y) ? c : p
          );
          tx = t.x; ty = t.y;
        }

        const dx  = tx - en.x;
        const dy  = ty - en.y;
        const mag = Math.hypot(dx, dy) || 1;
        const sp  = en.speed * (en.speedMulti ?? 1);

        if (mag > en.radius + 20) {
          en.x += (dx / mag) * sp;
          en.y += (dy / mag) * sp + 0.3;
        }
      });

      // ── Morte de inimigos ───────────────────────────────────────────────────
      s.enemies.forEach(en => {
        if (en.hp <= 0) {
          const vis = FAMILY_VISUAL['火'];
          spawnParticles(en.x, en.y, '#ef4444', 20);
          s.score += 10;
        }
      });
      s.enemies = s.enemies.filter(en => en.hp > 0);

      // ── Progressão de Wave ──────────────────────────────────────────────────
      if (s.enemies.length === 0) {
        s.wave += 1;
        s.score += 50; // Bônus de conclusão da onda
        const waveMult = 1 + (s.wave * 0.25); // Inimigos ficam 25% mais fortes por onda
        
        s.enemies = INITIAL_ENEMIES.map((e, i) => ({
          ...e,
          id: `en_w${s.wave}_${i}`,
          x: canvas.width * e.x + (Math.random() * 80 - 40),
          y: e.y - (Math.random() * 150),
          hp: e.maxHp * waveMult,
          maxHp: e.maxHp * waveMult,
          shake: 0,
          speedMulti: 1,
          stunFrames: 0,
        }));
        spawnText(canvas.width / 2, canvas.height / 2, `WAVE ${s.wave}!`, '#fcd34d', true);
      }

      // ── Morte de tropas ─────────────────────────────────────────────────────
      s.troops.forEach(t => {
        if (t.hp <= 0) spawnParticles(t.x, t.y, t.color, 18);
      });
      s.troops = s.troops.filter(t => t.hp > 0);

      // ── Atualizar efeitos ───────────────────────────────────────────────────
      s.particles.forEach(p  => { p.x += p.vx; p.y += p.vy; p.life -= 0.022; });
      s.particles     = s.particles.filter(p => p.life > 0);

      s.floatingTexts.forEach(ft => { ft.y += ft.vy; ft.life -= 0.022; });
      s.floatingTexts = s.floatingTexts.filter(ft => ft.life > 0);

      s.projectiles.forEach(p  => { p.life -= 16.6; });
      s.projectiles   = s.projectiles.filter(p => p.life > 0);

      s.ricochetLines.forEach(r => { r.life -= 0.04; });
      s.ricochetLines = s.ricochetLines.filter(r => r.life > 0);
    };

    // ==========================================================================
    // DRAW LOOP
    // ==========================================================================
    const draw = (ts) => {
      const s = gameState.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fundo escuro com grid sutil
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // ── Castelo (esquerda) ────────────────────────────────────────────────
      const castleX = 60;
      const castleY = canvas.height / 2 - 60;
      ctx.fillStyle = '#1a1510';
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(castleX - 40, castleY, 80, 120, 6);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#e8e3d8';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏯', castleX, castleY + 60);

      drawHPBar(ctx, castleX, castleY - 14, s.castleHp, s.castleMaxHp, 80);

      ctx.fillStyle = '#5a5850';
      ctx.font = '10px monospace';
      ctx.fillText(`HP ${s.castleHp}`, castleX, castleY - 22);

      // ── Score / Wave ──────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(192,57,43,0.8)';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`WAVE ${s.wave}  SCORE ${s.score}`, 12, 18);

      // ── Trails das tropas ─────────────────────────────────────────────────
      s.troops.forEach(t => {
        if (t.trail.length < 2) return;
        for (let i = 1; i < t.trail.length; i++) {
          ctx.beginPath();
          ctx.moveTo(t.trail[i-1].x, t.trail[i-1].y);
          ctx.lineTo(t.trail[i].x, t.trail[i].y);
          ctx.strokeStyle = `${t.auraColor}${(i / t.trail.length) * 0.5})`;
          ctx.lineWidth = t.radius * (i / t.trail.length) * 0.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      });

      // ── Linhas de ricochete ───────────────────────────────────────────────
      s.ricochetLines.forEach(r => {
        ctx.save();
        ctx.globalAlpha = r.life;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(r.x1, r.y1);
        ctx.lineTo(r.x2, r.y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // ── Projéteis ─────────────────────────────────────────────────────────
      s.projectiles.forEach(p => {
        ctx.save();
        ctx.shadowBlur   = 18;
        ctx.shadowColor  = p.color;
        ctx.strokeStyle  = p.color;
        ctx.lineWidth    = p.type === 'fire' ? 3 : 2;
        ctx.globalAlpha  = Math.min(1, p.life / 100);
        drawZigzag(ctx, p.start.x, p.start.y, p.end.x, p.end.y, p.type === 'ice' ? 3 : 6);
        ctx.restore();
      });

      // ── Tropas ────────────────────────────────────────────────────────────
      s.troops.forEach(t => {
        let dx = 0, dy = 0;
        if (t.shake > 0) {
          dx = (Math.random() - 0.5) * 8;
          dy = (Math.random() - 0.5) * 8;
          t.shake--;
        }
        const tx = t.x + dx;
        const ty = t.y + dy;

        // Aura por nível SRS
        if (t.level >= 2) {
          const pulse   = (Math.sin(ts / 250 + t.x) + 1) / 2;
          const aRadius = t.radius + 20 + t.level * 14 + pulse * 10;
          const opacity = 0.06 + t.level * 0.04;
          ctx.beginPath();
          ctx.arc(tx, ty, aRadius, 0, Math.PI * 2);
          ctx.fillStyle = `${t.auraColor}${opacity})`;
          ctx.fill();

          // Anel externo pulsante (lv4+)
          if (t.level >= 4) {
            ctx.beginPath();
            ctx.arc(tx, ty, aRadius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = `${t.auraColor}${0.3 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // Círculo da tropa
        ctx.beginPath();
        ctx.arc(tx, ty, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = t.color + '33';
        ctx.fill();
        ctx.strokeStyle = t.color;
        ctx.lineWidth = t.level >= 3 ? 2.5 : 1.5;
        ctx.stroke();

        // Caractere
        ctx.fillStyle = '#e8e3d8';
        ctx.font = `bold ${18 + t.level * 2}px "Noto Serif SC", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.char, tx, ty);

        // Nível badge
        ctx.fillStyle = t.color;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`Lv${t.level}`, tx, ty + t.radius + 10);

        drawHPBar(ctx, tx, ty - t.radius - 14, t.hp, t.maxHp, 44);

        // Ícone de stun
        if (t.stunFrames > 0) {
          ctx.font = '14px serif';
          ctx.fillText('⚡', tx + t.radius, ty - t.radius);
        }
      });

      // ── Inimigos ──────────────────────────────────────────────────────────
      s.enemies.forEach(en => {
        let dx = 0, dy = 0;
        if (en.shake > 0) {
          dx = (Math.random() - 0.5) * 8;
          dy = (Math.random() - 0.5) * 8;
          en.shake--;
        }
        const ex = en.x + dx;
        const ey = en.y + dy;

        // Slow glow
        if (en.speedMulti < 1) {
          ctx.beginPath();
          ctx.arc(ex, ey, en.radius + 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59,157,221,0.15)';
          ctx.fill();
        }

        // Stun ring
        if (en.stunFrames > 0) {
          ctx.beginPath();
          ctx.arc(ex, ey, en.radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(192,131,78,0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(ex, ey, en.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a0a0a';
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#e8e3d8';
        ctx.font = '20px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(en.char, ex, ey);

        drawHPBar(ctx, ex, ey - en.radius - 12, en.hp, en.maxHp);
      });

      // ── Partículas ────────────────────────────────────────────────────────
      s.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle   = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ── Textos flutuantes ─────────────────────────────────────────────────
      s.floatingTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle   = ft.color;
        ctx.font        = ft.isCrit ? 'bold 20px monospace' : '15px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
      });
    };

    // ── Game loop ─────────────────────────────────────────────────────────────
    const loop = (ts) => {
      update(ts);
      draw(ts);
      animFrameId = requestAnimationFrame(loop);
    };
    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [deck]);

  // ── Pointer handlers ────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    const hit  = gameState.current.troops.find(t => Math.hypot(t.x - px, t.y - py) < t.radius + 12);
    if (hit) {
      gameState.current.draggingId = hit.id;
      gameState.current.pointerX   = px;
      gameState.current.pointerY   = py;
    } else {
      // SPAWN DE NOVAS TROPAS (Limite máximo de 6 tropas simultâneas)
      if (gameState.current.troops.length < 6) {
        const card = deck[selectedSlotRef.current];
        if (card) {
          const vis = FAMILY_VISUAL[card.family] ?? DEFAULT_VISUAL;
          gameState.current.troops.push({
            id: `troop_${Date.now()}`,
            char: card.char,
            family: card.family,
            level: card.level,
            baseDamage: card.baseDamage,
            color: vis.color,
            auraColor: vis.auraColor,
            x: px,
            y: py,
            hp: 80 + card.level * 20,
            maxHp: 80 + card.level * 20,
            radius: 28 + card.level * 1.5,
            shake: 0,
            trail: [],
            stunFrames: 0,
            damageBonus: 0,
            shield: 0,
          });
          
          // Partículas de spawn
          for (let i = 0; i < 15; i++) {
            gameState.current.particles.push({
              x: px, y: py,
              vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
              life: 1.0, color: vis.color, size: Math.random() * 4 + 2,
            });
          }
        }
      }
    }
  };

  const handlePointerMove = (e) => {
    if (!gameState.current.draggingId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    gameState.current.pointerX = e.clientX - rect.left;
    gameState.current.pointerY = e.clientY - rect.top;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="w-full h-full relative rounded-2xl border border-white/10 bg-ink-950 overflow-hidden shadow-2xl flex flex-col">

      {/* Canvas principal */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
        style={{ bottom: '80px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={()    => { gameState.current.draggingId = null; }}
        onPointerLeave={()  => { gameState.current.draggingId = null; }}
      />

      {/* HUD título */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center">
        <h3 className="text-lg font-bold tracking-widest text-red-400 font-mono drop-shadow">
          ⚔ LUMI WARFARE
        </h3>
        <p className="text-xs text-white/30 mt-0.5 uppercase tracking-wider">
          arraste tropas · poderes automáticos no beat
        </p>
      </div>

      {/* Deck bar — rodapé */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-20 bg-black/70 border-t border-white/10
                      flex items-center gap-2 px-4 overflow-x-auto">
        <span className="text-white/30 text-xs font-mono shrink-0 mr-1">DECK</span>
        {deck.map((card, i) => {
          const vis    = FAMILY_VISUAL[card.family] ?? DEFAULT_VISUAL;
          const active = selectedSlot === i;
          return (
            <button
              key={i}
              onClick={() => { setSelectedSlot(i); selectedSlotRef.current = i; }}
              style={{
                border: `1.5px solid ${active ? vis.color : 'rgba(255,255,255,0.1)'}`,
                background: active ? `${vis.auraColor}0.15)` : 'rgba(0,0,0,0.4)',
                color: vis.color,
                boxShadow: active ? `0 0 10px ${vis.color}55` : 'none',
              }}
              className="shrink-0 w-14 h-14 rounded flex flex-col items-center justify-center
                         transition-all cursor-pointer"
            >
              <span style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 900 }}>
                {card.char}
              </span>
              <span style={{ fontSize: 9, opacity: 0.7, fontFamily: 'monospace' }}>
                Lv{card.level}
              </span>
            </button>
          );
        })}
        <div className="ml-auto shrink-0 text-right">
          <p className="text-white/20 text-xs font-mono">sinergias ativas</p>
          {Object.entries(calcDeckSynergies(deck).synergyBonuses)
            .filter(([, v]) => v > 0)
            .map(([fam, bonus]) => {
              const vis = FAMILY_VISUAL[fam] ?? DEFAULT_VISUAL;
              return (
                <span key={fam} className="inline-block text-xs font-mono mr-2"
                      style={{ color: vis.color }}>
                  {fam} +{Math.round(bonus * 100)}%
                </span>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default LumiWarfare;