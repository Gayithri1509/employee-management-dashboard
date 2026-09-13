import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import App from './App'
import { getCurrentSession, onAuthStateChange } from './services/supabase/auth'
import { fetchProfileById } from './services/supabase/profiles'
import { fetchEmployeesWithDepartments } from './services/supabase/employees'
import { fetchDepartments } from './services/supabase/departments'
import { fetchActivityEntries } from './services/supabase/activityLogs'
import { fetchUsersForAdmin } from './services/supabase/users'
import type { UserRole } from './types/database'

// Exercises the real route tree (App -> AuthGate -> AppLayout -> RequireCapability
// -> page) with only the Supabase network boundary mocked, so this is a genuine
// check of route-level authorization -- not just the capability matrix in
// isolation. Uses window.history.pushState + the app's real BrowserRouter to
// simulate a direct URL visit, per "direct URL access must also respect
// authorization" / "browser refresh must preserve correct auth/role behavior."
vi.mock('./services/supabase/auth')
vi.mock('./services/supabase/profiles')
vi.mock('./services/supabase/employees')
vi.mock('./services/supabase/departments')
vi.mock('./services/supabase/activityLogs')
vi.mock('./services/supabase/users')

const mockedGetCurrentSession = vi.mocked(getCurrentSession)
const mockedOnAuthStateChange = vi.mocked(onAuthStateChange)
const mockedFetchProfileById = vi.mocked(fetchProfileById)
const mockedFetchEmployees = vi.mocked(fetchEmployeesWithDepartments)
const mockedFetchDepartments = vi.mocked(fetchDepartments)
const mockedFetchActivity = vi.mocked(fetchActivityEntries)
const mockedFetchUsersForAdmin = vi.mocked(fetchUsersForAdmin)

function mockSignedInAs(role: UserRole) {
  mockedGetCurrentSession.mockResolvedValue({
    session: { user: { id: 'user-1', email: 'user@example.com' } } as never,
    error: null,
  })
  mockedOnAuthStateChange.mockReturnValue(() => {})
  mockedFetchProfileById.mockResolvedValue({
    data: { id: 'user-1', full_name: 'Test User', role, created_at: 't', updated_at: 't' },
    error: null,
  })
  mockedFetchEmployees.mockResolvedValue({ data: [], error: null })
  mockedFetchDepartments.mockResolvedValue({ data: [], error: null })
  mockedFetchActivity.mockResolvedValue({ data: [], error: null })
  mockedFetchUsersForAdmin.mockResolvedValue({ data: [], error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App routing + RBAC (direct URL access)', () => {
  it('redirects an unauthenticated visit to any path to Sign In', async () => {
    mockedGetCurrentSession.mockResolvedValue({ session: null, error: null })
    mockedOnAuthStateChange.mockReturnValue(() => {})
    window.history.pushState({}, '', '/employees')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in to EMS' })).toBeInTheDocument()
  })

  it('redirects an authenticated admin from "/" to the dashboard', async () => {
    mockSignedInAs('admin')

    render(<App />)

    expect(await screen.findByRole('heading', { name: /Monitor your organization/i })).toBeInTheDocument()
  })

  it('blocks hr_staff from /departments via direct URL, even though the route exists for admins', async () => {
    mockSignedInAs('hr_staff')
    window.history.pushState({}, '', '/departments')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })

  it('lets an admin reach /departments directly', async () => {
    mockSignedInAs('admin')
    window.history.pushState({}, '', '/departments')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Departments' })).toBeInTheDocument()
  })

  it("blocks an employee from /employees via direct URL and sends them to their own profile only", async () => {
    mockSignedInAs('employee')
    window.history.pushState({}, '', '/employees')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })

  it('blocks hr_manager from /users via direct URL -- User & Access is admin-only', async () => {
    mockSignedInAs('hr_manager')
    window.history.pushState({}, '', '/users')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })

  it('lets an admin reach /users directly', async () => {
    mockSignedInAs('admin')
    window.history.pushState({}, '', '/users')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'User & Access' })).toBeInTheDocument()
  })

  it('blocks hr_staff from /users via direct URL -- role management is admin-only', async () => {
    mockSignedInAs('hr_staff')
    window.history.pushState({}, '', '/users')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })

  it.each(['/departments', '/activity', '/insights', '/users'])(
    'blocks an employee from %s via direct URL -- no organization-wide or privileged data',
    async (path) => {
      mockSignedInAs('employee')
      window.history.pushState({}, '', path)

      render(<App />)

      expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    },
  )

  it('lets an employee reach their own /my-profile directly (route access succeeds; no employee record is linked in this mock, so the page correctly shows its own "not linked" state)', async () => {
    mockSignedInAs('employee')
    window.history.pushState({}, '', '/my-profile')

    render(<App />)

    expect(await screen.findByText('Profile not linked')).toBeInTheDocument()
  })

  it('redirects an authenticated employee from "/" to their own profile route, not the org dashboard', async () => {
    mockSignedInAs('employee')

    render(<App />)

    expect(await screen.findByText('Profile not linked')).toBeInTheDocument()
  })

  it('lets an employee reach their own /settings directly', async () => {
    mockSignedInAs('employee')
    window.history.pushState({}, '', '/settings')

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
