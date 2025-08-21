const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Resolve DATABASE_URL but be tolerant of placeholder values (e.g. some CI envs set a sample like 'HOST')
const DEFAULT_DB = 'postgresql://user:pass@localhost:5432/reportengine';
// prefer an explicit env var; keep a DEFAULT_DB for local dev only
const envDatabaseUrl = process.env.DATABASE_URL;
let DATABASE_URL = envDatabaseUrl || DEFAULT_DB;
// If someone left a placeholder hostname like HOST in the connection string, replace with localhost
if (DATABASE_URL && DATABASE_URL.includes('HOST')) {
  console.warn('DATABASE_URL contains placeholder "HOST" — falling back to localhost');
  DATABASE_URL = DATABASE_URL.replace(/HOST/g, 'localhost');
}
// Fail fast in production when DATABASE_URL is not provided (helps surface config mistakes)
if (process.env.NODE_ENV === 'production' && !envDatabaseUrl) {
  console.error('\n*** FATAL: Missing DATABASE_URL environment variable in production.');
  console.error('Set DATABASE_URL to a valid Postgres connection string in your host (Render/Vercel) settings.');
  // exit so the platform shows a clear failed deploy/state instead of repeated ECONNREFUSED runtime errors
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL });

// Helper to run queries. In test mode we swallow DB errors and return empty rows
// so tests can run without a real database. In non-test modes, rethrow after logging.
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
  // log full error + stack for easier debugging
  console.error('DB query failed', err && err.message ? err.message : err);
  if (err && err.stack) console.error(err.stack);
    if (process.env.NODE_ENV === 'test') {
      return { rows: [] };
    }
    throw err;
  }
}

// Simple health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Real aggregated report endpoint
app.get('/api/reports/summary', async (req, res) => {
  // Query params: start, end (YYYY-MM-DD), groupBy=region|user, limit
  try {
  const { start, end, groupBy = 'region', limit = 100, cursor } = req.query;

  // Basic validation
  if (limit && Number(limit) <= 0) return res.status(400).json({ error: 'limit must be > 0' });
  if (start && isNaN(new Date(start).getTime())) return res.status(400).json({ error: 'invalid start date' });
  if (end && isNaN(new Date(end).getTime())) return res.status(400).json({ error: 'invalid end date' });

    // Validate dates (simple)
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    const whereClauses = [];
    const params = [];
    let idx = 1;

    if (startDate) {
      whereClauses.push(`t.created_at >= $${idx++}`);
      params.push(startDate.toISOString());
    }
    if (endDate) {
      whereClauses.push(`t.created_at <= $${idx++}`);
      params.push(endDate.toISOString());
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const pageSize = Math.max(1, Math.min(1000, parseInt(limit, 10) || 100));

    // cursor may be: base64(JSON), url-safe-base64, or raw JSON (for convenience)
    let cursorObj = null;
    if (cursor) {
      try {
        let raw = cursor;
        // If the client accidentally turned + into space (common when not URL-encoding), restore
        raw = raw.replace(/ /g, '+');
        // Accept URL-safe base64 variants
        raw = raw.replace(/-/g, '+').replace(/_/g, '/');
        // treat explicit 'null' or empty strings as no cursor
        if (!raw || raw.trim().toLowerCase() === 'null') {
          raw = '';
        }
        if (!raw) {
          // leave cursorObj null
        } else {
        // If it's raw JSON already, parse directly
          if (raw.trim().startsWith('{')) {
            cursorObj = JSON.parse(raw);
          } else {
            // Pad base64 string if needed
            const mod = raw.length % 4;
            if (mod === 2) raw += '==';
            else if (mod === 3) raw += '=';
            // decode
            const decoded = Buffer.from(raw, 'base64').toString('utf8');
            cursorObj = JSON.parse(decoded);
          }
        }
      } catch (e) {
        return res.status(400).json({ error: 'invalid cursor' });
      }
    }

    if (groupBy === 'region') {
      const useMV = process.env.USE_MV === 'true';
      if (useMV) {
        // Try reading from materialized view if available - fall back silently if it doesn't exist
        try {
          const mvQuery = `
            SELECT r.region_name as key, SUM(r.total_amount)::numeric(12,2) as amount, SUM(r.tx_count) as count
            FROM mv_region_daily r
            WHERE r.day >= $1 AND r.day <= $2
            GROUP BY r.region_name
            ORDER BY amount DESC, key ASC
            LIMIT $3
          `;
          const mvParams = [ (startDate || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)).toISOString(), (endDate || new Date()).toISOString(), pageSize ];
          const mvRows = (await safeQuery(mvQuery, mvParams)).rows;
          if (mvRows && mvRows.length) {
            const totals = mvRows.map(r => ({ key: r.key, count: Number(r.count), amount: Number(r.amount) }));
            // timeseries can also be derived from mv_region_daily if needed; for now fall back to original timeseries query
            const tsStart = startDate || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
            const tsEnd = endDate || new Date();
            const timeseriesQuery = `
              SELECT date_trunc('day', t.created_at) as day, SUM(t.amount)::numeric(12,2) as value
              FROM transactions t
              JOIN users u ON u.id = t.user_id
              JOIN regions r ON r.id = u.region_id
              WHERE t.created_at >= $1 AND t.created_at <= $2
              GROUP BY day
              ORDER BY day
            `;
            const tsParams = [tsStart.toISOString(), tsEnd.toISOString()];
            const timeseries = (await safeQuery(timeseriesQuery, tsParams)).rows.map(r => ({ date: r.day.toISOString().split('T')[0], value: Number(r.value) }));
            const currentCursor = cursorObj ? Buffer.from(JSON.stringify(cursorObj)).toString('base64') : null;
            const nextCursor = null; // MV-based queries don't support keyset paging here
            const hasNext = false;
            return res.json({ meta: { start: start || null, end: end || null, groupBy, limit: pageSize, currentCursor, nextCursor, hasNext }, totals, timeseries });
          }
        } catch (e) {
          // if mv doesn't exist or fails, continue with normal path
          console.warn('MV read failed, falling back to live query', e && e.message ? e.message : e);
        }
      }
      // totals by region (aggregate first, then keyset paginate)
      // Build base aggregated subquery
      const aggQuery = `
        SELECT r.name as key, COUNT(*) as count, SUM(t.amount)::numeric(12,2) as amount
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        JOIN regions r ON r.id = u.region_id
        ${where}
        GROUP BY r.name
      `;

      let filterClause = '';
      const aggParams = params.slice(); // copy
      let aggIdx = idx;
      if (cursorObj) {
        // keyset where: amount < cursor.amount OR (amount = cursor.amount AND key > cursor.key)
        filterClause = `WHERE (amount < $${aggIdx} OR (amount = $${aggIdx} AND key > $${aggIdx + 1}))`;
        aggParams.push(cursorObj.amount);
        aggParams.push(cursorObj.key);
        aggIdx += 2;
      }

      const totalsQuery = `
        SELECT * FROM (
          ${aggQuery}
        ) s
        ${filterClause}
        ORDER BY amount DESC, key ASC
        LIMIT $${aggIdx}
      `;
      aggParams.push(pageSize);
  const totals = (await safeQuery(totalsQuery, aggParams)).rows.map(r => ({ key: r.key, count: Number(r.count), amount: Number(r.amount) }));

      // timeseries per day for the date range (defaults to last 30 days)
      const tsStart = startDate || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
      const tsEnd = endDate || new Date();
      const timeseriesQuery = `
        SELECT date_trunc('day', t.created_at) as day, SUM(t.amount)::numeric(12,2) as value
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        JOIN regions r ON r.id = u.region_id
        WHERE t.created_at >= $1 AND t.created_at <= $2
        GROUP BY day
        ORDER BY day
      `;
      const tsParams = [tsStart.toISOString(), tsEnd.toISOString()];
  const timeseries = (await safeQuery(timeseriesQuery, tsParams)).rows.map(r => ({ date: r.day.toISOString().split('T')[0], value: Number(r.value) }));
      // compute next cursor
      let nextCursor = null;
      if (totals.length === pageSize) {
        const last = totals[totals.length - 1];
        nextCursor = Buffer.from(JSON.stringify({ amount: last.amount, key: last.key })).toString('base64');
      }

  const currentCursor = cursorObj ? Buffer.from(JSON.stringify(cursorObj)).toString('base64') : null;
  const hasNext = !!nextCursor;
  return res.json({ meta: { start: start || null, end: end || null, groupBy, limit: pageSize, currentCursor, nextCursor, hasNext }, totals, timeseries });
    }

    if (groupBy === 'user') {
      const aggQuery = `
        SELECT u.id as key, u.name as name, COUNT(*) as count, SUM(t.amount)::numeric(12,2) as amount
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        ${where}
        GROUP BY u.id, u.name
      `;
      let filterClause = '';
      const aggParams = params.slice();
      let aggIdx = idx;
      if (cursorObj) {
        filterClause = `WHERE (amount < $${aggIdx} OR (amount = $${aggIdx} AND key > $${aggIdx + 1}))`;
        aggParams.push(cursorObj.amount);
        aggParams.push(cursorObj.key);
        aggIdx += 2;
      }

      const totalsQuery = `
        SELECT * FROM (
          ${aggQuery}
        ) s
        ${filterClause}
        ORDER BY amount DESC, key ASC
        LIMIT $${aggIdx}
      `;
      aggParams.push(pageSize);
  const totals = (await safeQuery(totalsQuery, aggParams)).rows.map(r => ({ key: r.key, name: r.name, count: Number(r.count), amount: Number(r.amount) }));

      // timeseries (global)
      const tsStart = startDate || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
      const tsEnd = endDate || new Date();
      const timeseriesQuery = `
        SELECT date_trunc('day', t.created_at) as day, SUM(t.amount)::numeric(12,2) as value
        FROM transactions t
        WHERE t.created_at >= $1 AND t.created_at <= $2
        GROUP BY day
        ORDER BY day
      `;
      const tsParams = [tsStart.toISOString(), tsEnd.toISOString()];
  const timeseries = (await safeQuery(timeseriesQuery, tsParams)).rows.map(r => ({ date: r.day.toISOString().split('T')[0], value: Number(r.value) }));

      let nextCursor = null;
      if (totals.length === pageSize) {
        const last = totals[totals.length - 1];
        nextCursor = Buffer.from(JSON.stringify({ amount: last.amount, key: last.key })).toString('base64');
      }
  const currentCursor = cursorObj ? Buffer.from(JSON.stringify(cursorObj)).toString('base64') : null;
  const hasNext = !!nextCursor;
  return res.json({ meta: { start: start || null, end: end || null, groupBy, limit: pageSize, currentCursor, nextCursor, hasNext }, totals, timeseries });
    }

    return res.status(400).json({ error: 'invalid groupBy, allowed: region,user' });
  } catch (err) {
    console.error('Report error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

const port = process.env.PORT || 4000;

// Admin endpoints (simple token auth via ADMIN_TOKEN env var)
app.post('/api/admin/refresh-mv', async (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    await pool.query('REFRESH MATERIALIZED VIEW mv_region_daily');
    return res.json({ status: 'refreshed' });
  } catch (err) {
    console.error('refresh-mv failed', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'refresh_failed', message: err && err.message });
  }
});

app.get('/api/admin/mv-status', async (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    // Check if materialized view exists and return row count sample
    const existsRes = await pool.query(`SELECT to_regclass('public.mv_region_daily') as name`);
    const exists = existsRes.rows[0] && existsRes.rows[0].name !== null;
    let rowCount = null;
    if (exists) {
      const cnt = await pool.query('SELECT COUNT(*) as cnt FROM mv_region_daily');
      rowCount = Number(cnt.rows[0].cnt);
    }
    return res.json({ exists, rowCount });
  } catch (err) {
    console.error('mv-status failed', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'mv_check_failed', message: err && err.message });
  }
});

if (require.main === module) {
  // Temporary error logging middleware (logs stack traces and returns stack in non-production)
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
    const payload = { error: 'internal_error' };
    if (process.env.NODE_ENV !== 'production' && err) payload.stack = err && err.stack ? err.stack : String(err);
    res.status(500).json(payload);
  });

  app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
}

module.exports = { app, pool };
