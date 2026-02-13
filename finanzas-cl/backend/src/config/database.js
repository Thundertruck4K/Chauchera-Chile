const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'finanzas_cl',
  user:     process.env.DB_USER || 'finanzas_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

module.exports = {
  connect: async () => {
    const client = await pool.connect();
    client.release();
    return true;
  },
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
