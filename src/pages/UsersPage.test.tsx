import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import UsersPage from './UsersPage'
import { useAuth } from '../contexts/AuthContext'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { fetchUsersForAdmin, setUserRole } from '../services/supabase/users'
import type { AdminUser } from '../services/supabase/users'

vi.mock('../contexts/AuthContext')
vi.mock('../layouts/appOutletContext')
vi.mock('../services/supabase/users')

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseAppOutletContext = vi.mocked(useAppOutletContext)
const mockedFetchUsersForAdmin = vi.mocked(fetchUsersForAdmin)
const mockedSetUserRole = vi.mocked(setUserRole)

const currentAdmin: AdminUser = {
  id: 'admin-1',
  fullName: 'Ada Admin',
  email: 'ada@example.com',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00Z',
  lastSignInAt: '2024-06-01T00:00:00Z',
}

const testEmployee: AdminUser = {
  id: 'emp-1',
  fullName: 'Sai Kumar',
  email: 'sai@example.com',
  role: 'employee',
  createdAt: '2024-01-01T00:00:00Z',
  lastSignInAt: null,
}

beforeEach(() => {
  mockedUseAuth.mockReset()
  mockedUseAppOutletContext.mockReset()
  mockedFetchUsersForAdmin.mockReset()
  mockedSetUserRole.mockReset()
  mockedUseAuth.mockReturnValue({ user: { id: 'admin-1' } } as never)
  mockedUseAppOutletContext.mockReturnValue({ showToast: vi.fn() } as never)
})

describe('UsersPage', () => {
  it('shows a loading state, then the user list', async () => {
    mockedFetchUsersForAdmin.mockResolvedValue({ data: [currentAdmin, testEmployee], error: null })
    render(<UsersPage />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('Sai Kumar')).toBeInTheDocument()
    expect(screen.getByText('Ada Admin')).toBeInTheDocument()
  })

  it('shows an empty state when there are no users', async () => {
    mockedFetchUsersForAdmin.mockResolvedValue({ data: [], error: null })
    render(<UsersPage />)

    expect(await screen.findByText('No users yet')).toBeInTheDocument()
  })

  it('shows an error state with retry on failure', async () => {
    mockedFetchUsersForAdmin.mockResolvedValue({ data: null, error: 'Could not load users. Please try again.' })
    const user = userEvent.setup()
    render(<UsersPage />)

    expect(await screen.findByText('Could not load users. Please try again.')).toBeInTheDocument()

    mockedFetchUsersForAdmin.mockResolvedValue({ data: [testEmployee], error: null })
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Sai Kumar')).toBeInTheDocument()
  })

  it("disables Change Role for the signed-in admin's own row", async () => {
    mockedFetchUsersForAdmin.mockResolvedValue({ data: [currentAdmin, testEmployee], error: null })
    render(<UsersPage />)
    await screen.findByText('Sai Kumar')

    const buttons = screen.getAllByRole('button', { name: 'Change Role' })
    // currentAdmin renders first (order preserved from the service result).
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeEnabled()
  })

  it('changes a role end-to-end: confirm dialog -> setUserRole -> refreshes the list', async () => {
    mockedFetchUsersForAdmin
      .mockResolvedValueOnce({ data: [currentAdmin, testEmployee], error: null })
      .mockResolvedValueOnce({ data: [currentAdmin, { ...testEmployee, role: 'hr_manager' }], error: null })
    mockedSetUserRole.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    render(<UsersPage />)
    await screen.findByText('Sai Kumar')

    const buttons = screen.getAllByRole('button', { name: 'Change Role' })
    await user.click(buttons[1])

    const dialog = screen.getByRole('alertdialog')
    await user.selectOptions(screen.getByLabelText('New role'), 'hr_manager')
    await user.click(within(dialog).getByRole('button', { name: 'Change Role' }))

    expect(mockedSetUserRole).toHaveBeenCalledWith('emp-1', 'hr_manager')
    expect(dialog).not.toBeInTheDocument()
    expect(mockedFetchUsersForAdmin).toHaveBeenCalledTimes(2)
  })

  it('shows a server-side rejection (e.g. last-admin protection) inside the dialog without closing it', async () => {
    mockedFetchUsersForAdmin.mockResolvedValue({ data: [currentAdmin, testEmployee], error: null })
    mockedSetUserRole.mockResolvedValue({ error: 'Cannot change this role: at least one Admin must remain.' })
    const user = userEvent.setup()

    render(<UsersPage />)
    await screen.findByText('Sai Kumar')

    await user.click(screen.getAllByRole('button', { name: 'Change Role' })[1])
    const dialog = screen.getByRole('alertdialog')
    await user.selectOptions(within(dialog).getByLabelText('New role'), 'hr_manager')
    await user.click(within(dialog).getByRole('button', { name: 'Change Role' }))

    expect(await screen.findByText('Cannot change this role: at least one Admin must remain.')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
