import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Sql } from 'postgres'
import {
  PostgresAppointmentRepository,
  PostgresAvailabilityRepository,
  PostgresProviderRepository,
  PostgresServiceRepository,
  PostgresUserRepository,
} from './repositories/postgres.repositories'
import { createAuthRoutes } from './routes/auth'
import { createProviderRoutes } from './routes/providers'
import { createServiceRoutes } from './routes/services'
import { createAvailabilityRoutes } from './routes/availability'
import { createAppointmentRoutes } from './routes/appointments'

export function createApp(sql: Sql) {
  const users = new PostgresUserRepository(sql)
  const providers = new PostgresProviderRepository(sql)
  const services = new PostgresServiceRepository(sql)
  const availability = new PostgresAvailabilityRepository(sql)
  const appointments = new PostgresAppointmentRepository(sql)
  const app = new Hono()

  app.use('*', cors())
  app.use('*', logger())

  app.get('/health', c => c.json({ ok: true }))

  app.route('/auth', createAuthRoutes(users, providers))
  app.route('/providers', createProviderRoutes(providers, users))
  app.route('/', createServiceRoutes(services, providers))
  app.route('/', createAvailabilityRoutes(availability, providers))
  app.route('/appointments', createAppointmentRoutes(appointments, availability, services, providers))

  app.notFound(c => c.json({ error: 'Not found' }, 404))
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  return app
}
