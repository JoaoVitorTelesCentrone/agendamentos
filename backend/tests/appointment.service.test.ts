import { describe, it, expect, beforeEach } from 'bun:test'
import { hasConflict, getAvailableSlots } from '../src/services/appointment.service'
import type { Appointment, Availability, Service } from '../src/types/index'

const makeAppt = (start: string, end: string, status: Appointment['status'] = 'confirmed'): Appointment => ({
  id: crypto.randomUUID(),
  provider_id: 'p1',
  client_id: 'c1',
  service_id: 's1',
  start_at: new Date(start),
  end_at: new Date(end),
  status,
  created_at: new Date(),
})

const service30min: Service = {
  id: 's1',
  provider_id: 'p1',
  name: 'Corte',
  duration_minutes: 30,
  price_cents: 5000,
  active: true,
}

const mondayAvailability: Availability[] = [
  {
    id: 'a1',
    provider_id: 'p1',
    day_of_week: 1, // Monday
    start_time: '09:00',
    end_time: '12:00',
  },
]

describe('hasConflict', () => {
  it('returns false when there are no existing appointments', () => {
    const start = new Date('2025-01-06T09:00:00')
    const end = new Date('2025-01-06T09:30:00')
    expect(hasConflict([], start, end)).toBe(false)
  })

  it('returns true when new appointment overlaps an existing one', () => {
    const existing = [makeAppt('2025-01-06T09:00:00', '2025-01-06T09:30:00')]
    expect(hasConflict(existing, new Date('2025-01-06T09:15:00'), new Date('2025-01-06T09:45:00'))).toBe(true)
  })

  it('returns false when new appointment is exactly after existing one', () => {
    const existing = [makeAppt('2025-01-06T09:00:00', '2025-01-06T09:30:00')]
    expect(hasConflict(existing, new Date('2025-01-06T09:30:00'), new Date('2025-01-06T10:00:00'))).toBe(false)
  })

  it('returns false when new appointment is exactly before existing one', () => {
    const existing = [makeAppt('2025-01-06T10:00:00', '2025-01-06T10:30:00')]
    expect(hasConflict(existing, new Date('2025-01-06T09:30:00'), new Date('2025-01-06T10:00:00'))).toBe(false)
  })

  it('ignores cancelled appointments when checking conflict', () => {
    const existing = [makeAppt('2025-01-06T09:00:00', '2025-01-06T09:30:00', 'cancelled')]
    expect(hasConflict(existing, new Date('2025-01-06T09:00:00'), new Date('2025-01-06T09:30:00'))).toBe(false)
  })

  it('detects overlap when new appointment starts before and ends inside existing', () => {
    const existing = [makeAppt('2025-01-06T10:00:00', '2025-01-06T10:30:00')]
    expect(hasConflict(existing, new Date('2025-01-06T09:45:00'), new Date('2025-01-06T10:15:00'))).toBe(true)
  })

  it('detects overlap when new appointment completely contains existing one', () => {
    const existing = [makeAppt('2025-01-06T10:00:00', '2025-01-06T10:30:00')]
    expect(hasConflict(existing, new Date('2025-01-06T09:00:00'), new Date('2025-01-06T11:00:00'))).toBe(true)
  })
})

describe('getAvailableSlots', () => {
  // 2025-01-06 is a Monday
  const monday = new Date('2025-01-06T00:00:00')

  it('returns all slots when there are no appointments', () => {
    const slots = getAvailableSlots(mondayAvailability, [], service30min, monday)
    // 09:00-12:00 = 6 slots of 30 min
    expect(slots).toHaveLength(6)
    expect(slots[0]!.getHours()).toBe(9)
    expect(slots[0]!.getMinutes()).toBe(0)
    expect(slots[5]!.getHours()).toBe(11)
    expect(slots[5]!.getMinutes()).toBe(30)
  })

  it('excludes taken slots', () => {
    const booked = [makeAppt('2025-01-06T09:00:00', '2025-01-06T09:30:00')]
    const slots = getAvailableSlots(mondayAvailability, booked, service30min, monday)
    expect(slots).toHaveLength(5)
    expect(slots[0]!.getHours()).toBe(9)
    expect(slots[0]!.getMinutes()).toBe(30)
  })

  it('returns empty when provider has no availability on that day', () => {
    // 2025-01-07 is a Tuesday — no availability configured
    const tuesday = new Date('2025-01-07T00:00:00')
    const slots = getAvailableSlots(mondayAvailability, [], service30min, tuesday)
    expect(slots).toHaveLength(0)
  })

  it('includes cancelled appointment slots as available', () => {
    const cancelled = [makeAppt('2025-01-06T09:00:00', '2025-01-06T09:30:00', 'cancelled')]
    const slots = getAvailableSlots(mondayAvailability, cancelled, service30min, monday)
    expect(slots).toHaveLength(6)
  })

  it('handles 60-minute service correctly', () => {
    const service60: Service = { ...service30min, duration_minutes: 60 }
    const slots = getAvailableSlots(mondayAvailability, [], service60, monday)
    // 09:00-12:00 = 3 slots of 60 min
    expect(slots).toHaveLength(3)
  })

  it('works with multiple availability windows in same day', () => {
    const splitAvailability: Availability[] = [
      { id: 'a1', provider_id: 'p1', day_of_week: 1, start_time: '09:00', end_time: '12:00' },
      { id: 'a2', provider_id: 'p1', day_of_week: 1, start_time: '14:00', end_time: '16:00' },
    ]
    const slots = getAvailableSlots(splitAvailability, [], service30min, monday)
    // 6 slots morning + 4 slots afternoon
    expect(slots).toHaveLength(10)
  })
})
