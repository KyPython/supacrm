-- Migration: add indexes for reporting and materialized view

CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions (amount);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_at ON transactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_region_id ON users (region_id);
-- Create composite index only if the column exists (safe for varying schemas)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'region_id'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_region_created_at ON transactions (region_id, created_at)';
    END IF;
END
$$;

-- Optional BRIN for large append-only time-series
CREATE INDEX IF NOT EXISTS brin_transactions_created_at ON transactions USING BRIN (created_at);

-- Materialized view (create without data; use refresh script to populate)
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

CREATE INDEX IF NOT EXISTS idx_mv_region_daily_day_region ON mv_region_daily (day, region_id);
