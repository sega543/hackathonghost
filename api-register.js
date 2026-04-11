const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, password, role, team_name } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'All fields are required' });
  if (!['lone','team_4','team_10'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role, payment_status)
       VALUES ($1,$2,$3,$4,FALSE) RETURNING id, name, email, role, payment_status`,
      [name, email.toLowerCase(), password_hash, role]);
    const user = rows[0];

    // For team roles, create a team and add user as first member
    let team_id = null;
    if (role === 'team_4' || role === 'team_10') {
      const tname = team_name || `${name}'s Team`;
      const teamRes = await client.query(
        `INSERT INTO teams (name, team_type) VALUES ($1,$2) RETURNING id`,
        [tname, role]);
      team_id = teamRes.rows[0].id;
      await client.query(
        `INSERT INTO team_members (team_id, user_id) VALUES ($1,$2)`,
        [team_id, user.id]);
    }

    await client.query('COMMIT');

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { ...user, team_id } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
