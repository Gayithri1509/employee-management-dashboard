import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RequireCapability from './RequireCapability'
import { useCapabilities } from '../hooks/useCapabilities'
import { getCapabilities } from '../lib/authorization'

vi.mock('../hooks/useCapabilities')

const mockedUseCapabilities = vi.mocked(useCapabilities)

describe('RequireCapability', () => {
  it('renders children when the current user has the required capability', () => {
    mockedUseCapabilities.mockReturnValue(getCapabilities('admin'))

    render(
      <MemoryRouter>
        <RequireCapability capability="canManageDepartments">
          <p>Departments page</p>
        </RequireCapability>
      </MemoryRouter>,
    )

    expect(screen.getByText('Departments page')).toBeInTheDocument()
  })

  it('renders Access Denied when the current user lacks the required capability', () => {
    mockedUseCapabilities.mockReturnValue(getCapabilities('hr_staff'))

    render(
      <MemoryRouter>
        <RequireCapability capability="canManageDepartments">
          <p>Departments page</p>
        </RequireCapability>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Departments page')).not.toBeInTheDocument()
    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })

  it("blocks an employee from an org-wide route it has no capability for", () => {
    mockedUseCapabilities.mockReturnValue(getCapabilities('employee'))

    render(
      <MemoryRouter>
        <RequireCapability capability="canViewEmployees">
          <p>Employee directory</p>
        </RequireCapability>
      </MemoryRouter>,
    )

    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })
})
