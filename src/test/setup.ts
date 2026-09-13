import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Without vitest's `globals: true` (deliberately not enabled -- see
// vitest.config.ts), Testing Library's automatic afterEach(cleanup) can't
// find a global `afterEach` to hook into, so unmounted-but-still-rendered
// DOM from one test leaks into the next within the same file. Registering
// it explicitly here fixes that for every test file at once.
afterEach(() => {
  cleanup()
})
