const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on('data', c => chunks.push(c));
    req.on('end', resolve);
    req.on('error', reject);
  });
  const rawBody = Buffer.concat(chunks);
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  if (hash !== req.headers['x-paystack-signature'])
    return res.status(401).json({ error: 'Invalid signature' });
  const event = JSON.parse(rawBody.toString());
  if (event.event === 'charge.success') {
    const ref = event.data.reference;
    // Also store the reference on the user record if not already set
    await pool.query(
      `UPDATE users SET payment_reference = $1 WHERE payment_reference IS NULL AND email = $2`,
      [ref, event.data.customer?.email || '']
    ).catch(() => {});
    try { await pool.query('SELECT fn_verify_payment($1)', [ref]); }
    catch (err) { console.error('[webhook]', err.message); }
  }
  res.status(200).json({ received: true });
};
