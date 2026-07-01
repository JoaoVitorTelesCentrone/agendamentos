import type { Appointment, Availability, Service } from '../types/index'

export function hasConflict(
  existing: Appointment[],
  newStart: Date,
  newEnd: Date
): boolean {
  return existing.some(appt => {
    if (appt.status === 'cancelled') return false
    return newStart < appt.end_at && newEnd > appt.start_at
  })
}

export function getAvailableSlots(
  availability: Availability[],
  appointments: Appointment[],
  service: Service,
  date: Date
): Date[] {
  const dayOfWeek = date.getDay() as DayOfWeek
  const windows = availability.filter(a => a.day_of_week === dayOfWeek)
  const slots: Date[] = []

  for (const window of windows) {
    const [startH, startM] = window.start_time.split(':').map(Number)
    const [endH, endM] = window.end_time.split(':').map(Number)

    const windowStart = new Date(date)
    windowStart.setHours(startH, startM, 0, 0)

    const windowEnd = new Date(date)
    windowEnd.setHours(endH, endM, 0, 0)

    let current = new Date(windowStart)

    while (current.getTime() + service.duration_minutes * 60_000 <= windowEnd.getTime()) {
      const slotEnd = new Date(current.getTime() + service.duration_minutes * 60_000)

      if (!hasConflict(appointments, current, slotEnd)) {
        slots.push(new Date(current))
      }

      current = new Date(current.getTime() + service.duration_minutes * 60_000)
    }
  }

  return slots
}

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6
