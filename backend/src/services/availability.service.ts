import type { Availability } from '../types/index'

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function isValidWindow(start_time: string, end_time: string): boolean {
  return timeToMinutes(start_time) < timeToMinutes(end_time)
}

export function overlapsExisting(
  existing: Availability[],
  candidate: Omit<Availability, 'id'>
): boolean {
  return existing
    .filter(
      a =>
        a.provider_id === candidate.provider_id &&
        a.day_of_week === candidate.day_of_week
    )
    .some(a => {
      const existStart = timeToMinutes(a.start_time)
      const existEnd = timeToMinutes(a.end_time)
      const newStart = timeToMinutes(candidate.start_time)
      const newEnd = timeToMinutes(candidate.end_time)
      return newStart < existEnd && newEnd > existStart
    })
}
