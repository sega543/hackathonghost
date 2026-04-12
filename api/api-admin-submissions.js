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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });

  if (req.method === 'GET') {
    const { round, role } = req.query;
    const conditions = [], params = [];
    if (round) { params.push(round); conditions.push(`s.round_number = $${params.length}`); }
    if (role)  { params.push(role);  conditions.push(`u.role = $${params.length}`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT s.id, s.round_number, s.pdf_link, s.github_link, s.youtube_link,
              s.score, s.submitted_at, u.name, u.role, t.name AS team_name
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN teams t ON t.id = s.team_id
       ${where} ORDER BY s.round_number ASC, s.submitted_at ASC`, params);
    return res.json(rows);
  }

  if (req.method === 'PATCH') {
    const { id, score } = req.body;
    if (!id || score === undefined) return res.status(400).json({ error: 'id and score required' });
    if (score < 0 || score > 100) return res.status(400).json({ error: 'Score must be 0–100' });
    const { rows } = await pool.query(
      'UPDATE submissions SET score=$1, scored_at=NOW() WHERE id=$2 RETURNING *', [score, id]);
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
    return res.json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { rows } = await pool.query('DELETE FROM submissions WHERE id=$1 RETURNING id', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
    return res.json({ ok: true });
  }

  res.status(405).end();
};
