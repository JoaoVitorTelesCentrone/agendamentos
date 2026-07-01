import { createMiddleware } from 'hono/factory'
import { verifyToken, type JwtPayload } from '../lib/jwt'

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const token = auth.slice(7)
    const payload = await verifyToken(token)
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export const requireRole = (role: string) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (user.role !== role) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
  })
