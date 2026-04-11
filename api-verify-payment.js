const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: 'reference is required' });

  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
  const data = await paystackRes.json();
  if (!data.status || data.data?.status !== 'success')
    return res.status(400).json({ error: 'Transaction not successful on Paystack' });

  try {
    await pool.query('SELECT fn_verify_payment($1)', [reference]);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
};
