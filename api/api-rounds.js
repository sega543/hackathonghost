const { Pool } = require('pg');
const jwt      = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function isAdmin(req) {
  try {
    const p = jwt.verify((req.headers.authorization || '').slice(7), process.env.JWT_SECRET);
    return p.role === 'admin';
  } catch { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — public, returns all rounds + active round
  if (req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT *, (NOW() BETWEEN opens_at AND closes_at) AS is_active
       FROM submission_rounds ORDER BY round_number ASC`);
    return res.json(rows);
  }

  // PATCH — admin only, open/close a round
  if (req.method === 'PATCH') {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
    const { round_number, opens_at, closes_at } = req.body;
    if (!round_number) return res.status(400).json({ error: 'round_number required' });
    const { rows } = await pool.query(
      `UPDATE submission_rounds SET opens_at=$1, closes_at=$2
       WHERE round_number=$3 RETURNING *`,
      [opens_at, closes_at, round_number]);
    if (!rows.length) return res.status(404).json({ error: 'Round not found' });
    return res.json(rows[0]);
  }

  res.status(405).end();
};
