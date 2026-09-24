import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

interface AppointmentEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  servicePrice: string;
  serviceDuration: number;
  date: Date;
  businessName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  ownerEmail: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export async function sendAppointmentConfirmation(data: AppointmentEmailData) {
  const resend = getResend();
  if (!resend || !process.env.RESEND_FROM) {
    console.info("Email não enviado: RESEND_API_KEY/RESEND_FROM não configurados");
    return;
  }

  const customerName = escapeHtml(data.customerName);
  const customerEmail = escapeHtml(data.customerEmail);
  const serviceName = escapeHtml(data.serviceName);
  const businessName = escapeHtml(data.businessName);
  const businessAddress = data.businessAddress ? escapeHtml(data.businessAddress) : null;
  const businessPhone = data.businessPhone ? escapeHtml(data.businessPhone) : null;
  const customerPhone = data.customerPhone ? escapeHtml(data.customerPhone) : null;
  const dateStr = formatDate(data.date);
  const timeStr = formatTime(data.date);

  await Promise.all([
    resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: data.customerEmail,
      subject: `Agendamento recebido — ${data.businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
          <h2 style="color: #111;">Olá, ${customerName}!</h2>
          <p>Seu agendamento foi recebido com sucesso!</p>
          <table style="width:100%; border-collapse: collapse; margin: 24px 0;">
            <tr><td style="padding: 8px 0; color: #555;">Serviço</td><td style="padding: 8px 0; font-weight: 500;">${serviceName}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Data</td><td style="padding: 8px 0; font-weight: 500; text-transform: capitalize;">${dateStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Horário</td><td style="padding: 8px 0; font-weight: 500;">${timeStr}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Duração</td><td style="padding: 8px 0; font-weight: 500;">${data.serviceDuration} minutos</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Valor</td><td style="padding: 8px 0; font-weight: 500;">R$ ${data.servicePrice}</td></tr>
            ${businessAddress ? `<tr><td style="padding: 8px 0; color: #555;">Local</td><td style="padding: 8px 0; font-weight: 500;">${businessAddress}</td></tr>` : ""}
            ${businessPhone ? `<tr><td style="padding: 8px 0; color: #555;">Contato</td><td style="padding: 8px 0; font-weight: 500;">${businessPhone}</td></tr>` : ""}
          </table>
          <p style="color: #555;">Aguardamos você!</p>
          <p style="font-weight: 500;">— ${businessName}</p>
        </div>
      `,
    }),

    resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: data.ownerEmail,
      subject: `Novo agendamento — ${data.customerName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
          <h2 style="color: #111;">Você tem um novo agendamento!</h2>
          <table style="width:100%; border-collapse: collapse; margin: 24px 0;">
            <tr><td style="padding: 8px 0; color: #555;">Cliente</td><td style="padding: 8px 0; font-weight: 500;">${customerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Email</td><td style="padding: 8px 0; font-weight: 500;">${customerEmail}</td></tr>
            ${customerPhone ? `<tr><td style="padding: 8px 0; color: #555;">Telefone</td><td style="padding: 8px 0; font-weight: 500;">${customerPhone}</td></tr>` : ""}
            <tr><td style="padding: 8px 0; color: #555;">Serviço</td><td style="padding: 8px 0; font-weight: 500;">${serviceName}</td></tr>
            <tr><td style="padding: 8px 0; color: #555;">Data e hora</td><td style="padding: 8px 0; font-weight: 500; text-transform: capitalize;">${dateStr} às ${timeStr}</td></tr>
          </table>
          <p style="color: #555;">Acesse seu painel para confirmar ou cancelar.</p>
        </div>
      `,
    }),
  ]);
}
