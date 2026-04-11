const { Pool } = require('pg');
const jwt      = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthenticated' });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.payment_status, tm.team_id
       FROM users u LEFT JOIN team_members tm ON tm.user_id = u.id
       WHERE u.id = $1`, [payload.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
};
