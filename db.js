import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost', // Na Hostinger geralmente é localhost
  user: 'u556180082_ramiSQL',
  password: 'Rami2026!',
  database: 'u556180082_rami',
  waitForConnections: true,
  connectionLimit: 10
});



export default pool;