import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import EmployeesPage from './EmployeesPage'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { fetchLinkableProfiles, linkEmployeeProfile, unlinkEmployeeProfile } from '../services/supabase/employeeLinking'
import { getCapabilities } from '../lib/authorization'
import type { Employee } from '../types/employee'
import type { DepartmentRow } from '../types/database'

vi.mock('../layouts/appOutletContext')
vi.mock('../services/supabase/employees')
vi.mock('../services/supabase/employeeLinking')

const mockedUseAppOutletContext = vi.mocked(useAppOutletContext)
const mockedFetchLinkableProfiles = vi.mocked(fetchLinkableProfiles)
const mockedLinkEmployeeProfile = vi.mocked(linkEmployeeProfile)
const mockedUnlinkEmployeeProfile = vi.mocked(unlinkEmployeeProfile)

const engineering: DepartmentRow = { id: 'dept-1', name: 'Engineering', created_at: 't' }

const linkedEmployee: Employee = {
  id: 'emp-1',
  name: 'Priya Nair',
  role: 'Engineering Manager',
  department: 'Engineering',
  email: 'priya@example.com',
  phone: '555-0100',
  location: 'Remote',
  status: 'Active',
  joiningDate: '2020-01-01',
  profileId: 'user-1',
}

const unlinkedEmployee: Employee = {
  id: 'emp-2',
  name: 'Sai Kumar',
  role: 'Software Engineer',
  department: 'Engineering',
  email: 'sai@example.com',
  phone: '555-0101',
  location: 'Remote',
  status: 'Active',
  joiningDate: '2021-01-01',
  profileId: null,
}

function baseContext(capabilities = getCapabilities('admin')) {
  return {
    employees: [linkedEmployee, unlinkedEmployee],
    departments: [engineering],
    activityEntries: [],
    departmentNameById: { 'dept-1': 'Engineering' },
    loading: false,
    employeesError: null,
    departmentsError: null,
    activityError: null,
    refreshAll: vi.fn(),
    retryAll: vi.fn(),
    retryActivity: vi.fn(),
    capabilities,
    showToast: vi.fn(),
  }
}

function renderPage(context = baseContext()) {
  mockedUseAppOutletContext.mockReturnValue(context as never)
  render(
    <MemoryRouter>
      <EmployeesPage />
    </MemoryRouter>,
  )
  return context
}

beforeEach(() => {
  mockedUseAppOutletContext.mockReset()
  mockedFetchLinkableProfiles.mockReset()
  mockedLinkEmployeeProfile.mockReset()
  mockedUnlinkEmployeeProfile.mockReset()
})

describe('EmployeesPage employee-profile linking', () => {
  it('shows "Link account" for an unlinked employee and "Unlink account" for a linked one', () => {
    renderPage()

    expect(screen.getByRole('button', { name: 'Link account for Sai Kumar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlink account for Priya Nair' })).toBeInTheDocument()
  })

  it('hides both linking actions when the viewer lacks canManageEmployeeLinking (e.g. hr_staff)', () => {
    renderPage(baseContext(getCapabilities('hr_staff')))

    expect(screen.queryByRole('button', { name: 'Link account for Sai Kumar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unlink account for Priya Nair' })).not.toBeInTheDocument()
  })

  it('links an employee end-to-end: opens the picker, fetches linkable accounts, confirms, refreshes', async () => {
    const context = renderPage()
    mockedFetchLinkableProfiles.mockResolvedValue({
      data: [{ id: 'user-2', fullName: 'New Hire', email: 'new.hire@example.com' }],
      error: null,
    })
    mockedLinkEmployeeProfile.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Link account for Sai Kumar' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(mockedFetchLinkableProfiles).toHaveBeenCalledOnce()
    await within(dialog).findByText(/New Hire/)

    await user.selectOptions(within(dialog).getByLabelText('Account'), 'user-2')
    await user.click(within(dialog).getByRole('button', { name: 'Link Account' }))

    expect(mockedLinkEmployeeProfile).toHaveBeenCalledWith('emp-2', 'user-2')
    expect(dialog).not.toBeInTheDocument()
    expect(context.refreshAll).toHaveBeenCalled()
  })

  it('requires an explicit account selection before Link Account can be confirmed (no silent default)', async () => {
    renderPage()
    mockedFetchLinkableProfiles.mockResolvedValue({
      data: [{ id: 'user-2', fullName: 'New Hire', email: 'new.hire@example.com' }],
      error: null,
    })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Link account for Sai Kumar' }))
    const dialog = await screen.findByRole('alertdialog')
    await within(dialog).findByText(/New Hire/)

    expect(within(dialog).getByRole('button', { name: 'Link Account' })).toBeDisabled()
    expect(mockedLinkEmployeeProfile).not.toHaveBeenCalled()
  })

  it('shows a conflict error inside the link dialog without closing it', async () => {
    renderPage()
    mockedFetchLinkableProfiles.mockResolvedValue({
      data: [{ id: 'user-2', fullName: 'New Hire', email: 'new.hire@example.com' }],
      error: null,
    })
    mockedLinkEmployeeProfile.mockResolvedValue({
      error: 'This user account is already linked to a different employee record.',
    })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Link account for Sai Kumar' }))
    const dialog = await screen.findByRole('alertdialog')
    await within(dialog).findByText(/New Hire/)
    await user.selectOptions(within(dialog).getByLabelText('Account'), 'user-2')
    await user.click(within(dialog).getByRole('button', { name: 'Link Account' }))

    expect(await screen.findByText('This user account is already linked to a different employee record.')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('unlinks an employee end-to-end: confirm dialog, then refreshes', async () => {
    const context = renderPage()
    mockedUnlinkEmployeeProfile.mockResolvedValue({ error: null })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Unlink account for Priya Nair' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Unlink' }))

    expect(mockedUnlinkEmployeeProfile).toHaveBeenCalledWith('emp-1')
    expect(context.refreshAll).toHaveBeenCalled()
  })
})
