import "server-only"

// Transporte de mensagens WhatsApp. Suporta Twilio; sem credenciais, cai em
// modo dev (loga no servidor). Trocar por Meta WhatsApp Business API = novo branch.

export type SendResult = { delivered: boolean; provider: string }

export async function sendWhatsappMessage(
  whatsapp: string,
  body: string
): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM // ex.: "whatsapp:+14155238886"

  if (sid && token && from) {
    const to = whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`
    const params = new URLSearchParams({
      To: `whatsapp:+${to}`,
      From: from,
      Body: body,
    })
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    )
    return { delivered: res.ok, provider: "twilio" }
  }

  console.log(`[whatsapp dev] ${whatsapp} -> ${body}`)
  return { delivered: true, provider: "dev" }
}
