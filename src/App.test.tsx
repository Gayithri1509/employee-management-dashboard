import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

// Stage 3.3: verifies the BrowserRouter wrapper introduced for routing
// groundwork does not change the existing auth-gate behavior. The Supabase
// auth/profile services are mocked so this test never makes a network call.
vi.mock('./services/supabase/auth', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({ session: null, error: null }),
  onAuthStateChange: vi.fn().mockReturnValue(() => {}),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('./services/supabase/profiles', () => ({
  fetchProfileById: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

describe('App', () => {
  it('renders the sign-in page when there is no session', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in to EMS' })).toBeInTheDocument()
  })
})
