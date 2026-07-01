import { randomUUID } from 'crypto'
import type { Service } from '../types/index'

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>
  listByProvider(providerId: string): Promise<Service[]>
  create(data: Omit<Service, 'id'>): Promise<Service>
  update(id: string, data: Partial<Omit<Service, 'id' | 'provider_id'>>): Promise<Service | null>
  delete(id: string): Promise<boolean>
}

export class InMemoryServiceRepository implements ServiceRepository {
  private store: Service[] = []

  async findById(id: string) {
    return this.store.find(s => s.id === id) ?? null
  }

  async listByProvider(providerId: string) {
    return this.store.filter(s => s.provider_id === providerId && s.active)
  }

  async create(data: Omit<Service, 'id'>) {
    const service: Service = { ...data, id: randomUUID() }
    this.store.push(service)
    return service
  }

  async update(id: string, data: Partial<Omit<Service, 'id' | 'provider_id'>>) {
    const idx = this.store.findIndex(s => s.id === id)
    if (idx === -1) return null
    this.store[idx] = { ...this.store[idx]!, ...data }
    return this.store[idx]!
  }

  async delete(id: string) {
    const idx = this.store.findIndex(s => s.id === id)
    if (idx === -1) return false
    this.store[idx] = { ...this.store[idx]!, active: false }
    return true
  }
}
