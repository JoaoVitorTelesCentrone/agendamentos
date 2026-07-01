import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../services/auth.service'
import { signToken } from '../lib/jwt'
import type { UserRepository } from '../repositories/user.repository'
import type { ProviderRepository } from '../repositories/provider.repository'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['provider', 'client']),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export function createAuthRoutes(
  users: UserRepository,
  providers: ProviderRepository
) {
  const app = new Hono()

  app.post('/register', zValidator('json', registerSchema), async c => {
    const body = c.req.valid('json')

    const existing = await users.findByEmail(body.email)
    if (existing) {
      return c.json({ error: 'Email already in use' }, 409)
    }

    const password_hash = await hashPassword(body.password)
    const user = await users.create({
      name: body.name,
      email: body.email,
      password_hash,
      role: body.role,
    })

    if (body.role === 'provider') {
      await providers.create({
        user_id: user.id,
        description: null,
        avatar_url: null,
        location: null,
      })
    }

    const token = await signToken({ sub: user.id, role: user.role, name: user.name })
    return c.json({ token }, 201)
  })

  app.post('/login', zValidator('json', loginSchema), async c => {
    const body = c.req.valid('json')

    const user = await users.findByEmail(body.email)
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await verifyPassword(body.password, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const token = await signToken({ sub: user.id, role: user.role, name: user.name })
    return c.json({ token })
  })

  return app
}
