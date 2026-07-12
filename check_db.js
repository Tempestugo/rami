import pool, { dbReady } from './db.js';

async function run() {
  await dbReady;
  try {
    const [rows] = await pool.query('DESCRIBE users');
    console.log('Schema:', rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}
run();
