import { describe, expect, it } from 'vitest'
import { humanizeError } from './errors'

describe('humanizeError', () => {
  it('passes through known business-rule messages unchanged', () => {
    expect(humanizeError('An employee with this email already exists.')).toBe(
      'An employee with this email already exists.',
    )
    expect(humanizeError('This department still has employees assigned to it.')).toBe(
      'This department still has employees assigned to it.',
    )
    expect(humanizeError('Employee not found.')).toBe('Employee not found.')
  })

  it('strips the legacy insufficient_privilege prefix', () => {
    expect(humanizeError("insufficient_privilege: hr_staff cannot change an employee's department")).toBe(
      "hr_staff cannot change an employee's department",
    )
  })

  it('recognizes the current friendly RPC wording', () => {
    expect(humanizeError('Only Admin can delete employees.')).toBe('Only Admin can delete employees.')
    expect(humanizeError("HR Staff can't change an employee's department.")).toBe(
      "HR Staff can't change an employee's department.",
    )
    expect(humanizeError('No employee record is linked to your account.')).toBe(
      'No employee record is linked to your account.',
    )
  })

  it('recognizes common auth errors', () => {
    expect(humanizeError('Invalid login credentials')).toBe('Invalid login credentials')
  })

  it('replaces unrecognized/technical messages with a generic fallback', () => {
    expect(humanizeError('permission denied for table employees')).toBe('Something went wrong. Please try again.')
    expect(humanizeError('JWT expired')).toBe('Something went wrong. Please try again.')
    expect(humanizeError('Failed to fetch')).toBe('Something went wrong. Please try again.')
  })

  it('uses a custom fallback when provided', () => {
    expect(humanizeError('invalid input syntax for type uuid', 'Could not load employees. Please try again.')).toBe(
      'Could not load employees. Please try again.',
    )
  })

  it('falls back on an empty message', () => {
    expect(humanizeError('')).toBe('Something went wrong. Please try again.')
  })
})
