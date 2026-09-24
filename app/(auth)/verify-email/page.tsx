import Link from "next/link";
import { VerifyEmailAction } from "@/components/auth/verify-email-action";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token = "", email = "" } = await searchParams;
  return <main className="auth-page"><div className="auth-orbit auth-orbit-one" aria-hidden="true" /><section className="auth-panel animate-fade-up"><ThemeToggle className="absolute right-5 top-5" />
    <Link href="/" className="auth-brand"><span className="auth-brand-mark">A</span><span>AgendaFlow</span></Link>
    <p className="auth-eyebrow">Só falta confirmar</p><h1 className="auth-title">Confirme seu e-mail</h1><p className="auth-description mb-7">Confirme que <strong>{email || "este endereço"}</strong> é seu para liberar o acesso à sua agenda.</p>
    <VerifyEmailAction email={email} token={token} />
  </section><p className="auth-footnote">Seus horários, organizados em um só lugar.</p></main>;
}
