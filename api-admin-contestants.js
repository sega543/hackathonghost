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
  if (req.method !== 'GET') return res.status(405).end();
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.payment_status,
            u.payment_reference, u.payment_verified_at, u.created_at,
            t.name AS team_name,
            CASE u.role
              WHEN 'lone'    THEN '₦1,500'
              WHEN 'team_4'  THEN '₦5,000'
              WHEN 'team_10' THEN '₦7,500'
            END AS amount
     FROM users u
     LEFT JOIN team_members tm ON tm.user_id = u.id
     LEFT JOIN teams t ON t.id = tm.team_id
     WHERE u.role != 'admin'
     ORDER BY u.created_at DESC`);
  res.json(rows);
};
