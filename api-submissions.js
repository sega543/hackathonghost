const { Pool } = require('pg');
const jwt      = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function getUser(req) {
  try {
    const auth = req.headers.authorization || '';
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'Unauthenticated' });

  if (req.method === 'GET') {
    const { user_id, team_id } = req.query;
    const { rows } = await pool.query(
      `SELECT s.*, sr.opens_at, sr.closes_at FROM submissions s
       JOIN submission_rounds sr ON sr.round_number = s.round_number
       WHERE s.user_id = $1 ${team_id ? 'OR s.team_id = $2' : ''}
       ORDER BY s.round_number ASC`,
      team_id ? [user_id, team_id] : [user_id]);
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const { user_id, team_id, round_number, pdf_link, github_link, youtube_link } = req.body;
    if (!user_id || !round_number || !github_link || !youtube_link)
      return res.status(400).json({ error: 'Missing required fields' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO submissions (user_id, team_id, round_number, pdf_link, github_link, youtube_link)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id, round_number) DO UPDATE
           SET pdf_link=$4, github_link=$5, youtube_link=$6, submitted_at=NOW()
         RETURNING *`,
        [user_id, team_id||null, round_number, pdf_link||null, github_link, youtube_link]);
      return res.status(201).json(rows[0]);
    } catch (err) { return res.status(400).json({ error: err.message }); }
  }
  res.status(405).end();
};
