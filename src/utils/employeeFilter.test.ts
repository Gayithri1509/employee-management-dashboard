import { describe, expect, it } from 'vitest'
import { filterEmployees } from './employeeFilter'
import type { Employee } from '../types/employee'

const employees: Employee[] = [
  {
    id: '1',
    name: 'Ada Lovelace',
    role: 'Software Engineer',
    department: 'Engineering',
    email: 'ada@example.com',
    phone: '555-0100',
    location: 'Remote',
    status: 'Active',
    joiningDate: '2020-01-01',
    profileId: null,
  },
  {
    id: '2',
    name: 'Grace Hopper',
    role: 'Engineering Manager',
    department: 'Engineering',
    email: 'grace@example.com',
    phone: '555-0101',
    location: 'Boston',
    status: 'On Leave',
    joiningDate: '2018-01-01',
    profileId: null,
  },
  {
    id: '3',
    name: 'James Whitfield',
    role: 'Sales Executive',
    department: 'Sales',
    email: 'james@example.com',
    phone: '555-0102',
    location: 'Chicago',
    status: 'Active',
    joiningDate: '2019-01-01',
    profileId: null,
  },
]

describe('filterEmployees', () => {
  it('returns everyone when no filters are active', () => {
    expect(filterEmployees(employees, { searchTerm: '', department: 'all', status: 'all' })).toHaveLength(3)
  })

  it('searches case-insensitively across name, role, department, email, and location', () => {
    expect(filterEmployees(employees, { searchTerm: 'ADA', department: 'all', status: 'all' })).toEqual([employees[0]])
    expect(filterEmployees(employees, { searchTerm: 'chicago', department: 'all', status: 'all' })).toEqual([employees[2]])
    expect(filterEmployees(employees, { searchTerm: 'engineer', department: 'all', status: 'all' })).toEqual([
      employees[0],
      employees[1],
    ])
  })

  it('filters by department alone', () => {
    expect(filterEmployees(employees, { searchTerm: '', department: 'Sales', status: 'all' })).toEqual([employees[2]])
  })

  it('filters by status alone', () => {
    expect(filterEmployees(employees, { searchTerm: '', department: 'all', status: 'On Leave' })).toEqual([employees[1]])
  })

  it('combines search + department + status as AND, matching the spec example exactly', () => {
    // Search = "engineer", Department = Engineering, Status = Active
    // must return only employees satisfying every condition at once.
    const result = filterEmployees(employees, { searchTerm: 'engineer', department: 'Engineering', status: 'Active' })
    expect(result).toEqual([employees[0]])
  })

  it('returns an empty array when no employee satisfies every active condition', () => {
    const result = filterEmployees(employees, { searchTerm: 'engineer', department: 'Sales', status: 'all' })
    expect(result).toEqual([])
  })
})
