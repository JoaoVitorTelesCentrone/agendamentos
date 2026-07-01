export type Role = 'provider' | 'client'

export interface User {
  id: string
  name: string
  email: string
  password_hash: string
  role: Role
  created_at: Date
}

export interface Provider {
  id: string
  user_id: string
  description: string | null
  avatar_url: string | null
  location: string | null
}

export interface Service {
  id: string
  provider_id: string
  name: string
  duration_minutes: number
  price_cents: number
  active: boolean
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

export interface Availability {
  id: string
  provider_id: string
  day_of_week: DayOfWeek
  start_time: string // "HH:MM"
  end_time: string   // "HH:MM"
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Appointment {
  id: string
  provider_id: string
  client_id: string
  service_id: string
  start_at: Date
  end_at: Date
  status: AppointmentStatus
  created_at: Date
}
