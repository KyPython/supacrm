import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../src/App'

beforeEach(() => {
  jest.restoreAllMocks()
})

console.log('[test] App.test.jsx loaded')

test('renders header and form controls', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ meta: { currentCursor: null, nextCursor: null, hasNext: false }, totals: [], timeseries: [] }) }))
  render(<App />)
  expect(screen.getByText(/ReportEngine - Summary/i)).toBeInTheDocument()
  // wait for initial fetch
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
})

test('Next button enables/disables based on hasNext and clicking triggers fetch', async () => {
  // first call: hasNext true, second call: hasNext false
  const first = { meta: { currentCursor: null, nextCursor: 'cursor-1', hasNext: true }, totals: [], timeseries: [] }
  const second = { meta: { currentCursor: 'cursor-1', nextCursor: null, hasNext: false }, totals: [], timeseries: [] }
  let call = 0
  global.fetch = jest.fn(() => {
    call += 1
    return Promise.resolve({ ok: true, json: () => Promise.resolve(call === 1 ? first : second) })
  })

  render(<App />)
  // wait for first fetch
  await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  const nextBtn = screen.getByRole('button', { name: /Next/i })
  expect(nextBtn).toBeEnabled()

  // click Next
  fireEvent.click(nextBtn)
  // wait for second fetch
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
  // Next should now be disabled because hasNext is false in second response
  await waitFor(() => expect(nextBtn).toBeDisabled())
})
