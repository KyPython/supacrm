# ReportEngine (scaffold)

Monorepo scaffold for the ReportEngine project.

Quick start

1. Install dependencies from the repository root:

```bash
npm install
```

2. From the root start both services:

```bash
npm run dev
```

This starts the backend on port 4000 and the frontend on port 5173 by default.

Database seeding

1. Start a Postgres instance (local or Supabase) and get a `DATABASE_URL`.
2. From the backend package, run:

```bash
cd packages/backend
npm install
DATABASE_URL=postgresql://user:pass@localhost:5432/reportengine npm run seed
```

This will create tables and insert sample regions, 500 users, and 5,000 transactions.

Admin tasks

1. Create indexes and optional materialized view (run in psql or via migration):

```bash
psql $DATABASE_URL -f packages/backend/migrations/001_add_indexes_and_mv.sql
```

2. Populate/refresh materialized view:

```bash
export DATABASE_URL='postgresql://USER:PASS@HOST:5432/reportengine'
node packages/backend/scripts/refresh_mv.js
```

3. Check MV status or refresh via admin endpoints (protect with ADMIN_TOKEN):

```bash
# set token
export ADMIN_TOKEN=your-secret
# check
curl -H "x-admin-token: $ADMIN_TOKEN" http://localhost:4000/api/admin/mv-status
# refresh
curl -X POST -H "x-admin-token: $ADMIN_TOKEN" http://localhost:4000/api/admin/refresh-mv
```

## Docker-based local dev (quick)

If you use Docker Desktop you can run a local Postgres and iterate quickly:

1. Start Postgres:

```bash
docker compose up -d db
```

2. Apply migrations, seed data, and refresh materialized view:

```bash
export DATABASE_URL='postgresql://user:pass@localhost:5432/reportengine'
psql "$DATABASE_URL" -f packages/backend/migrations/001_add_indexes_and_mv.sql
cd packages/backend
node src/seed.js
node scripts/refresh_mv.js
```

3. Start servers:

```bash
# backend
export USE_MV=true
export ADMIN_TOKEN=admintoken
cd packages/backend
npm install
npm run dev

# frontend (in a separate terminal)
cd packages/frontend
npm install
npm run dev
```

4. Helpful commands:

```bash
# check MV row count
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM mv_region_daily;"

# run explain helper
node packages/backend/scripts/explain.js
```

## Verification & Benchmark

I ran smoke tests and a small benchmark against the local stack (Postgres + backend).

- Smoke test endpoints saved to `packages/backend/tmp/smoke.json` (health + /api/reports/summary sample response).
- Benchmark (100 sequential requests) saved to `packages/backend/tmp/benchmark.json`.

Benchmark summary (100 runs against `/api/reports/summary?start=2024-01-01&end=2025-08-20&groupBy=region&limit=10`):

- mean: ~12.8 ms
- p50: 12 ms
- p90: 13 ms
- p95: 14 ms
- p99: 30 ms
- min: 9 ms, max: 68 ms

Notes:

- Tests: backend and frontend tests pass in the repository (run `npm test` in each package).
- EXPLAIN: the included `scripts/explain.js` prints a plan showing a sequential scan on `transactions` for the sample dataset; recommended indexes are provided in `packages/backend/migrations/001_add_indexes_and_mv.sql`.
- Materialized view: `mv_region_daily` can be created/refreshed via `packages/backend/scripts/refresh_mv.js` to accelerate region-level queries.

Next steps:

- If you plan to run a production-like workload, apply the recommended indexes and refresh the materialized view before benchmarking.
- Optionally build Docker images and run the full stack with `docker compose up --build` for a full integration smoke test.

## Compose integration benchmark

I updated the migrations to include a composite index on `(region_id, created_at)` and added `backend` and `frontend` services to `docker-compose.yml` so the full stack can be built and run.

I ran the compose stack locally, seeded the DB, applied the migration, refreshed the materialized view, and ran a 100-request benchmark against the compose-hosted backend. Results saved to `packages/backend/tmp/benchmark_compose.json`.

Compose benchmark summary (100 runs):

- mean: ~15.9 ms
- p50: 15 ms
- p90: 20 ms
- p95: 21 ms
- p99: 25 ms
- min: 10 ms, max: 59 ms

CI: I added an `integration` job to `.github/workflows/ci.yml` which builds the compose stack and runs basic smoke tests.
