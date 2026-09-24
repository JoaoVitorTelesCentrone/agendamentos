import "server-only"

import { createHash, randomInt } from "node:crypto"

export const OTP_TTL_MIN = 10 // validade do código
export const OTP_MAX_ATTEMPTS = 5 // tentativas de digitação por código
export const OTP_RESEND_COOLDOWN_S = 45 // intervalo mínimo entre envios
export const OTP_BOOKING_WINDOW_MIN = 30 // quanto tempo a verificação vale p/ agendar

export function normalizeWhatsapp(input: string): string {
  return (input ?? "").replace(/\D/g, "")
}

export function generateCode(): string {
  return String(randomInt(100000, 1000000)) // 6 dígitos
}

// Hash com sal por tenant+número — não guardamos o código em claro.
export function hashCode(code: string, tenantId: string, whatsapp: string): string {
  return createHash("sha256")
    .update(`${tenantId}:${whatsapp}:${code}`)
    .digest("hex")
}

// Modo dev: sem provider configurado, o código é logado e devolvido ao front.
export function isDevMode(): boolean {
  return process.env.OTP_DEV_MODE === "true" &&
    (process.env.NODE_ENV !== "production" || process.env.APP_ENV === "local")
}
