import { randomBytes, scrypt, timingSafeEqual } from "crypto"
import { promisify } from "util"

// Hash de senha com scrypt (nativo do Node — sem dependência externa).
// Formato armazenado: "<salt_hex>:<derivada_hex>".
const scryptAsync = promisify(scrypt)
const KEYLEN = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  return `${salt}:${derived.toString("hex")}`
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, keyHex] = stored.split(":")
  if (!salt || !keyHex) return false
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  const keyBuf = Buffer.from(keyHex, "hex")
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived)
}
