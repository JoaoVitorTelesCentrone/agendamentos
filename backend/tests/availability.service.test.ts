import { describe, it, expect } from 'bun:test'
import { timeToMinutes, isValidWindow, overlapsExisting } from '../src/services/availability.service'
import type { Availability } from '../src/types/index'

const makeWindow = (day: number, start: string, end: string): Availability => ({
  id: crypto.randomUUID(),
  provider_id: 'p1',
  day_of_week: day as Availability['day_of_week'],
  start_time: start,
  end_time: end,
})

describe('timeToMinutes', () => {
  it('converts 09:00 to 540', () => expect(timeToMinutes('09:00')).toBe(540))
  it('converts 12:30 to 750', () => expect(timeToMinutes('12:30')).toBe(750))
  it('converts 00:00 to 0', () => expect(timeToMinutes('00:00')).toBe(0))
  it('converts 23:59 to 1439', () => expect(timeToMinutes('23:59')).toBe(1439))
})

describe('isValidWindow', () => {
  it('returns true when end is after start', () => {
    expect(isValidWindow('09:00', '17:00')).toBe(true)
  })

  it('returns false when end equals start', () => {
    expect(isValidWindow('09:00', '09:00')).toBe(false)
  })

  it('returns false when end is before start', () => {
    expect(isValidWindow('17:00', '09:00')).toBe(false)
  })
})

describe('overlapsExisting', () => {
  it('returns false when there are no existing windows', () => {
    const candidate = { provider_id: 'p1', day_of_week: 1 as const, start_time: '09:00', end_time: '12:00' }
    expect(overlapsExisting([], candidate)).toBe(false)
  })

  it('returns false when window is on a different day', () => {
    const existing = [makeWindow(1, '09:00', '12:00')]
    const candidate = { provider_id: 'p1', day_of_week: 2 as const, start_time: '09:00', end_time: '12:00' }
    expect(overlapsExisting(existing, candidate)).toBe(false)
  })

  it('returns false when window is for a different provider', () => {
    const existing = [makeWindow(1, '09:00', '12:00')]
    const candidate = { provider_id: 'p2', day_of_week: 1 as const, start_time: '09:00', end_time: '12:00' }
    expect(overlapsExisting(existing, candidate)).toBe(false)
  })

  it('returns false when new window is exactly after existing', () => {
    const existing = [makeWindow(1, '09:00', '12:00')]
    const candidate = { provider_id: 'p1', day_of_week: 1 as const, start_time: '12:00', end_time: '17:00' }
    expect(overlapsExisting(existing, candidate)).toBe(false)
  })

  it('returns false when new window is exactly before existing', () => {
    const existing = [makeWindow(1, '14:00', '17:00')]
    const candidate = { provider_id: 'p1', day_of_week: 1 as const, start_time: '09:00', end_time: '14:00' }
    expect(overlapsExisting(existing, candidate)).toBe(false)
  })

  it('returns true when new window is inside existing', () => {
    const existing = [makeWindow(1, '09:00', '17:00')]
    const candidate = { provider_id: 'p1', day_of_week: 1 as const, start_time: '10:00', end_time: '12:00' }
    expect(overlapsExisting(existing, candidate)).toBe(true)
  })

  it('returns true when new window partially overlaps start of existing', () => {
    const existing = [makeWindow(1, '12:00', '17:00')]
    const candidate = { provider_id: 'p1', day_of_week: 1 as const, start_time: '10:00', end_time: '13:00' }
    expect(overlapsExisting(existing, candidate)).toBe(true)
  })

  it('returns true when new window partially overlaps end of existing', () => {
    const existing = [makeWindow(1, '09:00', '12:00')]
    const candidate = { provider_id: 'p1', day_of_week: 1 as const, start_time: '11:00', end_time: '14:00' }
    expect(overlapsExisting(existing, candidate)).toBe(true)
  })

  it('returns true when new window completely contains existing', () => {
    const existing = [makeWindow(1, '10:00', '11:00')]
    const candidate = { provider_id: 'p1', day_of_week: 1 as const, start_time: '09:00', end_time: '12:00' }
    expect(overlapsExisting(existing, candidate)).toBe(true)
  })
})
