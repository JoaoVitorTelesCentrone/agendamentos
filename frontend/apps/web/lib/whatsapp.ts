import "server-only"

// Transporte de mensagens WhatsApp via Twilio.
//
// Três modos, do menos ao mais pronto para produção:
//   1. Sem credenciais Twilio         → modo dev (loga no servidor).
//   2. Com credenciais, sem template  → texto livre. Só funciona no Sandbox do
//      Twilio ou dentro da janela de 24h após o cliente escrever primeiro —
//      a Meta rejeita texto livre para mensagens iniciadas pela empresa.
//   3. Com credenciais + Content SID  → envia por template aprovado pela Meta.
//      É o único jeito aceito em produção para OTP/confirmação/lembrete, que
//      são sempre iniciados pelo salão. Ver TWILIO_TEMPLATE_*_SID no .env.
//
// Trocar de provider (Meta WhatsApp Business API direta) = novo módulo.

export type SendResult = { delivered: boolean; provider: string }

type TwilioCreds = { sid: string; token: string; from: string }

function credentials(): TwilioCreds | null {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM // ex.: "whatsapp:+14155238886"
  return sid && token && from ? { sid, token, from } : null
}

function toWhatsapp(whatsapp: string): string {
  const to = whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`
  return `whatsapp:+${to}`
}

async function post(creds: TwilioCreds, params: URLSearchParams): Promise<SendResult> {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.sid}:${creds.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[whatsapp] falha no envio:", res.status, text.slice(0, 300))
  }
  return { delivered: res.ok, provider: "twilio" }
}

// Texto livre — só válido no Sandbox ou dentro da janela de 24h de conversa
// iniciada pelo cliente. Preferir sendWhatsappTemplate quando disponível.
export async function sendWhatsappMessage(
  whatsapp: string,
  body: string
): Promise<SendResult> {
  const creds = credentials()
  if (!creds) {
    console.log(`[whatsapp dev] ${whatsapp} -> ${body}`)
    return { delivered: true, provider: "dev" }
  }
  return post(
    creds,
    new URLSearchParams({ To: toWhatsapp(whatsapp), From: creds.from, Body: body })
  )
}

// Envia por template aprovado (Twilio Content API). `contentSid` é o "HXxxxx"
// do template aprovado pela Meta (Twilio Console → Content Template Builder).
// `variables` usa as chaves "1", "2", ... na mesma ordem das variáveis {{1}},
// {{2}} do template. `fallbackBody` é usado só no modo dev (sem credenciais).
export async function sendWhatsappTemplate(
  whatsapp: string,
  contentSid: string,
  variables: Record<string, string>,
  fallbackBody: string
): Promise<SendResult> {
  const creds = credentials()
  if (!creds) {
    console.log(`[whatsapp dev/template ${contentSid}] ${whatsapp} -> ${fallbackBody}`)
    return { delivered: true, provider: "dev" }
  }
  return post(
    creds,
    new URLSearchParams({
      To: toWhatsapp(whatsapp),
      From: creds.from,
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(variables),
    })
  )
}
