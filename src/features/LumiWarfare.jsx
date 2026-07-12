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

const FAMILY_POWERS = {
  '水': 'Água: Lentidão',
  '火': 'Fogo: Área (Splash)',
  '木': 'Madeira: Cura Castelo',
  '金': 'Metal: Muito Dano',
  '土': 'Terra: Atordoa (Stun)',
  '人': 'Humano: Tiro Veloz',
  '口': 'Boca: Empurra Inimigo',
  '女': 'Mulher: Dano Base'
};

const FAMILY_DETAILS = {
  '水': { title: 'Lentidão (Água)', desc: 'Concede uma energia congelante aos ataques, reduzindo a velocidade de movimento do alvo inimigo pela metade durante alguns segundos. Excelente tática de controle (Crowd Control).' },
  '火': { title: 'Dano em Área (Fogo)', desc: 'Projéteis explodem ao impacto, causando dano de queimadura (Splash) a todos os inimigos que estiverem ao redor do alvo principal.' },
  '木': { title: 'Cura da Base (Madeira)', desc: 'Focado em restauração. A cada golpe profundo, as forças da natureza regeneram a vida e a estrutura do seu castelo.' },
  '金': { title: 'Perfurante (Metal)', desc: 'Golpes pesados e afiados que possuem a capacidade "Pierce". Eles atravessam a armadura e machucam os inimigos imediatamente atrás.' },
  '土': { title: 'Atordoamento (Terra)', desc: 'Ataques massivos contundentes. Existe uma alta chance de atordoar o inimigo com o impacto, paralisando-o completamente por instantes.' },
  '人': { title: 'Velocidade Humana (Humano)', desc: 'A essência da adaptabilidade humana. Torres desta classe não possuem magias mirabolantes, mas disparam com incrível frequência e agilidade.' },
  '口': { title: 'Sopro ou Grito (Boca)', desc: 'Ao atacar, sopros mágicos empurram fisicamente o inimigo alguns passos para trás na pista, destruindo o timing do exército invasor.' },
  '女': { title: 'Dano Bruto (Mulher)', desc: 'Torres excepcionalmente fortes na base, com poder de fogo puro altíssimo. Excelente opção para derreter chefes (Bosses) duros.' }
};

const SHOP_CARDS = [
  { char: '我', family: '人', level: 3, baseDamage: 12, cost: 60 },
  { char: '学', family: '口', level: 4, baseDamage: 15, cost: 100 },
  { char: '了', family: '土', level: 2, baseDamage: 10, cost: 35 },
  { char: '水', family: '水', level: 5, baseDamage: 18, cost: 150 },
  { char: '很', family: '人', level: 1, baseDamage: 8,  cost: 15 },
  { char: '好', family: '女', level: 3, baseDamage: 11, cost: 60 },
  { char: '吃', family: '口', level: 2, baseDamage: 9,  cost: 35 },
  { char: '饭', family: '口', level: 1, baseDamage: 7,  cost: 15 },
];

const INITIAL_ENEMIES = [
  { id: 'en_1', char: '他', dist: 0,  hp: 150, maxHp: 150, radius: 26, speed: 1.1, layers: ['人', '也'] },
  { id: 'en_2', char: '妈', dist: -120, hp: 120, maxHp: 120, radius: 26, speed: 1.4, layers: ['女', '马'] },
  { id: 'en_3', char: '你', dist: -260, hp: 180, maxHp: 180, radius: 28, speed: 0.9, layers: ['人', '尔'] },
  { id: 'en_4', char: '们', dist: -380, hp: 100, maxHp: 100, radius: 22, speed: 1.8, layers: ['人', '门'] },
];

// ─── Helpers de Geometria do TD ───────────────────────────────────────────────
const MAPS = [
  {
    id: 1,
    name: 'O Caminho de Bambu',
    getWaypoints: (w, h) => [
      { x: -40, y: h * 0.15 }, { x: w * 0.85, y: h * 0.15 }, { x: w * 0.85, y: h * 0.85 }, { x: w * 0.15, y: h * 0.85 }, { x: -40, y: h * 0.85 }
    ],
    getSlots: (w, h) => [
      { id: 0, x: w * 0.35, y: h * 0.35, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 1, x: w * 0.45, y: h * 0.35, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 2, x: w * 0.55, y: h * 0.35, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 3, x: w * 0.35, y: h * 0.65, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 4, x: w * 0.45, y: h * 0.65, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 5, x: w * 0.55, y: h * 0.65, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 6, x: w * 0.70, y: h * 0.50, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
    ]
  },
  {
    id: 2,
    name: 'Curva do Dragão',
    getWaypoints: (w, h) => [
      { x: -40, y: h * 0.5 }, { x: w * 0.3, y: h * 0.5 }, { x: w * 0.3, y: h * 0.2 }, { x: w * 0.7, y: h * 0.2 }, { x: w * 0.7, y: h * 0.8 }, { x: w + 40, y: h * 0.8 }
    ],
    getSlots: (w, h) => [
      { id: 0, x: w * 0.5, y: h * 0.35, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 1, x: w * 0.5, y: h * 0.65, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 2, x: w * 0.15, y: h * 0.35, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 3, x: w * 0.15, y: h * 0.65, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 4, x: w * 0.85, y: h * 0.35, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 5, x: w * 0.85, y: h * 0.65, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
    ]
  },
  {
    id: 3,
    name: 'Portão da Muralha',
    getWaypoints: (w, h) => [
      { x: w * 0.5, y: -40 }, { x: w * 0.5, y: h + 40 }
    ],
    getSlots: (w, h) => [
      { id: 0, x: w * 0.35, y: h * 0.25, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 1, x: w * 0.65, y: h * 0.25, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 2, x: w * 0.35, y: h * 0.5,  content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 3, x: w * 0.65, y: h * 0.5,  content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 4, x: w * 0.35, y: h * 0.75, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
      { id: 5, x: w * 0.65, y: h * 0.75, content: null, shake: 0, targetMode: 'first', cooldown: 0 },
    ]
  }
];

const getStanceMultipliers = (mode) => {
   switch(mode) {
     case 'last': return { range: 1.4, damage: 0.7 };
     case 'strong': return { range: 0.8, damage: 1.5 };
     case 'close': return { range: 0.6, damage: 1.2, speed: 1.5 };
     case 'first':
     default: return { range: 1.0, damage: 1.0, speed: 1.0 };
   }
};

// ─── Helpers de Desenho ───────────────────────────────────────────────────────
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

// ─── Componente Principal ─────────────────────────────────────────────────────
const LumiWarfare = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [phase, setPhase] = useState('worldMap');
  const [currentMapId, setCurrentMapId] = useState(1);
  const [prevPhase, setPrevPhase] = useState('setup');
  const [selectedShopCard, setSelectedShopCard] = useState(null);
  const [selectedTowerSlotId, setSelectedTowerSlotId] = useState(null);
  const [moneyReact, setMoneyReact] = useState(200);
  const [activeDeck, setActiveDeck] = useState([]);
  const [uiTick, setUiTick] = useState(0);
  
  const phaseRef = useRef(phase);
  const mapIdRef = useRef(currentMapId);
  
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { mapIdRef.current = currentMapId; }, [currentMapId]);
  
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Estado mutável para alta performance no requestAnimationFrame
  const gameState = useRef({
    slots: [],
    waypoints: [],
    pathSegments: [],
    totalPathLength: 0,
    enemies: [],
    links: [], // { from: slotId, to: slotId, valid: boolean }
    particles: [],
    floatingTexts: [],
    projectiles: [],
    ricochetLines: [],
    
    dragState: {
      active: false,
      type: null,
      sourceId: null,
      x: 0, y: 0
    },
    selectedSlotId: null,

    lastBeat: 0,
    lastTs: 0,
    castleHp: 500,
    castleMaxHp: 500,
    wave: 1,
    score: 0,
    money: 200,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    let animFrameId;

    const resize = () => {
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      canvas.width = w;
      canvas.height = h;

      const s = gameState.current;
      const mapConfig = MAPS.find(m => m.id === mapIdRef.current) || MAPS[0];
      s.waypoints = mapConfig.getWaypoints(w, h);
      
      // Atualiza as posições dos slots existentes (preserva o conteúdo)
      const newSlots = mapConfig.getSlots(w, h);
      if (s.slots.length === 0) {
        s.slots = newSlots;
      } else {
        newSlots.forEach((nSl, idx) => {
          if(s.slots[idx]) {
            s.slots[idx].x = nSl.x;
            s.slots[idx].y = nSl.y;
          }
        });
      }
      
      // Calculate path segments
      s.pathSegments = [];
      s.totalPathLength = 0;
      for (let i = 0; i < s.waypoints.length - 1; i++) {
        const dx = s.waypoints[i+1].x - s.waypoints[i].x;
        const dy = s.waypoints[i+1].y - s.waypoints[i].y;
        const len = Math.hypot(dx, dy);
        s.pathSegments.push({ len, dx, dy, start: s.waypoints[i] });
        s.totalPathLength += len;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Init enemies
    gameState.current.enemies = INITIAL_ENEMIES.map(e => ({
      ...e,
      x: -100, y: -100,
      shake: 0,
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

    // ── performAttack (adaptado para slots) ─────────────
    const performAttack = (slot, primaryTarget) => {
      const tContent = slot.content;
      const stance = getStanceMultipliers(slot.targetMode);
      const card = {
        char: tContent.char,
        family: tContent.family,
        level: tContent.level,
        baseDamage: (tContent.baseDamage + (tContent.damageUpgrade || 0)) * (1 + (tContent.damageBonus ?? 0)) * stance.damage,
      };

      const others = gameState.current.enemies
        .filter(e => e.id !== primaryTarget.id)
        .sort((a, b) =>
          Math.hypot(a.x - primaryTarget.x, a.y - primaryTarget.y) -
          Math.hypot(b.x - primaryTarget.x, b.y - primaryTarget.y)
        );

      const { hits, playerMutations } = resolveAttack(
        card, primaryTarget, others, activeDeck, { shield: tContent.shield ?? 0 }
      );

      hits.forEach(hit => {
        const enemy = gameState.current.enemies.find(e => e.id === hit.targetId);
        if (!enemy) return;

        enemy.hp -= hit.damage;
        enemy.shake = 14;

        const isCrit = hit.type === 'ricochet';
        spawnParticles(enemy.x, enemy.y, isCrit ? tContent.auraColor + '0.8)' : '#ef4444', isCrit ? 8 : 12);
        spawnText(enemy.x, enemy.y, `-${hit.damage}${isCrit ? ' ↩' : ''}`,
                  isCrit ? '#fcd34d' : '#f87171', isCrit);

        if (hit.type === 'ricochet') {
          gameState.current.ricochetLines.push({
            x1: primaryTarget.x, y1: primaryTarget.y,
            x2: enemy.x, y2: enemy.y,
            color: tContent.color,
            life: 0.6,
          });
        }
      });

      const scale = LEVEL_SCALE[card.level] ?? LEVEL_SCALE[1];
      
      if (card.family === '水') {
        gameState.current.enemies.forEach(en => {
          if (Math.hypot(en.x - primaryTarget.x, en.y - primaryTarget.y) < 140) {
            en.speedMulti = 0.4;
            setTimeout(() => { en.speedMulti = 1; }, 2500);
          }
        });
        spawnText(primaryTarget.x, primaryTarget.y - 20, ' SLOW', '#3b9ddd');
      }

      if (card.family === '火' && scale.secondaryEffect) {
        gameState.current.enemies.forEach(en => {
          if (en.id !== primaryTarget.id && Math.hypot(en.x - primaryTarget.x, en.y - primaryTarget.y) < 120) {
            const splash = Math.floor(card.baseDamage * 0.4);
            en.hp -= splash;
            spawnParticles(en.x, en.y, '#e67e22', 6);
            spawnText(en.x, en.y, `-${splash} `, '#e67e22');
          }
        });
      }

      if (card.family === '土' && scale.secondaryEffect) {
        primaryTarget.stunFrames = 90;
        spawnText(primaryTarget.x, primaryTarget.y - 20, ' STUN', '#c0834e');
      }

      if (card.family === '口' && scale.secondaryEffect) {
        primaryTarget.dist = Math.max(0, primaryTarget.dist - 50);
        spawnText(primaryTarget.x, primaryTarget.y, ' PUSH', '#9b59b6');
      }

      if (card.family === '木') {
        gameState.current.castleHp = Math.min(gameState.current.castleMaxHp, gameState.current.castleHp + 8);
        spawnText(canvas.width - 80, canvas.height / 2, '+8 ', '#27ae60');
      }

      if (playerMutations?.damageBonus) {
        gameState.current.slots.forEach(sl => {
          if(sl.content) sl.content.damageBonus = (sl.content.damageBonus ?? 0) + playerMutations.damageBonus;
        });
      }

      gameState.current.projectiles.push({
        type: card.family === '火' ? 'fire' : card.family === '水' ? 'ice' : 'lightning',
        start: { x: slot.x, y: slot.y },
        end:   { x: primaryTarget.x, y: primaryTarget.y },
        color: tContent.color,
        life:  250,
      });
    };

    // ==========================================================================
    // UPDATE LOOP
    // ==========================================================================
    const update = (ts) => {
      const s = gameState.current;
      const dt = s.lastTs ? (ts - s.lastTs) : 16;
      s.lastTs = ts;

      const BPM = 110;
      const msPBeat = 60000 / BPM;
      const beat = Math.floor(ts / msPBeat);
      const isBeat = beat > s.lastBeat;
      if (isBeat) s.lastBeat = beat;

      s.slots.forEach(slot => {
        if (slot.content && slot.content.family !== '人') {
          slot.content.damageBonus = Math.max(0, (slot.content.damageBonus ?? 0) - 0.002);
        }
      });

      // ── Combate Baseado em Cooldown ─────────────────────────────────────────
      if (s.enemies.length > 0) {
        s.slots.forEach(slot => {
          if (!slot.content || slot.content.stunFrames > 0) return;
          
          if (slot.cooldown > 0) {
            slot.cooldown -= dt;
            return;
          }

          const stance = getStanceMultipliers(slot.targetMode);
          const range = (180 + (slot.content.level * 10) + (slot.content.rangeUpgrade || 0)) * stance.range;
          const targetsInRange = s.enemies.filter(en => en.dist > 0 && Math.hypot(en.x - slot.x, en.y - slot.y) < range + en.radius);
          
          if (targetsInRange.length > 0) {
            let target;
            const mode = slot.targetMode || 'first';
            if (mode === 'first') {
              target = targetsInRange.reduce((prev, curr) => (curr.dist > prev.dist) ? curr : prev);
            } else if (mode === 'last') {
              target = targetsInRange.reduce((prev, curr) => (curr.dist < prev.dist) ? curr : prev);
            } else if (mode === 'strong') {
              target = targetsInRange.reduce((prev, curr) => (curr.hp > prev.hp) ? curr : prev);
            } else if (mode === 'close') {
              target = targetsInRange.reduce((prev, curr) => {
                const dPrev = Math.hypot(prev.x - slot.x, prev.y - slot.y);
                const dCurr = Math.hypot(curr.x - slot.x, curr.y - slot.y);
                return (dCurr < dPrev) ? curr : prev;
              });
            }

            performAttack(slot, target);
            slot.cooldown = (1500 - (slot.content.level * 150)) / stance.speed;
            if (isBeat) slot.cooldown *= 0.8; // Bônus de beat: recarga mais rápida
          }
        });
      }

      // ── Movimento dos inimigos ─────────────────────────────────
      s.enemies.forEach(en => {
        if (en.stunFrames > 0) { en.stunFrames--; return; }

        en.dist += (en.speed * (en.speedMulti ?? 1));

        let d = en.dist;
        if (d >= s.totalPathLength) {
          s.castleHp -= 20;
          spawnText(canvas.width - 60, canvas.height * 0.8, '-20', '#ef4444');
          en.hp = 0; 
        } else if (d < 0) {
           // still waiting outside
        } else {
          for (let seg of s.pathSegments) {
            if (d <= seg.len) {
              en.x = seg.start.x + (seg.dx / seg.len) * d;
              en.y = seg.start.y + (seg.dy / seg.len) * d;
              break;
            }
            d -= seg.len;
          }
        }
      });

      s.enemies.forEach(en => {
        if (en.hp <= 0 && en.dist > 0 && en.dist < s.totalPathLength) { 
          spawnParticles(en.x, en.y, '#ef4444', 20);
          s.score += 10;
          s.money += 5;
          
          // Spawn layers
          if (en.layers && en.layers.length > 0) {
            en.layers.forEach((layerChar, idx) => {
              s.enemies.push({
                id: `en_layer_${Date.now()}_${idx}`,
                char: layerChar,
                dist: Math.max(0, en.dist - (idx * 20)),
                hp: en.maxHp * 0.4,
                maxHp: en.maxHp * 0.4,
                radius: en.radius * 0.7,
                speed: en.speed * 1.5,
                shake: 0,
                speedMulti: 1,
                stunFrames: 0,
                x: en.x, y: en.y
              });
            });
          }
        }
      });
      s.enemies = s.enemies.filter(en => en.hp > 0);

      // ── Progressão de Wave ──────────────────────────────────────────────────
      if (s.enemies.length === 0) {
        s.wave += 1;
        s.score += 50; 
        const waveMult = 1 + (s.wave * 0.3); 
        
        s.enemies = INITIAL_ENEMIES.map((e, i) => ({
          ...e,
          id: `en_w${s.wave}_${i}`,
          dist: e.dist, 
          hp: e.maxHp * waveMult,
          maxHp: e.maxHp * waveMult,
          shake: 0,
          speedMulti: 1,
          stunFrames: 0,
        }));
        spawnText(canvas.width / 2, canvas.height / 2, `WAVE ${s.wave}!`, '#fcd34d', true);
      }

      s.slots.forEach(sl => { if (sl.shake > 0) sl.shake--; });
      
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

      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (s.waypoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(s.waypoints[0].x, s.waypoints[0].y);
        for (let i=1; i<s.waypoints.length; i++) {
          ctx.lineTo(s.waypoints[i].x, s.waypoints[i].y);
        }
        ctx.strokeStyle = '#1e1b18';
        ctx.lineWidth = 60;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.strokeStyle = '#2d2824';
        ctx.lineWidth = 56;
        ctx.stroke();
      }

      const endPoint = s.waypoints[s.waypoints.length - 1];
      if (endPoint) {
        ctx.fillStyle = '#1a1510';
        ctx.beginPath();
        ctx.arc(endPoint.x - 30, endPoint.y, 40, 0, Math.PI*2);
        ctx.fill();
        drawHPBar(ctx, endPoint.x - 30, endPoint.y - 50, s.castleHp, s.castleMaxHp, 80);
      }

      // ── Ligações Sintáticas (Synergy Links) ──────────────────────────────────
      s.links.forEach(l => {
        const fromSl = s.slots.find(sl => sl.id === l.from);
        const toSl = s.slots.find(sl => sl.id === l.to);
        if (!fromSl || !toSl) return;

        const isTrue = l.type === 'true';

        ctx.beginPath();
        ctx.moveTo(fromSl.x, fromSl.y);
        ctx.lineTo(toSl.x, toSl.y);
        
        if (isTrue) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'; // Ouro 
          ctx.lineWidth = 6;
          ctx.setLineDash([]);
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fbbf24';
        } else {
          ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)'; // Azul Neutro
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 5]);
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Ponto luminoso animado suave deslizando pela linha (fluxo de energia)
        const dx = toSl.x - fromSl.x;
        const dy = toSl.y - fromSl.y;
        const dist = Math.hypot(dx, dy);
        const speed = isTrue ? 0.04 : 0.02;
        const pct = (ts * speed % 100) / 100;
        
        if (dist > 60) {
           const ax = fromSl.x + dx * pct;
           const ay = fromSl.y + dy * pct;
           ctx.beginPath();
           ctx.arc(ax, ay, 4, 0, Math.PI * 2);
           ctx.fillStyle = isTrue ? '#fbbf24' : '#60a5fa';
           ctx.shadowBlur = 10;
           ctx.shadowColor = ctx.fillStyle;
           ctx.fill();
           ctx.shadowBlur = 0;
        }
      });

      if (s.dragState.active && s.dragState.type === 'LINK') {
        const fromSl = s.slots.find(sl => sl.id === s.dragState.sourceId);
        if (fromSl) {
          ctx.beginPath();
          ctx.moveTo(fromSl.x, fromSl.y);
          ctx.lineTo(s.dragState.x, s.dragState.y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ── Tower Slots ─────────────────────────────────────────────────────────
      s.slots.forEach(sl => {
        let dx = 0, dy = 0;
        if (sl.shake > 0) {
          dx = (Math.random() - 0.5) * 8;
          dy = (Math.random() - 0.5) * 8;
        }
        const tx = sl.x + dx;
        const ty = sl.y + dy;

        // Desenhar indicador de Range para a torre selecionada no Side Panel
        if (sl.content && s.selectedSlotId === sl.id) {
          ctx.beginPath();
          const stance = getStanceMultipliers(sl.targetMode);
          const range = (180 + (sl.content.level * 10) + (sl.content.rangeUpgrade || 0)) * stance.range;
          ctx.arc(sl.x, sl.y, range, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(tx, ty, 32, 0, Math.PI * 2);
        if (sl.content) {
          const vis = FAMILY_VISUAL[sl.content.family] ?? DEFAULT_VISUAL;
          const isLinkedAndValid = s.links.some(l => (l.from === sl.id || l.to === sl.id) && l.valid);
          
          if (isLinkedAndValid) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = vis.color + '44';
          } else {
            ctx.fillStyle = vis.color + '22';
          }
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = vis.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#e8e3d8';
          ctx.font = `bold ${18 + sl.content.level * 2}px "Noto Serif SC", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sl.content.char, tx, ty);
          
          ctx.fillStyle = vis.color;
          ctx.font = 'bold 9px monospace';
          const dmgBoost = sl.content.damageBonus > 0 ? ` +${Math.round(sl.content.damageBonus*100)}%` : '';
          ctx.fillText(`Lv${sl.content.level}${dmgBoost}`, tx, ty + 32 + 10);
          
          ctx.fillStyle = '#9ca3af';
          ctx.fillText(sl.targetMode.toUpperCase(), tx, ty - 32 - 10);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      s.ricochetLines.forEach(r => {
        ctx.save(); ctx.globalAlpha = r.life; ctx.strokeStyle = r.color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke(); ctx.restore();
      });

      s.projectiles.forEach(p => {
        ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = p.color; ctx.strokeStyle = p.color; ctx.lineWidth = p.type === 'fire' ? 3 : 2; ctx.globalAlpha = Math.min(1, p.life / 100); drawZigzag(ctx, p.start.x, p.start.y, p.end.x, p.end.y, p.type === 'ice' ? 3 : 6); ctx.restore();
      });

      s.enemies.forEach(en => {
        if(en.dist < 0) return;
        let dx = 0, dy = 0;
        if (en.shake > 0) { dx = (Math.random() - 0.5) * 8; dy = (Math.random() - 0.5) * 8; }
        const ex = en.x + dx; const ey = en.y + dy;

        if (en.speedMulti < 1) { ctx.beginPath(); ctx.arc(ex, ey, en.radius + 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(59,157,221,0.15)'; ctx.fill(); }
        if (en.stunFrames > 0) { ctx.beginPath(); ctx.arc(ex, ey, en.radius + 8, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(192,131,78,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }

        ctx.beginPath(); ctx.arc(ex, ey, en.radius, 0, Math.PI * 2); ctx.fillStyle = '#1a0a0a'; ctx.fill();
        ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#e8e3d8'; ctx.font = '20px "Noto Serif SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(en.char, ex, ey);
        drawHPBar(ctx, ex, ey - en.radius - 12, en.hp, en.maxHp);
      });

      s.particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life); ctx.fill(); ctx.globalAlpha = 1; });
      s.floatingTexts.forEach(ft => { ctx.globalAlpha = Math.max(0, ft.life); ctx.fillStyle = ft.color; ctx.font = ft.isCrit ? 'bold 20px monospace' : '15px monospace'; ctx.textAlign = 'center'; ctx.fillText(ft.text, ft.x, ft.y); ctx.globalAlpha = 1; });
      
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 22px "Noto Serif SC", serif';
      ctx.textAlign = 'right';
      ctx.fillText(`¥ ${s.money}`, canvas.width - 20, 36);

      if (s.dragState.active && s.dragState.type === 'SHOP') {
        const card = s.dragState.sourceCard;
        if (card) {
          const vis = FAMILY_VISUAL[card.family] ?? DEFAULT_VISUAL;
          ctx.beginPath(); ctx.arc(s.dragState.x, s.dragState.y, 32, 0, Math.PI*2);
          ctx.fillStyle = vis.color + '88'; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = `bold 24px "Noto Serif SC", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(card.char, s.dragState.x, s.dragState.y);
        }
      }
    };

    // ── Game loop ─────────────────────────────────────────────────────────────
    const loop = (ts) => {
      if (phaseRef.current === 'playing') {
        update(ts);
      }
      draw(ts);
      animFrameId = requestAnimationFrame(loop);
    };
    animFrameId = requestAnimationFrame(loop);

    const onGlobalUp = (e) => {
      if (gameState.current.dragState.active) {
         handlePointerUp(e);
      }
    };
    
    const onGlobalMove = (e) => {
      const s = gameState.current;
      if (s.dragState.active) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
           s.dragState.x = e.clientX - rect.left;
           s.dragState.y = e.clientY - rect.top;
        }
      }
    };
    
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('pointermove', onGlobalMove, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('pointermove', onGlobalMove);
    };
  }, [activeDeck]);

  // ── Drag & Drop + Link Logic ────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    const s = gameState.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const clickedSlot = s.slots.find(sl => Math.hypot(sl.x - px, sl.y - py) < 32);
    if (clickedSlot && clickedSlot.content) {
      s.dragState = { active: true, type: 'LINK', sourceId: clickedSlot.id, x: px, y: py, startX: px, startY: py };
    }
  };

  const handlePointerMove = (e) => {
    const s = gameState.current;
    if (!s.dragState.active) return;
    const rect = canvasRef.current.getBoundingClientRect();
    s.dragState.x = e.clientX - rect.left;
    s.dragState.y = e.clientY - rect.top;
  };

  const updateGraphSynergies = async () => {
    const s = gameState.current;
    
    // Reseta status dos links e dos bônus de dano para reconstruir do zero
    s.slots.forEach(sl => {
      if (sl.content) sl.content.damageBonus = 0;
    });
    s.links.forEach(l => l.type = 'neutral');

    // Encontra as "Raízes" da frase (Início de leitura) - Tem arestas saindo, e nenhuma entrando.
    const allTails = s.links.map(l => l.to);
    const roots = s.slots.filter(sl => sl.content && !allTails.includes(sl.id) && s.links.some(l => l.from === sl.id));
    
    // Função recursiva com prevenção de Loop infinito
    const getChains = (nodeId, currentChain) => {
      const outgoing = s.links.filter(l => l.from === nodeId);
      if (outgoing.length === 0) return [currentChain];
      let allPaths = [];
      for(let out of outgoing) {
         if (currentChain.some(c => c.node === out.to)) {
             allPaths.push(currentChain);
             continue;
         }
         allPaths.push(...getChains(out.to, [...currentChain, { node: out.to, link: out }]));
      }
      return allPaths;
    };

    const localFallback = ['我吃', '吃饭', '饭了', '我吃饭', '吃饭了', '我吃饭了', '学了', '我学', '我学了', '学习', '你好', '很好', '水好', '喝水', '吃了', '吃水'];

    for(let root of roots) {
       const chains = getChains(root.id, [{ node: root.id, link: null }]);
       
       for(let chain of chains) {
          const phrase = chain.map(c => s.slots.find(x => x.id === c.node)?.content?.char || '').join('');
          if (phrase.length < 2) continue;
          
          let isValid = false;
          try {
            const res = await fetch('/api/phrases/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phrase })
            });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const text = await res.text();
            if (text.startsWith('<')) throw new Error("Vite 404 Intercept (HTML Returned)");
            const data = JSON.parse(text);
            isValid = data.valid;
          } catch(err) {
             console.error('API Fail Safely Handled:', err.message);
          }
          
          // O Fallback Independente blinda o app contra quedas de rede!
          if (!isValid) {
             isValid = localFallback.includes(phrase);
          }
          
          if (isValid) {
             chain.forEach(c => {
               if (c.link) c.link.type = 'true';
               const sl = s.slots.find(x => x.id === c.node);
               if (sl && sl.content) {
                 sl.content.damageBonus = Math.max(sl.content.damageBonus || 0, 1.5);
               }
             });
             // Mensagem visual no topo da raiz (opcional)
             s.floatingTexts.push({ x: root.x, y: root.y - 40, text: 'SYNERGY!', color: '#fbbf24', life: 1, vy: -1, isCrit: true });
          } else {
             chain.forEach(c => {
               const sl = s.slots.find(x => x.id === c.node);
               if (sl && sl.content) {
                 sl.content.damageBonus = Math.max(sl.content.damageBonus || 0, 0.15);
               }
             });
          }
       }
    }
  };

  const handlePointerUp = (e) => {
    const s = gameState.current;
    if (!s.dragState.active) return;

    let px = 0, py = 0;
    if (canvasRef.current && e.clientX !== undefined) {
       const rect = canvasRef.current.getBoundingClientRect();
       px = e.clientX - rect.left;
       py = e.clientY - rect.top;
    } else {
       px = s.dragState.x;
       py = s.dragState.y;
    }

    // Detectando um "Clique Limpo" na torre para abrir o Painel Lateral
    const dist = Math.hypot(px - (s.dragState.startX || px), py - (s.dragState.startY || py));
    if (s.dragState.type === 'LINK' && dist < 30) {
      const slot = s.slots.find(sl => sl.id === s.dragState.sourceId);
      if (slot && slot.content) {
         s.dragState.active = false;
         s.selectedSlotId = slot.id;
         setSelectedTowerSlotId(slot.id);
         // Não causamos mais pause setPhase('towerModal'), o jogo segue rodando!
         return;
      }
    }

    // Aumento da tolerância (hitbox) para o Drag & Drop de torres: 75 pixels (super generoso)
    const dropSlot = s.slots.find(sl => Math.hypot(sl.x - px, sl.y - py) < 75);

    if (s.dragState.type === 'SHOP') {
      if (dropSlot && !dropSlot.content) {
        if (moneyReact >= s.dragState.sourceCard.cost) {
          setMoneyReact(m => m - s.dragState.sourceCard.cost);
          gameState.current.money -= s.dragState.sourceCard.cost;
          dropSlot.content = { ...s.dragState.sourceCard, damageBonus: 0 };
          
          for (let i = 0; i < 15; i++) {
            s.particles.push({
              x: dropSlot.x, y: dropSlot.y,
              vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
              life: 1.0, color: FAMILY_VISUAL[dropSlot.content.family]?.color || '#fff', size: Math.random() * 4 + 2,
            });
          }
        } else {
           gameState.current.floatingTexts.push({ x: px, y: py, text: 'SEM DINHEIRO', color: '#f87171', life: 1, vy: -1, isCrit: true });
        }
      }
    } else if (s.dragState.type === 'LINK') {
      if (dropSlot && dropSlot.content && dropSlot.id !== s.dragState.sourceId) {
        const exists = s.links.some(l => 
          (l.from === s.dragState.sourceId && l.to === dropSlot.id) ||
          (l.from === dropSlot.id && l.to === s.dragState.sourceId)
        );
        if (!exists) {
          const newLink = { from: s.dragState.sourceId, to: dropSlot.id, type: 'neutral' };
          s.links.push(newLink);
          updateGraphSynergies();
        }
      }
    }

    s.dragState.active = false;
  };

  const startDragShop = (e, card) => {
    e.preventDefault(); // Impede o drag nativo irritante do navegador
    const s = gameState.current;
    if (moneyReact < card.cost) return; 
    
    const rect = canvasRef.current.getBoundingClientRect();
    s.dragState = {
      active: true,
      type: 'SHOP',
      sourceCard: card,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  if (phase === 'worldMap') {
    return (
      <div className="w-full h-screen bg-ink-900 flex flex-col items-center justify-center text-white p-8">
        <h1 className="text-5xl font-display font-bold text-gold-400 mb-12 tracking-widest uppercase">Select Region</h1>
        <div className="flex gap-6 max-w-4xl flex-wrap justify-center">
           {MAPS.map(m => (
             <button 
               key={m.id}
               onClick={() => { setCurrentMapId(m.id); setPhase('setup'); }}
               className="bg-ink-800 hover:bg-ink-700 border-2 border-ink-700 hover:border-gold-500 rounded-xl p-8 flex flex-col items-center justify-center transition-all hover:scale-105 shadow-xl group min-w-[240px]"
             >
                <div className="w-16 h-16 bg-black/40 rounded-full mb-4 flex items-center justify-center group-hover:bg-gold-500/20 text-2xl font-bold font-mono text-white/50 group-hover:text-gold-400">
                  {m.id}
                </div>
                <h3 className="text-xl font-bold">{m.name}</h3>
             </button>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-2xl border border-white/10 bg-ink-950 overflow-hidden shadow-2xl flex flex-col">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair active:cursor-grabbing touch-none"
        style={{ bottom: '80px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { gameState.current.dragState.active = false; }}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center">
        <h3 className="text-lg font-bold tracking-widest text-gold-400 font-mono drop-shadow">
           TOWER DEFENSE
        </h3>
        <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wider">
          arraste cartas para os círculos • ligue torres para formar frases
        </p>
      </div>

      {phase === 'setup' && (
        <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-auto bg-ink-900/95 border-t-2 border-gold-500/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex-none max-w-[200px] text-left hidden md:block">
            <h2 className="text-xl font-bold text-yellow-400 font-display mb-1 tracking-wider drop-shadow-md">ARMAMENTO</h2>
            <p className="text-gray-300 mb-2 text-xs leading-tight">Arraste as peças pro tabuleiro.</p>
            <div className="inline-block bg-black/60 border border-yellow-500/50 px-3 py-1 rounded text-yellow-400 font-mono font-bold shadow-inner">
               Saldo: ¥ {moneyReact}
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap justify-center shrink-0">
            {SHOP_CARDS.map((card, i) => {
              const vis = FAMILY_VISUAL[card.family] || DEFAULT_VISUAL;
              return (
                <div key={i} className="relative">
                  <button
                    onPointerDown={(e) => startDragShop(e, card)}
                    disabled={moneyReact < card.cost}
                    className="relative w-16 h-20 rounded border flex flex-col items-center justify-center transition-all bg-ink-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink-700 hover:-translate-y-1 touch-none select-none"
                    style={{ borderColor: vis.color, color: vis.color, cursor: moneyReact >= card.cost ? 'grab' : 'not-allowed' }}
                  >
                    <span className="font-bold text-2xl font-display pointer-events-none drop-shadow-md">{card.char}</span>
                    <span className="text-[8px] leading-[1.1] text-center w-full px-1 font-mono opacity-90 mt-1 pointer-events-none break-words">
                       {FAMILY_POWERS[card.family]?.split(':')[1]}
                    </span>
                    <span className="absolute -bottom-2 text-[10px] font-bold bg-black/90 border border-yellow-500/50 px-2 py-0.5 rounded text-yellow-400 pointer-events-none">¥ {card.cost}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedShopCard(card); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 border border-white/30 rounded-full flex items-center justify-center text-xs text-white/80 hover:bg-white hover:text-black hover:scale-110 transition z-10"
                    title="Ver Detalhes do Ideograma"
                  >
                    <span className="font-serif font-bold italic text-[10px]">i</span>
                  </button>
                </div>
              );
            })}
          </div>
          
          <div className="flex-none text-right">
             <button
              onClick={() => {
                setPhase('playing');
              }}
              className="px-6 py-4 md:px-8 md:py-5 font-display font-black text-lg md:text-xl rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.4)] transition bg-yellow-500 hover:bg-yellow-400 text-black border-2 border-yellow-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              INICIAR ONDA
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE INFORMAÇÕES DA CARTA (SHOP) */}
      {selectedShopCard && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 pointer-events-auto touch-auto" onClick={() => setSelectedShopCard(null)}>
           <div 
             className="bg-ink-900 border-2 rounded-xl max-w-sm w-full p-8 text-center text-white shadow-2xl relative"
             style={{ borderColor: FAMILY_VISUAL[selectedShopCard.family]?.color || '#fff' }}
             onClick={(e) => e.stopPropagation()}
           >
             <button onClick={() => setSelectedShopCard(null)} className="absolute top-4 right-4 text-white/50 hover:text-white">✖</button>
             <div 
                className="w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center mb-4 bg-black/40"
                style={{ borderColor: FAMILY_VISUAL[selectedShopCard.family]?.color || '#fff', color: FAMILY_VISUAL[selectedShopCard.family]?.color || '#fff' }}
             >
                <span className="text-5xl font-display font-bold">{selectedShopCard.char}</span>
             </div>
             
             <h3 className="text-2xl font-bold mb-1" style={{ color: FAMILY_VISUAL[selectedShopCard.family]?.color || '#fff' }}>
                {FAMILY_DETAILS[selectedShopCard.family]?.title || 'Torre Arcana'}
             </h3>
             <div className="flex justify-center gap-4 text-xs font-mono text-ink-300 mb-6">
                <span>DANO: {selectedShopCard.baseDamage}</span>
                <span>NÍVEL: {selectedShopCard.level}</span>
                <span className="text-gold-400">CUSTO: ¥ {selectedShopCard.cost}</span>
             </div>
             
             <p className="text-sm text-ink-200 text-left leading-relaxed bg-ink-800 p-4 rounded-lg border border-white/5">
                {FAMILY_DETAILS[selectedShopCard.family]?.desc || 'Um ideograma ancestral sem especialidade mágica conhecida.'}
             </p>
           </div>
        </div>
      )}

      {/* TOWER ACTION MENU (PAINEL LATERAL ESTILO BTD) */}
      {selectedTowerSlotId && (() => {
        const slot = gameState.current.slots.find(s => s.id === selectedTowerSlotId);
        if(!slot || !slot.content) return null;
        
        const cardRef = SHOP_CARDS.find(c => c.char === slot.content.char);
        const refundValue = cardRef ? Math.floor(cardRef.cost * 0.8) : 20;
        const damageBuff = (slot.content.damageBonus || 0) * 100;
        const rangeBoost = slot.content.rangeUpgrade || 0;
        const dmgBoost = slot.content.damageUpgrade || 0;
        
        const rangeUpgradeCost = 40 + (rangeBoost);
        const dmgUpgradeCost = 50 + (dmgBoost * 2);

        const changeMode = (m) => {
           slot.targetMode = m;
           setUiTick(t => t + 1); // Força re-render para mostrar o botão ativo e o raio imediatamente
           gameState.current.floatingTexts.push({ x: slot.x, y: slot.y - 40, text: m.toUpperCase(), color: '#fbbf24', life: 1, vy: -1, isCrit: false });
        };
        
        return (
          <div 
             className="absolute top-0 right-0 h-full w-80 bg-ink-900 border-l-2 border-white/10 shadow-2xl z-40 flex flex-col pointer-events-auto touch-auto slide-in-right"
             style={{ borderLeftColor: FAMILY_VISUAL[slot.content.family]?.color || '#fff' }}
             onClick={(e) => e.stopPropagation()}
          >
                  <button onClick={() => { s.selectedSlotId = null; setSelectedTowerSlotId(null); }} className="absolute top-4 left-4 text-white/50 hover:text-white text-2xl font-bold">✖</button>
             
             <div className="p-6 flex-1 overflow-y-auto">
               <h3 className="text-xl font-bold font-display mt-8 mb-1 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ color: FAMILY_VISUAL[slot.content.family]?.color || '#fff' }}>{slot.content.char}</span>
                  <span className="text-white/50 text-sm">Nível {slot.content.level}</span>
               </h3>
               
               <div className="text-center mb-6">
                 {damageBuff > 0 && (
                   <p className="text-gold-400 text-[11px] font-mono font-bold bg-gold-400/10 inline-block px-3 py-1 rounded-full border border-gold-400/20">
                     SINTAXE: +{Math.round(damageBuff)}% Dano
                   </p>
                 )}
               </div>

               {/* UPGRADES IN-GAME */}
               <div className="bg-ink-800 p-4 rounded-lg mb-4 text-left border border-white/5">
                 <p className="text-xs text-white/50 font-bold mb-3 uppercase tracking-wider">Upgrades de Combate</p>
                 
                 <button 
                    disabled={moneyReact < rangeUpgradeCost}
                    onClick={() => {
                       if (moneyReact >= rangeUpgradeCost) {
                         setMoneyReact(m => m - rangeUpgradeCost);
                         gameState.current.money -= rangeUpgradeCost;
                         slot.content.rangeUpgrade = (slot.content.rangeUpgrade || 0) + 30;
                         setUiTick(t => t + 1); // Força render do painel e canvas
                         gameState.current.floatingTexts.push({ x: slot.x, y: slot.y - 40, text: 'RAIO AMPLIADO!', color: '#a78bfa', life: 1, vy: -1, isCrit: false });
                       }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded mb-2 bg-ink-700 hover:bg-ink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                 >
                    <div className="text-left">
                       <p className="font-bold text-sm text-purple-300">Expansão de Raio</p>
                       <p className="text-[10px] text-white/60">Aumenta o alcance da torre</p>
                    </div>
                    <span className="text-gold-400 font-bold text-xs bg-black/40 px-2 py-1 rounded">¥{rangeUpgradeCost}</span>
                 </button>

                 <button 
                    disabled={moneyReact < dmgUpgradeCost}
                    onClick={() => {
                       if (moneyReact >= dmgUpgradeCost) {
                         setMoneyReact(m => m - dmgUpgradeCost);
                         gameState.current.money -= dmgUpgradeCost;
                         slot.content.damageUpgrade = (slot.content.damageUpgrade || 0) + 15;
                         gameState.current.floatingTexts.push({ x: slot.x, y: slot.y - 40, text: 'PODER AUMENTADO!', color: '#f87171', life: 1, vy: -1, isCrit: true });
                       }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded bg-ink-700 hover:bg-ink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                 >
                    <div className="text-left">
                       <p className="font-bold text-sm text-red-300">Força Bruta</p>
                       <p className="text-[10px] text-white/60">Aumenta o dano base</p>
                    </div>
                    <span className="text-gold-400 font-bold text-xs bg-black/40 px-2 py-1 rounded">¥{dmgUpgradeCost}</span>
                 </button>
               </div>
               
               <div className="bg-ink-800 p-4 rounded-lg mb-4 text-left">
                 <p className="text-xs text-white/50 font-bold mb-2 uppercase tracking-wider">Modo de Mira</p>
                 <div className="grid grid-cols-2 gap-2">
                   {['first', 'last', 'strong', 'close'].map(m => {
                      const isActive = slot.targetMode === m || (!slot.targetMode && m === 'first');
                      return (
                        <button 
                          key={m}
                          onClick={() => changeMode(m)}
                          className={`py-2 px-1 text-[11px] font-bold rounded border transition flex flex-col items-center justify-center ${isActive ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-ink-900 border-white/10 text-white/50 hover:bg-ink-700'}`}
                        >
                          <span>{m === 'first' ? 'Primeiro' : m === 'last' ? 'Último' : m === 'strong' ? 'Sniper' : 'Protetor'}</span>
                          {isActive && m === 'strong' && <span className="text-[9px] text-indigo-200 mt-1">+Dano -Raio</span>}
                          {isActive && m === 'last' && <span className="text-[9px] text-indigo-200 mt-1">-Dano +Raio</span>}
                          {isActive && m === 'close' && <span className="text-[9px] text-indigo-200 mt-1">+Speed -Raio</span>}
                        </button>
                      );
                   })}
                 </div>
               </div>
             </div>

             <div className="p-4 bg-ink-950 border-t border-white/10">
                <button 
                  onClick={() => {
                    setMoneyReact(m => m + refundValue);
                    gameState.current.money += refundValue;
                    slot.content = null;
                    gameState.current.links = gameState.current.links.filter(l => l.from !== slot.id && l.to !== slot.id);
                    gameState.current.slots.forEach(s => { if(s.content) s.content.damageBonus = 0; });
                    gameState.current.links.forEach(l => l.type = 'neutral');
                    
                    gameState.current.floatingTexts.push({ x: slot.x, y: slot.y - 20, text: `+¥${refundValue}`, color: '#10b981', life: 1, vy: -1, isCrit: true });
                    s.selectedSlotId = null;
                    setSelectedTowerSlotId(null);
                  }}
                  className="w-full py-3 bg-red-600/80 hover:bg-red-500 border border-red-400 text-white font-bold rounded transition flex items-center justify-center gap-2"
                >
                  <span>VENDER TORRE</span>
                  <span className="bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono">+¥{refundValue}</span>
                </button>
             </div>
          </div>
        );
      })()}

      {/* BOTÃO LATERAL DE AJUDA E PAUSA */}
      {phase === 'playing' && (
        <button 
          onClick={() => setPhase('help')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-2 border-indigo-400 hover:bg-indigo-500 transition hover:scale-110"
          title="Ajuda e Pausa"
        >
          ❓
        </button>
      )}

      {/* MODAL DE TUTORIAL (PAUSADO) */}
      {phase === 'help' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 pointer-events-auto touch-auto">
           <div className="bg-ink-900 border-2 border-indigo-500 rounded-xl max-w-2xl w-full p-8 text-left text-white shadow-2xl relative">
              <h2 className="text-3xl font-display font-bold text-indigo-400 mb-6">Como Jogar?</h2>
              
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <h3 className="text-xl font-bold text-gold-300">1. O Batalhão e o Tempo Infinito</h3>
                  <p className="text-ink-200 mt-1 text-sm leading-relaxed">Quando a tela mostrar a <strong>Loja</strong>, os inimigos não avançarão! Você pode gastar suas moedas para comprar os ideogramas (torres) e posicioná-los calmamente nos círculos do tabuleiro. Quando o seu esquadrão estiver pronto, clique em "Iniciar Onda". Para vender uma torre no mapa, arraste-a para fora dos círculos (Você recebe 80% do valor de volta).</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gold-300">2. Elos Direcionais (Sinergias Reais)</h3>
                  <p className="text-ink-200 mt-1 text-sm leading-relaxed mb-3">Você pode conectar duas torres (que já possuam cartas) clicando e arrastando de uma para a outra. A setinha aponta a direção da leitura! Veja a diferença na energia visual e no bônus multiplicador quando o ELO funciona com sentido:</p>
                  
                  <div className="flex flex-col gap-4 mt-2">
                    {/* ELO NEUTRO (FRACASSO) */}
                    <div className="flex flex-col items-center bg-black/40 p-4 rounded-xl border border-white/10">
                      <div className="flex items-center gap-1">
                         <div className="w-12 h-12 rounded-full border-2 border-[#3b9ddd] flex items-center justify-center bg-[#3b9ddd]/20 shadow-[0_0_15px_#3b9ddd]">
                           <span className="text-white font-serif text-xl">水</span>
                         </div>
                         <div className="w-24 h-4 flex items-center justify-center relative overflow-hidden">
                           {/* Linha Tracejada Azul Neutro */}
                           <div className="absolute inset-0 border-b-[3px] border-dashed border-[#60a5fa] opacity-60"></div>
                           <svg viewBox="0 0 100 20" className="w-full h-full text-[#93c5fd] opacity-80" style={{ animation: 'slide-right-slow 2s linear infinite' }}>
                             <pattern id="arrowNeu" x="0" y="0" width="30" height="20" patternUnits="userSpaceOnUse">
                               <polygon points="5,5 15,10 5,15" fill="currentColor" />
                             </pattern>
                             <rect x="0" y="0" width="100%" height="100%" fill="url(#arrowNeu)" />
                           </svg>
                         </div>
                         <div className="w-12 h-12 rounded-full border-2 border-[#c0834e] flex items-center justify-center bg-[#c0834e]/20 shadow-[0_0_15px_#c0834e]">
                           <span className="text-white font-serif text-xl">土</span>
                         </div>
                      </div>
                      <div className="text-center mt-2">
                        <span className="font-bold text-[#60a5fa]">Elo Fraco (Aleatório)</span><br/>
                        <span className="text-xs text-white/50">Palavra Sem Sentido = Bônus Leve (+15%)</span>
                      </div>
                    </div>

                    {/* ELO OURO (VERDADEIRO) */}
                    <div className="flex flex-col items-center bg-black/40 p-4 rounded-xl border border-gold-500/30">
                      <div className="flex items-center gap-1">
                         <div className="w-12 h-12 rounded-full border-2 border-[#f1c40f] flex items-center justify-center bg-[#f1c40f]/40 shadow-[0_0_20px_#f1c40f]">
                           <span className="text-white font-serif text-xl font-bold">我</span>
                         </div>
                         <div className="w-24 h-4 flex items-center justify-center relative overflow-hidden">
                           {/* Linha Ouro Direcional */}
                           <div className="absolute inset-0 bg-[#fbbf24] h-1.5 top-1/2 -translate-y-1/2 shadow-[0_0_10px_#fbbf24]"></div>
                           <svg viewBox="0 0 100 20" className="w-full h-full text-[#fcd34d]" style={{ animation: 'slide-right-fast 1s linear infinite' }}>
                             <pattern id="arrowTrue" x="0" y="0" width="25" height="20" patternUnits="userSpaceOnUse">
                               <polygon points="2,3 15,10 2,17" fill="currentColor" />
                             </pattern>
                             <rect x="0" y="0" width="100%" height="100%" fill="url(#arrowTrue)" />
                           </svg>
                         </div>
                         <div className="w-12 h-12 rounded-full border-2 border-[#9b59b6] flex items-center justify-center bg-[#9b59b6]/40 shadow-[0_0_20px_#9b59b6]">
                           <span className="text-white font-serif text-xl font-bold">吃</span>
                         </div>
                      </div>
                      <div className="text-center mt-2">
                        <span className="font-bold text-[#fbbf24]">Elo Verdadeiro (Sinergia)</span><br/>
                        <span className="text-xs text-white/50">Palavra Real = PODER MULTIPLICADO (+150%)</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gold-300">3. Radicais e Habilidades</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-ink-300 bg-ink-800 p-4 rounded-lg">
                    <p>💧 <strong>Água (水):</strong> Dá lentidão no alvo.</p>
                    <p>🔥 <strong>Fogo (火):</strong> Dano em Área (Splash).</p>
                    <p>⛰️ <strong>Terra (土):</strong> Atordoa o alvo.</p>
                    <p>👄 <strong>Boca (口):</strong> Empurra inimigos para trás.</p>
                    <p>🌳 <strong>Madeira (木):</strong> Cura os pontos do seu Castelo.</p>
                    <p>👤 <strong>Humano (人):</strong> Velocidade e Foco padrão.</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setPhase('playing')}
                className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-lg rounded-xl tracking-widest transition"
              >
                ENTENDI, VOLTAR AO JOGO
              </button>
           </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-10 h-20 bg-black/80 border-t border-white/10 flex items-center justify-between px-4 overflow-x-auto touch-none pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono shrink-0 mr-1">SEU DECK</span>
          {activeDeck.map((card, i) => {
            const vis = FAMILY_VISUAL[card.family] ?? DEFAULT_VISUAL;
            return (
              <div
                key={i}
                onPointerDown={(e) => startDragDeck(e, i)}
                style={{
                  border: `1.5px solid rgba(255,255,255,0.1)`,
                  background: 'rgba(0,0,0,0.4)',
                  color: vis.color,
                }}
                className="shrink-0 w-14 h-14 rounded flex flex-col items-center justify-center transition-all cursor-grab hover:bg-white/5 active:cursor-grabbing"
              >
                <span style={{ fontFamily: 'Noto Serif SC, serif', fontSize: 22, fontWeight: 900 }}>
                  {card.char}
                </span>
                <span style={{ fontSize: 9, opacity: 0.7, fontFamily: 'monospace' }}>
                  Lv{card.level}
                </span>
              </div>
            );
          })}
        </div>
        
        {phase === 'playing' && (
          <button 
            onClick={() => {
              setMoneyReact(gameState.current.money);
              setPhase('setup');
            }}
            className="shrink-0 ml-4 px-4 py-2 border-2 border-gold-500/50 text-gold-400 rounded-lg font-bold text-sm hover:bg-gold-500/10 transition"
          >
            LOJA (PAUSAR)
          </button>
        )}
      </div>
    </div>
  );
};

export default LumiWarfare;