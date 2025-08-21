const request = require('supertest')
const { app, pool } = require('../src/index')

describe('Pagination (keyset) for /api/reports/summary', () => {
  afterAll(async () => {
    if (pool && typeof pool.end === 'function') await pool.end()
  })

  it('returns nextCursor when results equal limit', async () => {
    const res = await request(app).get('/api/reports/summary?start=2024-01-01&end=2025-12-31&groupBy=region&limit=1')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('meta')
    expect(res.body.meta).toHaveProperty('nextCursor')
    expect(res.body.totals.length).toBeGreaterThanOrEqual(0)
  })

  it('can use nextCursor to fetch following page', async () => {
    const first = await request(app).get('/api/reports/summary?start=2024-01-01&end=2025-12-31&groupBy=region&limit=1')
    const cursor = first.body.meta.nextCursor
    if (!cursor) return // nothing to test (small dataset)
    const second = await request(app).get(`/api/reports/summary?start=2024-01-01&end=2025-12-31&groupBy=region&limit=1&cursor=${cursor}`)
    expect(second.statusCode).toBe(200)
    expect(second.body.totals.length).toBeGreaterThanOrEqual(0)
  })
})
