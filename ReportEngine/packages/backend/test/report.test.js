const request = require('supertest')
const { app, pool } = require('../src/index')

describe('GET /api/reports/summary', () => {
  it('returns 400 for invalid dates', async () => {
    const res = await request(app).get('/api/reports/summary?start=invalid&end=2025-01-01')
    expect(res.statusCode).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns data for valid request', async () => {
    const res = await request(app).get('/api/reports/summary?start=2024-01-01&end=2025-12-31&groupBy=region&limit=2')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('meta')
    expect(res.body).toHaveProperty('totals')
    expect(Array.isArray(res.body.totals)).toBe(true)
  })
})

afterAll(async () => {
  if (pool && typeof pool.end === 'function') {
    await pool.end()
  }
})
