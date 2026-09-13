import { describe, expect, it } from 'vitest'
import { getCapabilities } from './authorization'

describe('getCapabilities', () => {
  it('grants admin everything, including hard delete and role management', () => {
    const caps = getCapabilities('admin')
    expect(caps.canViewEmployees).toBe(true)
    expect(caps.canCreateEmployee).toBe(true)
    expect(caps.canEditEmployee).toBe(true)
    expect(caps.canChangeEmployeeDepartment).toBe(true)
    expect(caps.canDeactivateEmployee).toBe(true)
    expect(caps.canDeleteEmployee).toBe(true)
    expect(caps.canManageDepartments).toBe(true)
    expect(caps.canManageRoles).toBe(true)
  })

  it('grants hr_manager full employee/department management but not delete or role management', () => {
    const caps = getCapabilities('hr_manager')
    expect(caps.canCreateEmployee).toBe(true)
    expect(caps.canEditEmployee).toBe(true)
    expect(caps.canDeactivateEmployee).toBe(true)
    expect(caps.canManageDepartments).toBe(true)
    expect(caps.canDeleteEmployee).toBe(false)
    expect(caps.canManageRoles).toBe(false)
  })

  it('grants hr_staff create/edit but not status changes, delete, or department management', () => {
    const caps = getCapabilities('hr_staff')
    expect(caps.canViewEmployees).toBe(true)
    expect(caps.canCreateEmployee).toBe(true)
    expect(caps.canEditEmployee).toBe(true)
    expect(caps.canChangeEmployeeDepartment).toBe(false)
    expect(caps.canDeactivateEmployee).toBe(false)
    expect(caps.canDeleteEmployee).toBe(false)
    expect(caps.canManageDepartments).toBe(false)
    expect(caps.canManageRoles).toBe(false)
  })

  it('grants employee only self-service, nothing organization-wide', () => {
    const caps = getCapabilities('employee')
    expect(caps.canViewOwnProfile).toBe(true)
    expect(caps.canEditOwnProfile).toBe(true)
    expect(caps.canViewEmployees).toBe(false)
    expect(caps.canCreateEmployee).toBe(false)
    expect(caps.canEditEmployee).toBe(false)
    expect(caps.canDeactivateEmployee).toBe(false)
    expect(caps.canDeleteEmployee).toBe(false)
    expect(caps.canManageDepartments).toBe(false)
    expect(caps.canViewActivity).toBe(false)
    expect(caps.canViewInsights).toBe(false)
  })

  it('grants a null role (no session/profile) nothing at all', () => {
    const caps = getCapabilities(null)
    expect(Object.values(caps).every((value) => value === false)).toBe(true)
  })
})
