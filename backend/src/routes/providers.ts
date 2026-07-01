import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import type { ProviderRepository } from '../repositories/provider.repository'
import type { UserRepository } from '../repositories/user.repository'

const updateSchema = z.object({
  description: z.string().optional(),
  avatar_url: z.string().url().optional(),
  location: z.string().optional(),
})

export function createProviderRoutes(
  providers: ProviderRepository,
  users: UserRepository
) {
  const app = new Hono()

  app.get('/', async c => {
    const all = await providers.list()
    const withNames = await Promise.all(
      all.map(async p => {
        const user = await users.findById(p.user_id)
        return { ...p, name: user?.name ?? '' }
      })
    )
    return c.json(withNames)
  })

  app.get('/:id', async c => {
    const provider = await providers.findById(c.req.param('id'))
    if (!provider) return c.json({ error: 'Not found' }, 404)
    const user = await users.findById(provider.user_id)
    return c.json({ ...provider, name: user?.name ?? '' })
  })

  app.put('/:id', requireAuth, requireRole('provider'), zValidator('json', updateSchema), async c => {
    const authUser = c.get('user')
    const provider = await providers.findById(c.req.param('id'))
    if (!provider) return c.json({ error: 'Not found' }, 404)
    if (provider.user_id !== authUser.sub) return c.json({ error: 'Forbidden' }, 403)

    const updated = await providers.update(provider.id, c.req.valid('json'))
    return c.json(updated)
  })

  return app
}
