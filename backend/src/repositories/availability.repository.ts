import { randomUUID } from 'crypto'
import type { Availability } from '../types/index'

export interface AvailabilityRepository {
  findById(id: string): Promise<Availability | null>
  listByProvider(providerId: string): Promise<Availability[]>
  create(data: Omit<Availability, 'id'>): Promise<Availability>
  delete(id: string): Promise<boolean>
}

export class InMemoryAvailabilityRepository implements AvailabilityRepository {
  private store: Availability[] = []

  async findById(id: string) {
    return this.store.find(a => a.id === id) ?? null
  }

  async listByProvider(providerId: string) {
    return this.store.filter(a => a.provider_id === providerId)
  }

  async create(data: Omit<Availability, 'id'>) {
    const entry: Availability = { ...data, id: randomUUID() }
    this.store.push(entry)
    return entry
  }

  async delete(id: string) {
    const idx = this.store.findIndex(a => a.id === id)
    if (idx === -1) return false
    this.store.splice(idx, 1)
    return true
  }
}
