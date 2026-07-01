import { randomUUID } from 'crypto'
import type { User } from '../types/index'

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(data: Omit<User, 'id' | 'created_at'>): Promise<User>
}

export class InMemoryUserRepository implements UserRepository {
  private store: User[] = []

  async findByEmail(email: string) {
    return this.store.find(u => u.email === email) ?? null
  }

  async findById(id: string) {
    return this.store.find(u => u.id === id) ?? null
  }

  async create(data: Omit<User, 'id' | 'created_at'>) {
    const user: User = { ...data, id: randomUUID(), created_at: new Date() }
    this.store.push(user)
    return user
  }
}
