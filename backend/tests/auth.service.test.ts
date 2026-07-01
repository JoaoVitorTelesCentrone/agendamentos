import { describe, it, expect } from 'bun:test'
import { hashPassword, verifyPassword } from '../src/services/auth.service'

describe('auth.service', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('minhasenha123')
    const valid = await verifyPassword('minhasenha123', hash)
    expect(valid).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('minhasenha123')
    const valid = await verifyPassword('senhaerrada', hash)
    expect(valid).toBe(false)
  })

  it('produces different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('mesmasenha')
    const hash2 = await hashPassword('mesmasenha')
    expect(hash1).not.toBe(hash2)
  })

  it('rejects empty string as wrong password', async () => {
    const hash = await hashPassword('alguma-senha')
    const valid = await verifyPassword('', hash)
    expect(valid).toBe(false)
  })
})
