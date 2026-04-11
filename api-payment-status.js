const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  const { reference } = req.query;
  if (!reference) return res.status(400).json({ error: 'reference is required' });
  const { rows } = await pool.query(
    'SELECT payment_status, payment_verified_at FROM users WHERE payment_reference = $1', [reference]);
  if (!rows.length) return res.status(404).json({ error: 'Reference not found' });
  res.json(rows[0]);
};
