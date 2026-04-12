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
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });

  if (req.method === 'GET') {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.payment_status,
              u.payment_reference, u.payment_verified_at, u.created_at,
              t.name AS team_name,
              CASE u.role
                WHEN 'lone'    THEN '₦2,500'
                WHEN 'team_4'  THEN '₦10,000'
                WHEN 'team_10' THEN '₦20,000'
              END AS amount
       FROM users u
       LEFT JOIN team_members tm ON tm.user_id = u.id
       LEFT JOIN teams t ON t.id = tm.team_id
       WHERE u.role != 'admin'
       ORDER BY u.created_at DESC`);
    return res.json(rows);
  }

  // PATCH — manually mark a user as paid (admin override)
  if (req.method === 'PATCH') {
    const { user_id, reference } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const { rows } = await pool.query(
      `UPDATE users SET payment_status = TRUE,
        payment_reference = COALESCE($1, payment_reference, 'MANUAL_ADMIN'),
        payment_verified_at = NOW()
       WHERE id = $2 RETURNING id, name, email, payment_status`,
      [reference || null, user_id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, user: rows[0] });
  }

  res.status(405).end();
};
