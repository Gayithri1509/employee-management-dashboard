import { describe, expect, it } from 'vitest'
import { sortEmployees } from './employeeSort'
import type { Employee } from '../types/employee'

function makeEmployee(overrides: Partial<Employee>): Employee {
  return {
    id: '1',
    name: 'A',
    role: 'Engineer',
    department: 'Engineering',
    email: 'a@example.com',
    phone: '',
    location: '',
    status: 'Active',
    joiningDate: '2020-01-01',
    profileId: null,
    ...overrides,
  }
}

const employees: Employee[] = [
  makeEmployee({ id: '1', name: 'Charlie', joiningDate: '2019-06-01', status: 'Inactive' }),
  makeEmployee({ id: '2', name: 'Alice', joiningDate: '2021-01-01', status: 'Active' }),
  makeEmployee({ id: '3', name: 'Bob', joiningDate: '2020-01-01', status: 'On Leave' }),
]

describe('sortEmployees', () => {
  it('sorts by name A-Z', () => {
    expect(sortEmployees(employees, 'name-asc').map((e) => e.name)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts by name Z-A', () => {
    expect(sortEmployees(employees, 'name-desc').map((e) => e.name)).toEqual(['Charlie', 'Bob', 'Alice'])
  })

  it('sorts by joining date, newest first', () => {
    expect(sortEmployees(employees, 'joining-newest').map((e) => e.id)).toEqual(['2', '3', '1'])
  })

  it('sorts by joining date, oldest first', () => {
    expect(sortEmployees(employees, 'joining-oldest').map((e) => e.id)).toEqual(['1', '3', '2'])
  })

  it('sorts by status in Active, On Leave, Inactive order', () => {
    expect(sortEmployees(employees, 'status').map((e) => e.status)).toEqual(['Active', 'On Leave', 'Inactive'])
  })

  it('never mutates the input array', () => {
    const original = [...employees]
    sortEmployees(employees, 'name-desc')
    expect(employees).toEqual(original)
  })
})
