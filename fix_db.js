import pool, { dbReady } from './db.js';
import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function run() {
  await dbReady;
  try {
    console.log('Adding password_hash column...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ""');
      console.log('Column added.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists.');
      } else {
        throw err;
      }
    }

    const defaultHash = hashPassword('123456');
    console.log('Updating password for existing users to 123456...');
    await pool.query('UPDATE users SET password_hash = ? WHERE password_hash = ""', [defaultHash]);
    
    // Certificar-se que o Rami existe
    await pool.query(
      `INSERT IGNORE INTO users (id, username, password_hash) VALUES (?, ?, ?)`,
      [1, 'Rami', defaultHash]
    );

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}
run();
