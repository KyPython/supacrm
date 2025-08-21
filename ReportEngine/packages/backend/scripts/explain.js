const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/reportengine';

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  console.log('Using DATABASE_URL:', DATABASE_URL.replace(/:\/\/.*@/, '://***@'));
  console.log('\nRecommended indexes (run these in psql if needed):\n');
  console.log("-- CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);");
  console.log("-- CREATE INDEX IF NOT EXISTS idx_transactions_region_created_at ON transactions (region_id, created_at);");
  console.log("-- CREATE INDEX IF NOT EXISTS idx_transactions_user_created_at ON transactions (user_id, created_at);\n");

  const start = process.env.EXPLAIN_START || '2024-01-01';
  const end = process.env.EXPLAIN_END || '2025-08-20';
  const sql = `
  EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
  SELECT r.name AS key, COUNT(*) AS count, SUM(t.amount) AS amount
  FROM transactions t
  JOIN users u ON u.id = t.user_id
  JOIN regions r ON r.id = u.region_id
  WHERE t.created_at BETWEEN $1::timestamp AND $2::timestamp
  GROUP BY r.name
  ORDER BY amount DESC
  LIMIT 100;
  `;

  try {
    console.log('Running EXPLAIN ANALYZE on sample aggregation query (this may take a while)...\n');
    const res = await pool.query(sql, [start, end]);
    // print each line of the plan
    res.rows.forEach((r) => console.log(r['QUERY PLAN']));
  } catch (err) {
    console.error('EXPLAIN failed:', err.message);
  } finally {
    await pool.end();
  }
}

run();
