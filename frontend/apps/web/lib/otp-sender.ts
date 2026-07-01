import "server-only"

import { sendWhatsappMessage, type SendResult } from "@/lib/whatsapp"

// Envia o código OTP pelo WhatsApp (usa o transporte compartilhado).
export async function sendWhatsappOtp(
  whatsapp: string,
  code: string,
  tenantName: string
): Promise<SendResult> {
  const message = `${tenantName}: seu código de confirmação é ${code}. Válido por 10 minutos.`
  return sendWhatsappMessage(whatsapp, message)
}
