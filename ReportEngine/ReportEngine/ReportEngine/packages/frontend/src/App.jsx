import React, { useEffect, useState } from 'react'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [start, setStart] = useState(() => new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString().split('T')[0])
  const [end, setEnd] = useState(() => new Date().toISOString().split('T')[0])
  const [groupBy, setGroupBy] = useState('region')
  const [limit, setLimit] = useState(10)
  const [cursor, setCursor] = useState(null) // base64 cursor from server (null = first page)
  const [prevStack, setPrevStack] = useState([]) // stack of previous cursors for Prev
  const [error, setError] = useState(null)

  // debounce fetch
  useEffect(() => {
    const t = setTimeout(() => {
      // reset pagination when filters change
      setPrevStack([])
      setCursor(null)
      fetchData(null)
    }, 300)
    return () => clearTimeout(t)
  }, [start, end, groupBy, limit])

  useEffect(() => {
    fetchData()
  }, [])
  // fetchData optionally accepts an explicit cursor (override). If overrideCursor === null, it fetches the first page.
  function fetchData(overrideCursor) {
    setLoading(true)
    setError(null)
    const useCursor = typeof overrideCursor !== 'undefined' ? overrideCursor : cursor
    const url = new URL('http://localhost:4000/api/reports/summary')
    url.searchParams.set('start', start)
    url.searchParams.set('end', end)
    url.searchParams.set('groupBy', groupBy)
    url.searchParams.set('limit', String(limit))
    if (useCursor) url.searchParams.set('cursor', useCursor)

    fetch(url.toString())
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || 'server_error')
        }
        return r.json()
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  // update cursor state whenever we receive data meta from server
  useEffect(() => {
    if (!data || !data.meta) return
    // server provides meta.currentCursor (the cursor used to produce this page)
    setCursor(data.meta.currentCursor || null)
  }, [data])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>ReportEngine - Summary</h1>
  <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <label>Start
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label>End
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={{ marginLeft: 6 }} />
        </label>
        <label>Group By
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ marginLeft: 6 }}>
            <option value="region">Region</option>
            <option value="user">User</option>
          </select>
        </label>
        <label>Limit
          <input type="number" value={limit} min={1} max={1000} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 80, marginLeft: 6 }} />
        </label>
  {/* Page input removed for keyset cursor pagination; use Prev/Next buttons below */}
        <button onClick={fetchData} style={{ marginLeft: 6 }}>Refresh</button>
      </div>
      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>Error: {error}</div>}
      {loading && <p>Loading...</p>}
      {!loading && !data && <p>No data</p>}
      {data && (
        <div>
          <h2>Meta</h2>
          <pre>{JSON.stringify(data.meta, null, 2)}</pre>

          <h2>Totals</h2>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>Region</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Count</th>
                <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.totals.map((t) => (
                <tr key={t.key}>
                  <td style={{ padding: '8px 4px' }}>{t.key}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{t.count}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>${t.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ marginTop: 24 }}>Timeseries</h2>
          {data.timeseries && data.timeseries.length > 0 ? (
            <div style={{ maxWidth: 900 }}>
              <LineChart data={data.timeseries} width={800} height={220} />
            </div>
          ) : (
            <p>No timeseries data</p>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
            <button
              onClick={() => {
                if (prevStack.length === 0) return
                const prev = prevStack[prevStack.length - 1]
                setPrevStack((s) => s.slice(0, -1))
                // prev may be null (first page)
                setCursor(prev)
                fetchData(prev)
              }}
              disabled={prevStack.length === 0}
            >Prev</button>
            <div>Page {prevStack.length + 1}</div>
            <button
              onClick={() => {
                const next = data?.meta?.nextCursor
                if (!next) return
                // push the server-reported currentCursor (can be null) onto stack then navigate
                const current = data?.meta?.currentCursor || null
                setPrevStack((s) => [...s, current])
                setCursor(next)
                fetchData(next)
              }}
              disabled={!data?.meta?.hasNext}
            >Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

function LineChart({ data, width = 800, height = 200 }) {
  // data: [{date: 'YYYY-MM-DD', value: number}, ...]
  const padding = 24
  const values = data.map(d => d.value)
  const dates = data.map(d => d.date)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(1, values.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  // simple x ticks: show first, middle, last
  const ticks = [0, Math.floor((dates.length-1)/2), dates.length-1].map(i => ({ x: padding + (i / Math.max(1, dates.length - 1)) * (width - padding * 2), label: dates[i] }))

  return (
    <svg width={width} height={height} style={{ background: '#fff', border: '1px solid #eee' }}>
      <polyline points={points} fill="none" stroke="#2b7cff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v,i) => {
        const [xStr, yStr] = points.split(' ')[i].split(',')
        return <circle key={i} cx={xStr} cy={yStr} r={2.5} fill="#2b7cff" />
      })}
      {ticks.map((t, idx) => (
        <g key={idx} transform={`translate(${t.x}, ${height - padding + 6})`}>
          <text x={0} y={0} fontSize={10} textAnchor="middle">{t.label}</text>
        </g>
      ))}
    </svg>
  )
}
