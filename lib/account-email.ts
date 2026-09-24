import "server-only";

import { Resend } from "resend";

type AccountEmailKind = "verify" | "reset";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendAccountEmail({
  kind,
  email,
  name,
  token,
  origin,
}: {
  kind: AccountEmailKind;
  email: string;
  name: string | null;
  token: string;
  origin: string;
}) {
  const path = kind === "verify" ? "/verify-email" : "/reset-password";
  const link = new URL(path, origin);
  link.searchParams.set("token", token);
  link.searchParams.set("email", email);

  const subject = kind === "verify" ? "Confirme seu e-mail no AgendaFlow" : "Troque sua senha do AgendaFlow";
  const title = kind === "verify" ? "Confirme seu e-mail" : "Crie uma nova senha";
  const action = kind === "verify" ? "Confirmar e-mail" : "Trocar senha";
  const explanation =
    kind === "verify"
      ? "Use o botão abaixo para confirmar seu endereço e continuar o cadastro."
      : "Recebemos um pedido para trocar a senha da sua conta. Se foi você, escolha uma nova senha no botão abaixo.";
  const greeting = name ? `Olá, ${escapeHtml(name)}!` : "Olá!";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:32px auto;padding:32px;color:#172b35;border:1px solid #dce8e5;border-radius:18px">
      <p style="font-size:14px;color:#477265;font-weight:700">AgendaFlow</p>
      <h1 style="font-size:26px;margin:24px 0 12px">${title}</h1>
      <p>${greeting}</p>
      <p style="line-height:1.6;color:#52636a">${explanation}</p>
      <p style="margin:28px 0"><a href="${link.toString()}" style="background:#176b55;color:white;padding:13px 20px;border-radius:9px;text-decoration:none;font-weight:700">${action}</a></p>
      <p style="font-size:13px;line-height:1.6;color:#687a7e">Este link expira em ${kind === "verify" ? "30 minutos" : "1 hora"}. Se você não solicitou isso, pode ignorar este e-mail.</p>
      <p style="font-size:12px;color:#819093;word-break:break-all">${link.toString()}</p>
    </div>`;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || apiKey === "re_dev_dummy") {
    if (process.env.NODE_ENV === "development") {
      console.info(`[auth-email] ${kind} para ${email}: ${link.toString()}`);
      return { previewUrl: link.toString() };
    }
    throw new Error("RESEND_API_KEY não configurada para envio de e-mails.");
  }
  if (!from) throw new Error("RESEND_FROM não configurado para envio de e-mails.");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to: email, subject, html });
  if (result.error) throw new Error(result.error.message);
  return { previewUrl: null };
}
