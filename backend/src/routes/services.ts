import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import type { ServiceRepository } from '../repositories/service.repository'
import type { ProviderRepository } from '../repositories/provider.repository'

const serviceSchema = z.object({
  name: z.string().min(2),
  duration_minutes: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(),
})

export function createServiceRoutes(
  services: ServiceRepository,
  providers: ProviderRepository
) {
  const app = new Hono()

  app.get('/providers/:providerId/services', async c => {
    const list = await services.listByProvider(c.req.param('providerId'))
    return c.json(list)
  })

  app.post('/', requireAuth, requireRole('provider'), zValidator('json', serviceSchema), async c => {
    const authUser = c.get('user')
    const provider = await providers.findByUserId(authUser.sub)
    if (!provider) return c.json({ error: 'Provider not found' }, 404)

    const service = await services.create({
      ...c.req.valid('json'),
      provider_id: provider.id,
      active: true,
    })
    return c.json(service, 201)
  })

  app.put('/:id', requireAuth, requireRole('provider'), zValidator('json', serviceSchema.partial()), async c => {
    const authUser = c.get('user')
    const provider = await providers.findByUserId(authUser.sub)
    const service = await services.findById(c.req.param('id'))
    if (!service) return c.json({ error: 'Not found' }, 404)
    if (!provider || service.provider_id !== provider.id) return c.json({ error: 'Forbidden' }, 403)

    const updated = await services.update(service.id, c.req.valid('json'))
    return c.json(updated)
  })

  app.delete('/:id', requireAuth, requireRole('provider'), async c => {
    const authUser = c.get('user')
    const provider = await providers.findByUserId(authUser.sub)
    const service = await services.findById(c.req.param('id'))
    if (!service) return c.json({ error: 'Not found' }, 404)
    if (!provider || service.provider_id !== provider.id) return c.json({ error: 'Forbidden' }, 403)

    await services.delete(service.id)
    return c.json({ ok: true })
  })

  return app
}
