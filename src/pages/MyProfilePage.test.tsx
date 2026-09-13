import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import MyProfilePage from './MyProfilePage'
import { useAppOutletContext } from '../layouts/appOutletContext'
import { updateEmployeeSelf } from '../services/supabase/employees'
import type { Employee } from '../types/employee'

vi.mock('../layouts/appOutletContext')
vi.mock('../services/supabase/employees')

const mockedUseAppOutletContext = vi.mocked(useAppOutletContext)
const mockedUpdateEmployeeSelf = vi.mocked(updateEmployeeSelf)

const myEmployee: Employee = {
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

function baseContext(overrides: Partial<ReturnType<typeof useAppOutletContext>> = {}) {
  return {
    employees: [],
    departments: [],
    activityEntries: [],
    departmentNameById: {},
    loading: false,
    employeesError: null,
    departmentsError: null,
    activityError: null,
    refreshAll: vi.fn(),
    retryAll: vi.fn(),
    retryActivity: vi.fn(),
    capabilities: {} as never,
    showToast: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockedUseAppOutletContext.mockReset()
  mockedUpdateEmployeeSelf.mockReset()
})

describe('MyProfilePage', () => {
  it('shows a loading state while org data is loading', () => {
    mockedUseAppOutletContext.mockReturnValue(baseContext({ loading: true }))
    render(<MyProfilePage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows "Profile not linked" when the employee record RLS returns is empty', () => {
    mockedUseAppOutletContext.mockReturnValue(baseContext({ employees: [] }))
    render(<MyProfilePage />)
    expect(screen.getByText('Profile not linked')).toBeInTheDocument()
  })

  it("shows only the caller's own employee info when linked", () => {
    mockedUseAppOutletContext.mockReturnValue(baseContext({ employees: [myEmployee] }))
    render(<MyProfilePage />)

    expect(screen.getByText('Priya Nair')).toBeInTheDocument()
    expect(screen.getByText('priya@example.com')).toBeInTheDocument()
    expect(screen.queryByText('Profile not linked')).not.toBeInTheDocument()
  })

  it('lets the employee edit only phone/location, sending no employee id', async () => {
    mockedUpdateEmployeeSelf.mockResolvedValue({ data: { ...myEmployee, phone: '555-9999' }, error: null })
    mockedUseAppOutletContext.mockReturnValue(baseContext({ employees: [myEmployee] }))
    const user = userEvent.setup()

    render(<MyProfilePage />)
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Phone'))
    await user.type(screen.getByLabelText('Phone'), '555-9999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockedUpdateEmployeeSelf).toHaveBeenCalledWith({ phone: '555-9999', location: 'Remote' }, {})
  })

  it('does not expose department/status/name as editable self-service fields', async () => {
    mockedUseAppOutletContext.mockReturnValue(baseContext({ employees: [myEmployee] }))
    const user = userEvent.setup()

    render(<MyProfilePage />)
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.queryByLabelText('Department')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
  })
})
