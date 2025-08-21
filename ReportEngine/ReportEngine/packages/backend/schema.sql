-- Schema for ReportEngine

CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  region_id INT REFERENCES regions(id)
);

CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Useful indexes for reporting queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);
-- index on user_id (used when aggregating by user or joining users)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions (amount);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_at ON transactions (user_id, created_at);
-- region is stored on users table; index it for faster joins/grouping by region
CREATE INDEX IF NOT EXISTS idx_users_region_id ON users (region_id);

-- Optional: materialized view for daily region totals (useful for dashboards)
-- Run the create/refresh script in packages/backend/scripts to create and populate.
--
-- CREATE MATERIALIZED VIEW mv_region_daily AS
-- SELECT date_trunc('day', t.created_at)::date AS day,
--        r.id AS region_id,
--        r.name AS region_name,
--        SUM(t.amount)::numeric(18,2) AS total_amount,
--        COUNT(*) AS tx_count
-- FROM transactions t
-- JOIN users u ON u.id = t.user_id
-- JOIN regions r ON r.id = u.region_id
-- GROUP BY day, r.id, r.name
-- WITH DATA;
-- CREATE INDEX idx_mv_region_daily_day_region ON mv_region_daily (day, region_id);