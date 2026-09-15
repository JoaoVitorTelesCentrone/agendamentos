import { SignJWT, jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const value = process.env.JWT_SECRET
  if (!value) {
    throw new Error('JWT_SECRET is required to use authenticated endpoints')
  }
  return new TextEncoder().encode(value)
}

export interface JwtPayload {
  sub: string
  role: string
  name: string
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as JwtPayload
}
