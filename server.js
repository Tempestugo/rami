import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// === HOSTINGER AUTO-BUILD HOOK ===
// Isso permite que a Hostinger compile o React automaticamente ao iniciar o Node.
if (process.env.NODE_ENV !== 'development' && !process.argv.includes('--no-build')) {
  console.log('📦 Iniciando build do Frontend automaticamente...');
  try {
    // Corrige permissões do esbuild (comum em hospedagem compartilhada)
    execSync('chmod +x node_modules/.bin/* node_modules/@esbuild/linux-x64/bin/esbuild || true', { stdio: 'inherit' });
    // Executa o build do Vite
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build do Frontend concluído com sucesso!');
  } catch (err) {
    console.error('⚠️ Erro no build automático (pode ignorar se o app funcionar):', err.message);
  }
}

import graphHandler  from './api/graph/index.js';
import charHandler   from './api/graph/character/[id].js';
import phraseHandler from './api/phrases/build.js';
import attackHandler from './attack.js';          // BUG FIX: era './api/game/logic.js' (não existe)
import siegeHandler  from './api/game/siege.js';  // NOVO
import { lessonHandler, listSentences } from './api/game/lessonGenerator.js';
import pool, { dbReady } from './db.js';
import { hanziData } from './api/_data/hanziData.js';

// Pre-build a map for O(1) character lookups
const hanziMap = new Map(hanziData.map(h => [h.id, h]));

// Helper: Maps a character (from hanziData) to a family & base_damage and Portuguese meaning
function enrichCharacterData(char) {
  const data = hanziMap.get(char);
  if (!data) {
    return {
      pinyin: '',
      meaning_pt: '',
      family: '土',
      base_damage: 10
    };
  }

  // 1. Determine Family
  // Families: '水', '火', '木', '金', '土', '人', '口'
  let family = '土'; // default
  if (['水', '火', '木', '金', '土', '人', '口'].includes(char)) {
    family = char;
  } else {
    // Check components
    const comps = data.components || [];
    if (comps.includes('水') || comps.includes('氵') || char === '河' || char === '海' || char === '雨' || char === '雪') {
      family = '水';
    } else if (comps.includes('火') || comps.includes('灬') || char === '日' || char === '明' || char === '星') {
      family = '火';
    } else if (comps.includes('木') || char === '林' || char === '森' || char === '树' || char === '果' || char === '草' || char === '花') {
      family = '木';
    } else if (comps.includes('人') || comps.includes('亻') || char === '你' || char === '他' || char === '她' || char === '从' || char === '众' || char === '们') {
      family = '人';
    } else if (comps.includes('口') || char === '说' || char === '听' || char === '读' || char === '吃' || char === '喝' || char === '字' || char === '学') {
      family = '口';
    } else if (comps.includes('金') || comps.includes('钅') || ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万'].includes(char)) {
      family = '金'; // Numbers map to metal
    } else {
      // Look at tags
      const tags = data.tags || [];
      if (tags.includes('tempo') || tags.includes('natureza') || tags.includes('clima')) {
        family = '土';
      } else if (tags.includes('pessoa') || tags.includes('familia') || tags.includes('animal')) {
        family = '人';
      } else if (tags.includes('comida') || tags.includes('cozinha') || tags.includes('acao') || tags.includes('estudo')) {
        family = '口';
      }
    }
  }

  // 2. Base Damage based on HSK and char code (to vary damages)
  const hsk = data.hsk || 1;
  const codeVal = char.charCodeAt(0) || 0;
  const base_damage = 5 + (hsk * 2) + (codeVal % 5);

  // 3. Translate Meaning (basic mappings to Portuguese, otherwise fallback to English)
  const translations = {
    'one': 'um', 'two': 'dois', 'three': 'três', 'four': 'quatro', 'five': 'cinco',
    'six': 'seis', 'seven': 'sete', 'eight': 'oito', 'nine': 'nove', 'ten': 'dez',
    'hundred': 'cem', 'thousand': 'mil', 'ten thousand': 'dez mil',
    'mouth': 'boca', 'sun / day': 'sol / dia', 'moon / month': 'lua / mês',
    'bright / clear': 'brilhante / claro', 'early / morning': 'cedo / manhã',
    'star': 'estrela', 'evening / late': 'tarde / noite', 'time / hour': 'tempo / hora',
    'person': 'pessoa', 'big': 'grande', 'too much / very': 'muito / demais',
    'sky / day': 'céu / dia', 'husband': 'marido', 'from / follow': 'de / seguir',
    'crowd / many': 'multidão / muitos', 'woman': 'mulher', 'child / son': 'filho / criança',
    'good': 'bom / bem', 'man / male': 'homem / macho', 'father': 'pai', 'mother': 'mãe',
    'plural suffix for people': 'sufixo plural (pessoas)', 'you': 'você', 'he / him': 'ele',
    'she / her': 'ela', 'I / me': 'eu', 'character / word': 'caractere / palavra',
    'to study / learn': 'estudar / aprender', 'wood / tree': 'madeira / árvore',
    'forest (sparse)': 'bosque / floresta', 'dense forest': 'floresta densa',
    'tree': 'árvore', 'earth / soil': 'terra / solo', 'king': 'rei', 'jade': 'jade',
    'country / nation': 'país / nação', 'field / farmland': 'campo / cultivo',
    'water': 'água', 'fire': 'fogo', 'mountain': 'montanha', 'stone / rock': 'pedra / rocha',
    'flower': 'flor', 'grass': 'grama / relva', 'cloud': 'nuvem', 'wind': 'vento',
    'rain': 'chuva', 'snow': 'neve', 'cow / ox': 'boi / vaca', 'sheep / goat': 'ovelha / cabra',
    'horse': 'cavalo', 'fish': 'peixe', 'bird': 'pássaro', 'cat': 'gato', 'dog': 'cachorro',
    'fruit / result': 'fruta / resultado', 'tea': 'chá', 'meat / flesh': 'carne',
    'rice / meter': 'arroz / metro', 'cooked rice / meal': 'arroz cozido / refeição',
    'to eat': 'comer', 'to drink': 'beber', 'vegetable / dish': 'verdura / prato',
    'egg': 'ovo', 'salt': 'sal', 'sugar / candy': 'açúcar / doce', 'alcohol / wine': 'álcool / vinho',
    'noodles / face / side': 'macarrão / face / lado', 'bag / bread / wrap': 'pão / embrulho',
    'bean / legume': 'feijão / legume', 'oil': 'óleo', 'pot / wok': 'panela / wok',
    'up / above / on': 'acima / em cima', 'down / below / under': 'abaixo / sob',
    'middle / center / China': 'meio / centro', 'inside / mile': 'dentro',
    'outside / foreign': 'fora / estrangeiro', 'left': 'esquerda', 'right': 'direita',
    'front / before': 'frente / antes', 'back / after': 'atrás / depois',
    'home / family': 'casa / família', 'door / gate': 'porta / portão',
    'city / town': 'cidade / vila', 'road / path': 'caminho / estrada', 'river': 'rio',
    'sea / ocean': 'mar / oceano', 'to come': 'vir', 'to go': 'ir',
    'to speak / say': 'falar / dizer', 'to look / watch': 'olhar / ver', 'to listen': 'ouvir',
    'to read': 'ler', 'to write': 'escrever', 'to walk': 'andar / caminhar',
    'to sit / travel by': 'sentar / viajar de', 'to stand / station': 'de pé / estação',
    'to buy': 'comprar', 'to sell': 'vender', 'to open / start': 'abrir / iniciar',
    'to close / shut': 'fechar', 'to hit / make a call': 'bater / ligar',
    'to do / make': 'fazer', 'to use': 'usar', 'to give': 'dar', 'to think / want': 'pensar / querer',
    'to know': 'saber / conhecer'
  };

  let meaning_pt = translations[data.meaning] || data.meaning;

  return {
    pinyin: data.pinyin,
    meaning_pt,
    family,
    base_damage
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(express.json());

app.get('/api/graph', graphHandler);
app.get('/api/graph/character/:id', (req, res) => {
  req.query    = req.query || {};
  req.query.id = req.params.id;
  charHandler(req, res);
});
app.post('/api/phrases/build', phraseHandler);
app.get('/api/phrase', phraseHandler);
app.get('/api/characters', (req, res) => {
  try {
    const data = hanziData.map(h => {
      const extra = enrichCharacterData(h.id);
      return {
        char: h.id,
        pinyin: h.pinyin,
        meaning: h.meaning,
        meaning_pt: extra.meaning_pt,
        hsk: h.hsk
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/game/attack', attackHandler);
app.get('/api/game/siege',   siegeHandler);

// --- Sistema de Lições e Progressão ---
app.get('/api/lesson/:id', lessonHandler);

app.get('/api/lessons', async (req, res) => {
  try {
    const data = await listSentences();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress (
        user_id INT,
        lesson_id VARCHAR(60),
        sentence_id VARCHAR(30),
        xp INT,
        completed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const { lesson_id, sentence_id, xp, user_id = 1 } = req.body;
    await pool.query(
      `INSERT INTO progress (user_id, lesson_id, sentence_id, xp) VALUES (?, ?, ?, ?)`,
      [user_id, lesson_id, sentence_id, xp]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sistema de Cartas e Deck ---
app.get('/api/cards/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT \`char\`, srs_level, practice_count FROM user_cards WHERE user_id = ?`,
      [req.params.userId]
    );
    const enriched = rows.map(row => {
      const extra = enrichCharacterData(row.char);
      return {
        char: row.char,
        srs_level: row.srs_level,
        practice_count: row.practice_count || 0,
        ...extra
      };
    });
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cards/:userId/status/:char', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT srs_level, practice_count FROM user_cards WHERE user_id = ? AND \`char\` = ?`,
      [req.params.userId, req.params.char]
    );
    if (rows.length > 0) {
      res.json({ 
        success: true, 
        known: true, 
        srs_level: rows[0].srs_level, 
        practice_count: rows[0].practice_count || 0 
      });
    } else {
      res.json({ success: true, known: false, srs_level: null, practice_count: 0 });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const { user_id = 1, char, srs_level, vote } = req.body;
    if (!char) {
      return res.status(400).json({ error: 'Character (char) is required' });
    }

    if (vote) {
      const [rows] = await pool.query(
        `SELECT srs_level, practice_count FROM user_cards WHERE user_id = ? AND \`char\` = ?`,
        [user_id, char]
      );
      if (rows.length > 0) {
        let currentLevel = rows[0].srs_level || 1;
        let practiceCount = rows[0].practice_count || 0;

        if (vote === 'remembered') {
          practiceCount += 1;
          if (practiceCount >= 5) {
            practiceCount = 0;
            currentLevel = Math.min(5, currentLevel + 1);
          }
        } else if (vote === 'forgot') {
          currentLevel = Math.max(1, currentLevel - 1);
          practiceCount = 0;
        }

        await pool.query(
          `UPDATE user_cards SET srs_level = ?, practice_count = ? WHERE user_id = ? AND \`char\` = ?`,
          [currentLevel, practiceCount, user_id, char]
        );
      } else {
        const initialLevel = 1;
        const initialCount = vote === 'remembered' ? 1 : 0;
        await pool.query(
          `INSERT INTO user_cards (user_id, \`char\`, srs_level, practice_count) VALUES (?, ?, ?, ?)`,
          [user_id, char, initialLevel, initialCount]
        );
      }
    } else {
      const targetLevel = srs_level !== undefined ? srs_level : 1;
      await pool.query(
        `INSERT INTO user_cards (user_id, \`char\`, srs_level, practice_count) 
         VALUES (?, ?, ?, 0) 
         ON DUPLICATE KEY UPDATE srs_level = VALUES(srs_level), practice_count = 0`,
        [user_id, char, targetLevel]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cards', async (req, res) => {
  try {
    const { user_id = 1, char } = req.body;
    if (!char) {
      return res.status(400).json({ error: 'Character (char) is required' });
    }
    await pool.query(
      `DELETE FROM user_cards WHERE user_id = ? AND \`char\` = ?`,
      [user_id, char]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deck/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT \`char\`, slot FROM user_deck WHERE user_id = ?`,
      [req.params.userId]
    );
    const enriched = rows.map(row => {
      const extra = enrichCharacterData(row.char);
      return {
        char: row.char,
        slot: row.slot,
        srs_level: 1, // default if not found
        ...extra
      };
    });

    if (enriched.length > 0) {
      const chars = enriched.map(e => e.char);
      const [cardRows] = await pool.query(
        `SELECT \`char\`, srs_level FROM user_cards WHERE user_id = ? AND \`char\` IN (?)`,
        [req.params.userId, chars]
      );
      const srsMap = {};
      cardRows.forEach(cr => { srsMap[cr.char] = cr.srs_level; });
      enriched.forEach(e => {
        if (srsMap[e.char] !== undefined) {
          e.srs_level = srsMap[e.char];
        }
      });
    }
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deck', async (req, res) => {
  try {
    const { user_id = 1, slots } = req.body;
    for (const s of slots) {
      await pool.query(
        `INSERT INTO user_deck (user_id, \`char\`, slot) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE \`char\` = VALUES(\`char\`)`,
        [user_id, s.char, s.slot]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

async function initializeDatabase() {
  await dbReady;
  try {
    console.log(' Inicializando tabelas do banco de dados...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        lesson_id VARCHAR(60),
        sentence_id VARCHAR(30),
        xp INT,
        completed_at TIMESTAMP DEFAULT NOW()
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_cards (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        \`char\` VARCHAR(10) NOT NULL,
        srs_level TINYINT NOT NULL DEFAULT 1,
        practice_count TINYINT NOT NULL DEFAULT 0,
        slot INT NULL,
        UNIQUE KEY uq_user_card (user_id, \`char\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    // Migração de tabela existente
    try {
      await pool.query(`ALTER TABLE user_cards ADD COLUMN practice_count TINYINT NOT NULL DEFAULT 0`);
      console.log(' Coluna practice_count adicionada com sucesso a user_cards.');
    } catch (e) {
      // Ignora erro se a coluna já existe
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_deck (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        \`char\` VARCHAR(10) NOT NULL,
        slot TINYINT NOT NULL,
        UNIQUE KEY uq_user_deck (user_id, slot)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log(' Tabelas do banco de dados inicializadas com sucesso.');
  } catch (err) {
    console.error(' Erro ao inicializar o banco de dados:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
initializeDatabase().then(() => {
  app.listen(PORT, () => console.log(`Lumi Server na porta ${PORT}`));
});
