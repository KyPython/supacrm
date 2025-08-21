import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../src/App'
console.log('[test] App.extra.test.jsx loaded')

beforeEach(() => jest.restoreAllMocks())

test('filter changes trigger a new fetch with updated query params', async () => {
  const first = { meta: { currentCursor: null, nextCursor: null, hasNext: false }, totals: [], timeseries: [] }
  const second = { meta: { currentCursor: null, nextCursor: null, hasNext: false }, totals: [], timeseries: [] }
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(first) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(second) })
  global.fetch = fetchMock

  render(<App />)
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

  // change the limit input which should trigger a debounced fetch
  const limitInput = screen.getByLabelText(/Limit/i)
  fireEvent.change(limitInput, { target: { value: '5' } })

  // wait for debounced fetch to fire
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 1500 })
  // assert the last call included the updated limit param
  const lastUrl = new URL(fetchMock.mock.calls[1][0])
  expect(lastUrl.searchParams.get('limit')).toBe('5')
})

test('shows server error message when API responds with non-ok', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'invalid_range' }) }))
  render(<App />)
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  expect(await screen.findByText(/Error:/i)).toBeInTheDocument()
  expect(screen.getByText(/invalid_range/i)).toBeInTheDocument()
})

test('LineChart renders svg and points for timeseries data', async () => {
  const payload = {
    meta: { currentCursor: null, nextCursor: null, hasNext: false },
    totals: [],
    timeseries: [
      { date: '2025-08-01', value: 10 },
      { date: '2025-08-02', value: 20 },
      { date: '2025-08-03', value: 5 },
      { date: '2025-08-04', value: 15 }
    ]
  }
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) }))
  render(<App />)
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  // verify svg exists and circle markers match data points (wait for render)
  await waitFor(() => expect(document.querySelector('svg')).toBeInTheDocument())
  const svg = document.querySelector('svg')
  const circles = svg.querySelectorAll('circle')
  expect(circles.length).toBe(4)
})
