import pool from './db.js';
import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function migrateUsers() {
  console.log('🚀 Iniciando migração de usuários...');

  try {
    console.log('📝 Criando tabela users...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('👤 Inserindo usuário principal (ID 1)...');
    const defaultHash = hashPassword('123456');
    await pool.query(
      `INSERT IGNORE INTO users (id, username, password_hash) VALUES (?, ?, ?)`,
      [1, 'Rami', defaultHash]
    );

    console.log('✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração de usuários:', err);
  } finally {
    process.exit();
  }
}

migrateUsers();
