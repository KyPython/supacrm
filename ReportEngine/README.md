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
