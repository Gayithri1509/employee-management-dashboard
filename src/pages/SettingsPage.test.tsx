import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import SettingsPage from './SettingsPage'
import { useAuth, type AuthContextValue } from '../contexts/AuthContext'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { updateMyFullName } from '../services/supabase/profiles'

vi.mock('../contexts/AuthContext')
vi.mock('../layouts/appOutletContext')
vi.mock('../services/supabase/profiles')

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseAppOutletContext = vi.mocked(useAppOutletContext)
const mockedUpdateMyFullName = vi.mocked(updateMyFullName)

function baseAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    session: {} as never,
    user: { id: 'user-1', email: 'admin@example.com' } as never,
    profile: { id: 'user-1', full_name: 'Priya Nair', role: 'admin', created_at: 't', updated_at: 't' },
    role: 'admin' as const,
    loading: false,
    authError: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    refreshProfile: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockedUseAuth.mockReset()
  mockedUseAppOutletContext.mockReset()
  mockedUpdateMyFullName.mockReset()
  mockedUseAppOutletContext.mockReturnValue({ showToast: vi.fn() } as never)
})

describe('SettingsPage', () => {
  it("shows the profile's full name, email, and role", () => {
    mockedUseAuth.mockReturnValue(baseAuth())
    render(<SettingsPage />)

    expect(screen.getByLabelText('Full name')).toHaveValue('Priya Nair')
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('falls back to displaying the auth email when full_name is missing', () => {
    mockedUseAuth.mockReturnValue(baseAuth({ profile: { id: 'user-1', full_name: null, role: 'admin', created_at: 't', updated_at: 't' } }))
    render(<SettingsPage />)

    expect(screen.getByLabelText('Full name')).toHaveValue('')
  })

  it('disables Save until the name actually changes, and calls updateMyFullName on save', async () => {
    const refreshProfile = vi.fn()
    mockedUseAuth.mockReturnValue(baseAuth({ refreshProfile }))
    mockedUpdateMyFullName.mockResolvedValue({
      data: { id: 'user-1', full_name: 'New Name', role: 'admin', created_at: 't', updated_at: 't' },
      error: null,
    })
    const user = userEvent.setup()

    render(<SettingsPage />)
    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeDisabled()

    await user.clear(screen.getByLabelText('Full name'))
    await user.type(screen.getByLabelText('Full name'), 'New Name')
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    expect(mockedUpdateMyFullName).toHaveBeenCalledWith('New Name')
    expect(refreshProfile).toHaveBeenCalled()
  })

  it('does not render any control to change the user\'s own role', () => {
    mockedUseAuth.mockReturnValue(baseAuth())
    render(<SettingsPage />)

    expect(screen.queryByRole('combobox', { name: /role/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
  })

  it('signs out when Sign out is clicked', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    mockedUseAuth.mockReturnValue(baseAuth({ signOut }))
    const user = userEvent.setup()

    render(<SettingsPage />)
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledOnce()
  })
})
