const http = require('http');
const fs = require('fs');

const url = 'http://localhost:4000/api/reports/summary?start=2024-01-01&end=2025-08-20&groupBy=region&limit=10';
const runs = parseInt(process.env.RUNS || '100', 10);

async function call() {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    http.get(url, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => resolve({ status: res.statusCode, time: Date.now() - t0, size: body.length }));
    }).on('error', reject);
  });
}

(async () => {
  const results = [];
  for (let i = 0; i < runs; i++) {
    try {
      const r = await call();
      results.push(r);
      if ((i+1) % 10 === 0) process.stdout.write(`.${i+1}`);
    } catch (e) {
      results.push({ status: 0, time: null, error: String(e) });
    }
  }
  console.log('\nBenchmark finished.');
  const times = results.filter(r => typeof r.time === 'number').map(r => r.time).sort((a,b)=>a-b);
  const count = times.length;
  const sum = times.reduce((s,v)=>s+v,0);
  const mean = count ? sum / count : null;
  const p = (p) => { if (!count) return null; const idx = Math.floor((p/100) * (count-1)); return times[idx]; };
  const stats = { runs, count, mean, min: times[0]||null, max: times[count-1]||null, p50: p(50), p90: p(90), p95: p(95), p99: p(99) };
  const out = { stats, results };
  const outPath = '/Users/ky/Desktop/GitHub/VS_Code/ReportEngine/ReportEngine/packages/backend/tmp/benchmark.json';
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Saved', outPath, stats);
})();
