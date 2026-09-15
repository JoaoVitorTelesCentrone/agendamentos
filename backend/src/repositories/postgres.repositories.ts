import type { Sql } from 'postgres'
import type {
  Appointment,
  AppointmentStatus,
  Availability,
  Provider,
  Service,
  User,
} from '../types/index'
import type { AppointmentRepository } from './appointment.repository'
import type { AvailabilityRepository } from './availability.repository'
import type { ProviderRepository } from './provider.repository'
import type { ServiceRepository } from './service.repository'
import type { UserRepository } from './user.repository'

type UserRow = Omit<User, 'created_at'> & { created_at: Date }
type ProviderRow = Provider
type ServiceRow = Service
type AvailabilityRow = Availability
type AppointmentRow = Omit<Appointment, 'start_at' | 'end_at' | 'created_at'> & {
  start_at: Date
  end_at: Date
  created_at: Date
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly sql: Sql) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.sql<UserRow[]>`select * from booking_users where email = ${email.toLowerCase()}`
    return user ?? null
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.sql<UserRow[]>`select * from booking_users where id = ${id}`
    return user ?? null
  }

  async create(data: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const [user] = await this.sql<UserRow[]>`
      insert into booking_users (name, email, password_hash, role)
      values (${data.name}, ${data.email.toLowerCase()}, ${data.password_hash}, ${data.role})
      returning *
    `
    return user!
  }
}

export class PostgresProviderRepository implements ProviderRepository {
  constructor(private readonly sql: Sql) {}

  async findByUserId(userId: string): Promise<Provider | null> {
    const [provider] = await this.sql<ProviderRow[]>`select * from booking_providers where user_id = ${userId}`
    return provider ?? null
  }

  async findById(id: string): Promise<Provider | null> {
    const [provider] = await this.sql<ProviderRow[]>`select * from booking_providers where id = ${id}`
    return provider ?? null
  }

  async list(): Promise<Provider[]> {
    return this.sql<ProviderRow[]>`select * from booking_providers order by id`
  }

  async create(data: Omit<Provider, 'id'>): Promise<Provider> {
    const [provider] = await this.sql<ProviderRow[]>`
      insert into booking_providers (user_id, description, avatar_url, location)
      values (${data.user_id}, ${data.description}, ${data.avatar_url}, ${data.location})
      returning *
    `
    return provider!
  }

  async update(id: string, data: Partial<Omit<Provider, 'id' | 'user_id'>>): Promise<Provider | null> {
    const [provider] = await this.sql<ProviderRow[]>`
      update booking_providers
      set description = coalesce(${data.description ?? null}, description),
          avatar_url = coalesce(${data.avatar_url ?? null}, avatar_url),
          location = coalesce(${data.location ?? null}, location)
      where id = ${id}
      returning *
    `
    return provider ?? null
  }
}

export class PostgresServiceRepository implements ServiceRepository {
  constructor(private readonly sql: Sql) {}

  async findById(id: string): Promise<Service | null> {
    const [service] = await this.sql<ServiceRow[]>`select * from booking_services where id = ${id}`
    return service ?? null
  }

  async listByProvider(providerId: string): Promise<Service[]> {
    return this.sql<ServiceRow[]>`
      select * from booking_services where provider_id = ${providerId} and active = true order by name
    `
  }

  async create(data: Omit<Service, 'id'>): Promise<Service> {
    const [service] = await this.sql<ServiceRow[]>`
      insert into booking_services (provider_id, name, duration_minutes, price_cents, active)
      values (${data.provider_id}, ${data.name}, ${data.duration_minutes}, ${data.price_cents}, ${data.active})
      returning *
    `
    return service!
  }

  async update(id: string, data: Partial<Omit<Service, 'id' | 'provider_id'>>): Promise<Service | null> {
    const [service] = await this.sql<ServiceRow[]>`
      update booking_services
      set name = coalesce(${data.name ?? null}, name),
          duration_minutes = coalesce(${data.duration_minutes ?? null}, duration_minutes),
          price_cents = coalesce(${data.price_cents ?? null}, price_cents),
          active = coalesce(${data.active ?? null}, active)
      where id = ${id}
      returning *
    `
    return service ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql`update booking_services set active = false where id = ${id}`
    return result.count > 0
  }
}

export class PostgresAvailabilityRepository implements AvailabilityRepository {
  constructor(private readonly sql: Sql) {}

  async findById(id: string): Promise<Availability | null> {
    const [availability] = await this.sql<AvailabilityRow[]>`select * from booking_availability where id = ${id}`
    return availability ?? null
  }

  async listByProvider(providerId: string): Promise<Availability[]> {
    return this.sql<AvailabilityRow[]>`
      select id, provider_id, day_of_week, to_char(start_time, 'HH24:MI') as start_time,
             to_char(end_time, 'HH24:MI') as end_time
      from booking_availability where provider_id = ${providerId} order by day_of_week, start_time
    `
  }

  async create(data: Omit<Availability, 'id'>): Promise<Availability> {
    const [availability] = await this.sql<AvailabilityRow[]>`
      insert into booking_availability (provider_id, day_of_week, start_time, end_time)
      values (${data.provider_id}, ${data.day_of_week}, ${data.start_time}, ${data.end_time})
      returning id, provider_id, day_of_week, to_char(start_time, 'HH24:MI') as start_time,
                to_char(end_time, 'HH24:MI') as end_time
    `
    return availability!
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sql`delete from booking_availability where id = ${id}`
    return result.count > 0
  }
}

export class PostgresAppointmentRepository implements AppointmentRepository {
  constructor(private readonly sql: Sql) {}

  async findById(id: string): Promise<Appointment | null> {
    const [appointment] = await this.sql<AppointmentRow[]>`select * from booking_appointments where id = ${id}`
    return appointment ?? null
  }

  async listByProvider(providerId: string): Promise<Appointment[]> {
    return this.sql<AppointmentRow[]>`
      select * from booking_appointments where provider_id = ${providerId} order by start_at desc
    `
  }

  async listByClient(clientId: string): Promise<Appointment[]> {
    return this.sql<AppointmentRow[]>`
      select * from booking_appointments where client_id = ${clientId} order by start_at desc
    `
  }

  async listByProviderAndDate(providerId: string, date: Date): Promise<Appointment[]> {
    const start = new Date(date)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)

    return this.sql<AppointmentRow[]>`
      select * from booking_appointments
      where provider_id = ${providerId} and start_at >= ${start} and start_at < ${end}
      order by start_at
    `
  }

  async create(data: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> {
    const [appointment] = await this.sql<AppointmentRow[]>`
      insert into booking_appointments (provider_id, client_id, service_id, start_at, end_at, status)
      values (${data.provider_id}, ${data.client_id}, ${data.service_id}, ${data.start_at}, ${data.end_at}, ${data.status})
      returning *
    `
    return appointment!
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment | null> {
    const [appointment] = await this.sql<AppointmentRow[]>`
      update booking_appointments set status = ${status} where id = ${id} returning *
    `
    return appointment ?? null
  }
}
