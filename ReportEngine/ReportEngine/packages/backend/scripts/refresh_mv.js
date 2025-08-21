const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/reportengine';
const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  try {
    console.log('Creating materialized view mv_region_daily (if not exists) and refreshing...');
    const createSql = `
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_region_daily AS
SELECT date_trunc('day', t.created_at)::date AS day,
       r.id AS region_id,
       r.name AS region_name,
       SUM(t.amount)::numeric(18,2) AS total_amount,
       COUNT(*) AS tx_count
FROM transactions t
JOIN users u ON u.id = t.user_id
JOIN regions r ON r.id = u.region_id
GROUP BY day, r.id, r.name
WITH NO DATA;
`;
    await pool.query(createSql);
    // create index if not exists
    await pool.query("CREATE INDEX IF NOT EXISTS idx_mv_region_daily_day_region ON mv_region_daily (day, region_id);");
    // now populate
    console.log('Refreshing materialized view (this may take a while)...');
    await pool.query('REFRESH MATERIALIZED VIEW mv_region_daily;');
    console.log('Materialized view created and refreshed.');
  } catch (err) {
    console.error('Failed to create/refresh MV:', err.message || err);
  } finally {
    await pool.end();
  }
}

run();
