import { randomUUID } from 'crypto'
import type { Provider } from '../types/index'

export interface ProviderRepository {
  findByUserId(userId: string): Promise<Provider | null>
  findById(id: string): Promise<Provider | null>
  list(): Promise<Provider[]>
  create(data: Omit<Provider, 'id'>): Promise<Provider>
  update(id: string, data: Partial<Omit<Provider, 'id' | 'user_id'>>): Promise<Provider | null>
}

export class InMemoryProviderRepository implements ProviderRepository {
  private store: Provider[] = []

  async findByUserId(userId: string) {
    return this.store.find(p => p.user_id === userId) ?? null
  }

  async findById(id: string) {
    return this.store.find(p => p.id === id) ?? null
  }

  async list() {
    return [...this.store]
  }

  async create(data: Omit<Provider, 'id'>) {
    const provider: Provider = { ...data, id: randomUUID() }
    this.store.push(provider)
    return provider
  }

  async update(id: string, data: Partial<Omit<Provider, 'id' | 'user_id'>>) {
    const idx = this.store.findIndex(p => p.id === id)
    if (idx === -1) return null
    this.store[idx] = { ...this.store[idx]!, ...data }
    return this.store[idx]!
  }
}
