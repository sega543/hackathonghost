const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  const { type } = req.query;

  // stats — returns contestant counts per role (used by landing page)
  if (type === 'stats') {
    const { rows } = await pool.query(
      `SELECT role, COUNT(*) AS count FROM users
       WHERE payment_status = TRUE AND role != 'admin' GROUP BY role`);
    const stats = { lone: 0, team_4: 0, team_10: 0 };
    rows.forEach(r => { stats[r.role] = parseInt(r.count); });
    return res.json(stats);
  }

  const conditions = ["(u.role IS NULL OR u.role != 'admin')"];
  const params = [];
  if (type && type !== 'all') { params.push(type); conditions.push('lb.entity_type = $' + params.length); }
  const { rows } = await pool.query(
    `SELECT lb.rank, lb.entity_type, lb.entity_id, lb.total_score, lb.last_updated,
            COALESCE(u.name, t.name) AS display_name
     FROM leaderboard lb
     LEFT JOIN users u ON lb.entity_type = 'user' AND lb.entity_id = u.id
     LEFT JOIN teams t ON lb.entity_type = 'team' AND lb.entity_id = t.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY lb.rank ASC`, params);
  res.json(rows);
};
