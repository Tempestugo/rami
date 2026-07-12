import mysql from 'mysql2/promise';

let activePool = mysql.createPool({
  host: 'localhost', // Na Hostinger geralmente é localhost
  user: 'u556180082_ramiSQL',
  password: 'Rami2026!',
  database: 'u556180082_rami',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000
});

// Testa conexão do pool principal e tenta o Hostinger remoto em caso de falha
export const dbReady = new Promise((resolve) => {
  activePool.getConnection()
    .then(conn => {
      console.log(' Conectado ao banco de dados principal (Hostinger).');
      conn.release();
      resolve(activePool);
    })
    .catch(err => {
      console.log('️ Conexão com localhost falhou, tentando Hostinger remoto...');
      activePool = mysql.createPool({
        host: 'srv2022.hstgr.io',
        user: 'u556180082_ramiSQL',
        password: 'Rami2026!',
        database: 'u556180082_rami',
        waitForConnections: true,
        connectionLimit: 10,
        connectTimeout: 5000
      });
      activePool.getConnection()
        .then(conn => {
          console.log(' Conectado com sucesso ao banco de dados Hostinger remoto (srv2022.hstgr.io).');
          conn.release();
          resolve(activePool);
        })
        .catch(localErr => {
          console.error(' Ambos os bancos de dados falharam:', localErr.message);
          resolve(activePool);
        });
    });
});

const poolProxy = {
  query: (...args) => activePool.query(...args),
  execute: (...args) => activePool.execute(...args),
  getConnection: (...args) => activePool.getConnection(...args),
  end: (...args) => activePool.end(...args)
};

export default poolProxy;