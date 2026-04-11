const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  const teamRes = await pool.query('SELECT * FROM teams WHERE id = $1', [team_id]);
  if (!teamRes.rows.length) return res.status(404).json({ error: 'Team not found' });
  const membersRes = await pool.query(
    `SELECT u.id, u.name, u.email, u.payment_status,
            (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id)::int AS submission_count
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1 ORDER BY tm.joined_at ASC`, [team_id]);
  res.json({ ...teamRes.rows[0], members: membersRes.rows });
};
