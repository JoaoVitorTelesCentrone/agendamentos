import { randomUUID } from 'crypto'
import type { Appointment, AppointmentStatus } from '../types/index'

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>
  listByProvider(providerId: string): Promise<Appointment[]>
  listByClient(clientId: string): Promise<Appointment[]>
  listByProviderAndDate(providerId: string, date: Date): Promise<Appointment[]>
  create(data: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment>
  updateStatus(id: string, status: AppointmentStatus): Promise<Appointment | null>
}

export class InMemoryAppointmentRepository implements AppointmentRepository {
  private store: Appointment[] = []

  async findById(id: string) {
    return this.store.find(a => a.id === id) ?? null
  }

  async listByProvider(providerId: string) {
    return this.store.filter(a => a.provider_id === providerId)
  }

  async listByClient(clientId: string) {
    return this.store.filter(a => a.client_id === clientId)
  }

  async listByProviderAndDate(providerId: string, date: Date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    return this.store.filter(
      a =>
        a.provider_id === providerId &&
        a.start_at >= start &&
        a.start_at <= end
    )
  }

  async create(data: Omit<Appointment, 'id' | 'created_at'>) {
    const appt: Appointment = { ...data, id: randomUUID(), created_at: new Date() }
    this.store.push(appt)
    return appt
  }

  async updateStatus(id: string, status: AppointmentStatus) {
    const idx = this.store.findIndex(a => a.id === id)
    if (idx === -1) return null
    this.store[idx] = { ...this.store[idx]!, status }
    return this.store[idx]!
  }
}
