// backend/data/db.js
const path = require('path');

let db = null;

function getDb() {
  if (process.env.NODE_ENV === 'production') return null; // Fallback memória para produção
  if (db) return db;
  
  try {
    const Database = require('better-sqlite3');
    db = new Database(path.join(__dirname, 'rami.db'));
    seedIfEmpty(db);
    return db;
  } catch (err) {
    console.warn('Falha ao iniciar SQLite. Usando fallback em memória.', err.message);
    return null;
  }
}

function seedIfEmpty(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      pinyin TEXT NOT NULL,
      meaning TEXT NOT NULL,
      hsk INTEGER NOT NULL,
      components TEXT NOT NULL,
      visual_parents TEXT NOT NULL,
      tags TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phrase TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      translation TEXT NOT NULL,
      hsk INTEGER NOT NULL,
      chars TEXT NOT NULL
    );
  `);

  const { hanziData } = require('./hanziData');
  
  const countChars = db.prepare('SELECT COUNT(*) as count FROM characters').get();
  if (countChars.count === 0 && hanziData) {
    const insertChar = db.prepare(`
      INSERT INTO characters (id, pinyin, meaning, hsk, components, visual_parents, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertManyChars = db.transaction((chars) => {
      for (const char of chars) {
        insertChar.run(
          char.id,
          char.pinyin,
          char.meaning,
          char.hsk,
          JSON.stringify(char.components || []),
          JSON.stringify(char.visual_parents || []),
          JSON.stringify(char.tags || [])
        );
      }
    });
    insertManyChars(hanziData);
  }

  try {
    const { phraseData } = require('./phraseData');
    const countPhrases = db.prepare('SELECT COUNT(*) as count FROM phrases').get();
    if (countPhrases.count === 0 && phraseData) {
      const insertPhrase = db.prepare(`
        INSERT INTO phrases (phrase, pinyin, translation, hsk, chars)
        VALUES (?, ?, ?, ?, ?)
      `);
      const insertManyPhrases = db.transaction((phrases) => {
        for (const p of phrases) {
          insertPhrase.run(
            p.phrase || '',
            p.pinyin || '',
            p.translation || '',
            p.hsk || 1,
            JSON.stringify(p.chars || [])
          );
        }
      });
      insertManyPhrases(phraseData);
    }
  } catch (err) {
    // Arquivo phraseData.js pode estar ausente neste seed.
  }
}

module.exports = { getDb };