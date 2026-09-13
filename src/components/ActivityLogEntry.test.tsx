import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ActivityLogEntry from './ActivityLogEntry'
import type { ActivityEntry } from '../types/activity'

describe('ActivityLogEntry', () => {
  it('renders a role-change entry with its own "Role Change" label and the audit message', () => {
    const entry: ActivityEntry = {
      id: 'log-1',
      type: 'role-change',
      message: "Akhila changed AKUTHOTA SREENIVASULU's role from Employee to HR Staff.",
      timestamp: '2024-01-01T10:00:00Z',
    }

    render(
      <ul>
        <ActivityLogEntry entry={entry} isLast />
      </ul>,
    )

    expect(screen.getByText('Role Change')).toBeInTheDocument()
    expect(
      screen.getByText("Akhila changed AKUTHOTA SREENIVASULU's role from Employee to HR Staff."),
    ).toBeInTheDocument()
  })

  it('still renders system and employee-update entries with their existing labels', () => {
    render(
      <ul>
        <ActivityLogEntry
          entry={{ id: '1', type: 'system', message: 'Activity log initialized.', timestamp: '2024-01-01T00:00:00Z' }}
          isLast
        />
      </ul>,
    )
    expect(screen.getByText('System')).toBeInTheDocument()

    render(
      <ul>
        <ActivityLogEntry
          entry={{ id: '2', type: 'employee-update', message: 'Ada was added to the system.', timestamp: '2024-01-01T00:00:00Z' }}
          isLast
        />
      </ul>,
    )
    expect(screen.getByText('Update')).toBeInTheDocument()
  })
})
