import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { isValidWindow, overlapsExisting } from '../services/availability.service'
import type { AvailabilityRepository } from '../repositories/availability.repository'
import type { ProviderRepository } from '../repositories/provider.repository'

const availabilitySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export function createAvailabilityRoutes(
  availability: AvailabilityRepository,
  providers: ProviderRepository
) {
  const app = new Hono()

  app.get('/providers/:providerId/availability', async c => {
    const list = await availability.listByProvider(c.req.param('providerId'))
    return c.json(list)
  })

  app.post('/', requireAuth, requireRole('provider'), zValidator('json', availabilitySchema), async c => {
    const authUser = c.get('user')
    const provider = await providers.findByUserId(authUser.sub)
    if (!provider) return c.json({ error: 'Provider not found' }, 404)

    const body = c.req.valid('json')

    if (!isValidWindow(body.start_time, body.end_time)) {
      return c.json({ error: 'end_time must be after start_time' }, 422)
    }

    const existing = await availability.listByProvider(provider.id)
    const candidate = { ...body, provider_id: provider.id, day_of_week: body.day_of_week as 0|1|2|3|4|5|6 }

    if (overlapsExisting(existing, candidate)) {
      return c.json({ error: 'Overlaps existing availability window' }, 409)
    }

    const entry = await availability.create(candidate)
    return c.json(entry, 201)
  })

  app.delete('/:id', requireAuth, requireRole('provider'), async c => {
    const authUser = c.get('user')
    const provider = await providers.findByUserId(authUser.sub)
    const entry = await availability.findById(c.req.param('id'))
    if (!entry) return c.json({ error: 'Not found' }, 404)
    if (!provider || entry.provider_id !== provider.id) return c.json({ error: 'Forbidden' }, 403)

    await availability.delete(entry.id)
    return c.json({ ok: true })
  })

  return app
}
