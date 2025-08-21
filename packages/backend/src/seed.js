const { Client } = require('pg')
const faker = require('faker')

// Minimal configurable seeder. Set DATABASE_URL env var before running.
// Example:
// DATABASE_URL=postgresql://user:pass@localhost:5432/reportengine node src/seed.js

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Please set DATABASE_URL environment variable')
  process.exit(1)
}

const client = new Client({ connectionString: DATABASE_URL })

async function run() {
  await client.connect()

  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS regions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      region_id INT REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      amount NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `)

  // Seed regions
  const regions = ['North','South','East','West']
  await client.query('TRUNCATE regions, users, transactions RESTART IDENTITY CASCADE')
  for (const r of regions) {
    await client.query('INSERT INTO regions (name) VALUES ($1)', [r])
  }

  // Seed users
  const users = []
  for (let i = 0; i < 500; i++) {
    const name = faker.name.findName()
    const email = faker.internet.email()
    const region_id = Math.floor(Math.random() * regions.length) + 1
    const res = await client.query('INSERT INTO users (name,email,region_id) VALUES ($1,$2,$3) RETURNING id', [name,email,region_id])
    users.push(res.rows[0].id)
  }

  // Seed transactions
  const now = new Date()
  for (let i = 0; i < 5000; i++) {
    const user_id = users[Math.floor(Math.random() * users.length)]
    const amount = (Math.random() * 1000).toFixed(2)
    const days = Math.floor(Math.random() * 365)
    const created_at = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    await client.query('INSERT INTO transactions (user_id,amount,created_at) VALUES ($1,$2,$3)', [user_id, amount, created_at])
  }

  console.log('Seeding complete')
  await client.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
