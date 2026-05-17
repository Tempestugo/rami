import pool from './db.js';
import { hanziData } from './api/_data/hanziData.js';
import { phraseData } from './api/_data/phraseData.js';

async function migrate() {
    console.log('🚀 Iniciando migração para o exército Lumi...');

    try {
        // 1. Migrar Caracteres
        console.log('📝 Importando caracteres...');
        for (const char of hanziData) {
            await pool.query(
                `INSERT INTO characters (hanzi, pinyin, meaning, hsk_level) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE pinyin=VALUES(pinyin), meaning=VALUES(meaning), hsk_level=VALUES(hsk_level)`,
                [char.id, char.pinyin, char.meaning, char.hsk || 1]
            );
        }

        // 2. Migrar Relações de Componentes (O coração da sua mecânica de Boss)
        console.log('🔗 Mapeando componentes e radicais...');
        for (const char of hanziData) {
            if (char.components && Array.isArray(char.components)) {
                for (const compHanzi of char.components) {
                    // Busca o ID do pai e do componente
                    const [[parent]] = await pool.query('SELECT id FROM characters WHERE hanzi = ?', [char.id]);
                    const [[component]] = await pool.query('SELECT id FROM characters WHERE hanzi = ?', [compHanzi]);

                    if (parent && component) {
                        await pool.query(
                            'INSERT IGNORE INTO character_components (parent_id, component_id) VALUES (?, ?)',
                            [parent.id, component.id]
                        );
                    }
                }
            }
        }

        // 3. Migrar Frases
        console.log('📚 Populando biblioteca de frases...');
        for (const phrase of phraseData) {
            await pool.query(
                'INSERT IGNORE INTO phrases (simplified, pinyin, meaning, hsk_level) VALUES (?, ?, ?, ?)',
                [phrase.simplified, phrase.pinyin, phrase.meaning, phrase.hsk || 1]
            );
        }

        console.log('✅ Migração concluída com sucesso! Tropas prontas para o combate.');
    } catch (err) {
        console.error('❌ Erro na migração:', err);
    } finally {
        process.exit();
    }
}

migrate();