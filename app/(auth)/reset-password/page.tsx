import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const { token = "", email = "" } = await searchParams;
  return <main className="auth-page"><div className="auth-orbit auth-orbit-two" aria-hidden="true" /><section className="auth-panel animate-fade-up"><ThemeToggle className="absolute right-5 top-5" />
    <Link href="/" className="auth-brand"><span className="auth-brand-mark">A</span><span>AgendaFlow</span></Link>
    <p className="auth-eyebrow">Novo começo</p><h1 className="auth-title">Crie uma nova senha</h1><p className="auth-description mb-7">Escolha uma senha com pelo menos 10 caracteres.</p>
    <ResetPasswordForm email={email} token={token} />
  </section><p className="auth-footnote">Seus horários, organizados em um só lugar.</p></main>;
}
