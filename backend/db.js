// Pool de ligação ao PostgreSQL (CT 106 · 192.168.1.3:5432).
// Credenciais vêm do .env na CT, nunca no Git.
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'enbia_forms',
  user: process.env.PGUSER || 'enbia_forms_app',
  password: process.env.PGPASSWORD || '',
  max: parseInt(process.env.PGPOOL_MAX || '6', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
  application_name: 'enbia-questionario-horta',
});

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool:', err.message);
});

const RAW_TZ = process.env.DISPLAY_TZ || 'Europe/Lisbon';
const DISPLAY_TZ = /^[A-Za-z0-9_+\-/]{1,64}$/.test(RAW_TZ) ? RAW_TZ : 'Europe/Lisbon';

pool.on('connect', (client) => {
  client.query(`SET TIME ZONE '${DISPLAY_TZ}'`).catch((e) =>
    console.error('[db] falhou SET TIME ZONE:', e.message)
  );
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
