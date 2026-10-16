// Corre o schema.sql (idempotente) contra a BD no arranque do servidor.
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('[migrate] schema aplicado com sucesso');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((e) => {
      console.error('[migrate] falhou:', e.message);
      process.exit(1);
    });
}

module.exports = { migrate };
