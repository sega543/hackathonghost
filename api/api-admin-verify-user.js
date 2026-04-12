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
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });

  const { user_id, reference } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const { rows } = await pool.query(
    `UPDATE users SET payment_status = TRUE, payment_reference = $1, payment_verified_at = NOW()
     WHERE id = $2 RETURNING id, name, email, payment_status`,
    [reference || 'MANUAL_ADMIN', user_id]);

  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true, user: rows[0] });
};
