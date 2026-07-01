import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { hasConflict, getAvailableSlots } from '../services/appointment.service'
import type { AppointmentRepository } from '../repositories/appointment.repository'
import type { AvailabilityRepository } from '../repositories/availability.repository'
import type { ServiceRepository } from '../repositories/service.repository'
import type { ProviderRepository } from '../repositories/provider.repository'

const createSchema = z.object({
  provider_id: z.string().uuid(),
  service_id: z.string().uuid(),
  start_at: z.string().datetime(),
})

export function createAppointmentRoutes(
  appointments: AppointmentRepository,
  availability: AvailabilityRepository,
  services: ServiceRepository,
  providers: ProviderRepository
) {
  const app = new Hono()

  // GET /providers/:providerId/slots?date=YYYY-MM-DD&service_id=...
  app.get('/providers/:providerId/slots', async c => {
    const { date, service_id } = c.req.query()
    if (!date || !service_id) {
      return c.json({ error: 'date and service_id are required' }, 400)
    }

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return c.json({ error: 'Invalid date' }, 400)
    }

    const service = await services.findById(service_id)
    if (!service) return c.json({ error: 'Service not found' }, 404)

    const avail = await availability.listByProvider(c.req.param('providerId'))
    const existing = await appointments.listByProviderAndDate(c.req.param('providerId'), parsedDate)

    const slots = getAvailableSlots(avail, existing, service, parsedDate)
    return c.json(slots.map(s => s.toISOString()))
  })

  // GET /appointments - lista do usuário autenticado
  app.get('/', requireAuth, async c => {
    const authUser = c.get('user')
    let list

    if (authUser.role === 'provider') {
      const provider = await providers.findByUserId(authUser.sub)
      if (!provider) return c.json([])
      list = await appointments.listByProvider(provider.id)
    } else {
      list = await appointments.listByClient(authUser.sub)
    }

    return c.json(list)
  })

  // POST /appointments
  app.post('/', requireAuth, requireRole('client'), zValidator('json', createSchema), async c => {
    const authUser = c.get('user')
    const body = c.req.valid('json')

    const service = await services.findById(body.service_id)
    if (!service || service.provider_id !== body.provider_id) {
      return c.json({ error: 'Service not found for this provider' }, 404)
    }

    const start_at = new Date(body.start_at)
    const end_at = new Date(start_at.getTime() + service.duration_minutes * 60_000)

    // Verifica disponibilidade do prestador
    const avail = await availability.listByProvider(body.provider_id)
    const daySlots = getAvailableSlots(
      avail,
      await appointments.listByProviderAndDate(body.provider_id, start_at),
      service,
      start_at
    )
    const slotExists = daySlots.some(s => s.getTime() === start_at.getTime())
    if (!slotExists) {
      return c.json({ error: 'Slot not available' }, 409)
    }

    // Double-check de conflito
    const existing = await appointments.listByProviderAndDate(body.provider_id, start_at)
    if (hasConflict(existing, start_at, end_at)) {
      return c.json({ error: 'Time slot already taken' }, 409)
    }

    const appt = await appointments.create({
      provider_id: body.provider_id,
      client_id: authUser.sub,
      service_id: service.id,
      start_at,
      end_at,
      status: 'pending',
    })

    return c.json(appt, 201)
  })

  // PATCH /appointments/:id/cancel
  app.patch('/:id/cancel', requireAuth, async c => {
    const authUser = c.get('user')
    const appt = await appointments.findById(c.req.param('id'))
    if (!appt) return c.json({ error: 'Not found' }, 404)

    const isClient = appt.client_id === authUser.sub
    const provider = authUser.role === 'provider'
      ? await providers.findByUserId(authUser.sub)
      : null
    const isProvider = provider?.id === appt.provider_id

    if (!isClient && !isProvider) return c.json({ error: 'Forbidden' }, 403)
    if (appt.status === 'cancelled') return c.json({ error: 'Already cancelled' }, 409)

    const updated = await appointments.updateStatus(appt.id, 'cancelled')
    return c.json(updated)
  })

  // PATCH /appointments/:id/confirm
  app.patch('/:id/confirm', requireAuth, requireRole('provider'), async c => {
    const authUser = c.get('user')
    const provider = await providers.findByUserId(authUser.sub)
    const appt = await appointments.findById(c.req.param('id'))
    if (!appt) return c.json({ error: 'Not found' }, 404)
    if (!provider || appt.provider_id !== provider.id) return c.json({ error: 'Forbidden' }, 403)
    if (appt.status !== 'pending') return c.json({ error: 'Cannot confirm' }, 409)

    const updated = await appointments.updateStatus(appt.id, 'confirmed')
    return c.json(updated)
  })

  return app
}
