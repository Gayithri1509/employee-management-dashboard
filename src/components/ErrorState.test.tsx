import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ErrorState from './ErrorState'

describe('ErrorState', () => {
  it('shows the friendly message, never a raw technical one, and calls onRetry', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()

    render(<ErrorState message="Could not load employees. Please try again." onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load employees. Please try again.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
