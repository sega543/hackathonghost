const { Pool } = require('pg');
const jwt      = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch team info
  if (req.method === 'GET') {
    const { team_id } = req.query;
    if (!team_id) return res.status(400).json({ error: 'team_id required' });
    const teamRes = await pool.query('SELECT * FROM teams WHERE id = $1', [team_id]);
    if (!teamRes.rows.length) return res.status(404).json({ error: 'Team not found' });
    const membersRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.payment_status,
              (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id)::int AS submission_count
       FROM team_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 ORDER BY tm.joined_at ASC`, [team_id]);
    return res.json({ ...teamRes.rows[0], members: membersRes.rows });
  }

  // POST — join a team by team ID code
  if (req.method === 'POST') {
    const auth = req.headers.authorization || '';
    let payload;
    try { payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
    catch { return res.status(401).json({ error: 'Unauthenticated' }); }

    const { team_code } = req.body;
    if (!team_code) return res.status(400).json({ error: 'team_code required' });

    const client = await pool.connect();
    try {
      const teamRes = await client.query('SELECT * FROM teams WHERE id = $1', [team_code]);
      if (!teamRes.rows.length) return res.status(404).json({ error: 'Team not found. Check the code and try again.' });
      const team = teamRes.rows[0];

      const userRes = await client.query('SELECT role, payment_status FROM users WHERE id = $1', [payload.id]);
      const user = userRes.rows[0];
      if (!user.payment_status) return res.status(403).json({ error: 'Complete payment before joining a team.' });
      if (user.role !== team.team_type) return res.status(400).json({ error: `This is a ${team.team_type} team but your account is ${user.role}.` });

      const existing = await client.query('SELECT team_id FROM team_members WHERE user_id = $1', [payload.id]);
      if (existing.rows.length) return res.status(409).json({ error: 'You are already in a team.' });

      await client.query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)', [team.id, payload.id]);
      return res.json({ ok: true, team_id: team.id, team_name: team.name });
    } catch (err) {
      if (err.message.includes('full')) return res.status(400).json({ error: err.message });
      return res.status(500).json({ error: err.message });
    } finally { client.release(); }
  }

  res.status(405).end();
};
