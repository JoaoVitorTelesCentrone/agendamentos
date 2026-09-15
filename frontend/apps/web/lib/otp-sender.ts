import "server-only"

import { sendWhatsappMessage, sendWhatsappTemplate, type SendResult } from "@/lib/whatsapp"

// Envia o código OTP pelo WhatsApp. Usa o template de Autenticação aprovado
// pela Meta assim que TWILIO_TEMPLATE_OTP_SID estiver configurado; até lá,
// cai no texto livre (funciona no Sandbox/modo dev).
export async function sendWhatsappOtp(
  whatsapp: string,
  code: string,
  tenantName: string
): Promise<SendResult> {
  const body = `${tenantName}: seu código de confirmação é ${code}. Válido por 10 minutos.`

  const contentSid = process.env.TWILIO_TEMPLATE_OTP_SID
  if (contentSid) {
    // Template de Autenticação da Meta: corpo fixo "{{1}} é o seu código de
    // verificação.", só a variável 1 (o código) é customizável.
    return sendWhatsappTemplate(whatsapp, contentSid, { "1": code }, body)
  }
  return sendWhatsappMessage(whatsapp, body)
}
