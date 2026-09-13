import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmployeeFormModal, { type EmployeeFormValues } from './EmployeeFormModal'

const emptyValues: EmployeeFormValues = {
  name: '',
  role: '',
  department: 'Engineering',
  email: '',
  phone: '',
  location: '',
  joiningDate: '2024-01-01',
}

const filledValues: EmployeeFormValues = {
  name: 'Ada Lovelace',
  role: 'Engineer',
  department: 'Engineering',
  email: 'ada@example.com',
  phone: '555-0100',
  location: 'Remote',
  joiningDate: '2024-01-01',
}

describe('EmployeeFormModal', () => {
  it('shows "Add Employee" as the heading and submit label in create mode', () => {
    render(
      <EmployeeFormModal
        mode="create"
        initialValues={emptyValues}
        departments={['Engineering']}
        canChangeDepartment
        submitting={false}
        submitError={null}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Add Employee' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Employee' })).toBeInTheDocument()
  })

  it('blocks submission and shows validation errors for empty required fields', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <EmployeeFormModal
        mode="create"
        initialValues={emptyValues}
        departments={['Engineering']}
        canChangeDepartment
        submitting={false}
        submitError={null}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Employee' }))

    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with the entered values once validation passes', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <EmployeeFormModal
        mode="create"
        initialValues={filledValues}
        departments={['Engineering']}
        canChangeDepartment
        submitting={false}
        submitError={null}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Employee' }))

    expect(onSubmit).toHaveBeenCalledWith(filledValues)
  })

  it('disables the department field when canChangeDepartment is false', () => {
    render(
      <EmployeeFormModal
        mode="edit"
        employeeId="emp-1"
        initialValues={filledValues}
        departments={['Engineering', 'Design']}
        canChangeDepartment={false}
        submitting={false}
        submitError={null}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Department')).toBeDisabled()
  })

  it('shows the submit error and disables inputs while submitting (prevents double-submit)', () => {
    render(
      <EmployeeFormModal
        mode="create"
        initialValues={filledValues}
        departments={['Engineering']}
        canChangeDepartment
        submitting
        submitError="An employee with this email already exists."
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('An employee with this email already exists.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })
})
