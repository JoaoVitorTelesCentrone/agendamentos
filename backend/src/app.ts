import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { InMemoryUserRepository } from './repositories/user.repository'
import { InMemoryProviderRepository } from './repositories/provider.repository'
import { InMemoryServiceRepository } from './repositories/service.repository'
import { InMemoryAvailabilityRepository } from './repositories/availability.repository'
import { InMemoryAppointmentRepository } from './repositories/appointment.repository'
import { createAuthRoutes } from './routes/auth'
import { createProviderRoutes } from './routes/providers'
import { createServiceRoutes } from './routes/services'
import { createAvailabilityRoutes } from './routes/availability'
import { createAppointmentRoutes } from './routes/appointments'

// Repositories (swap these out for real DB implementations later)
const users = new InMemoryUserRepository()
const providers = new InMemoryProviderRepository()
const services = new InMemoryServiceRepository()
const availability = new InMemoryAvailabilityRepository()
const appointments = new InMemoryAppointmentRepository()

export function createApp() {
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
