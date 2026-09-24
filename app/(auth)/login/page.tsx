"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/watermelon/floating-input";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl") ?? "/dashboard";
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnTo: callbackUrl }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Não foi possível entrar."); return; }
      window.location.href = data.returnTo;
    } catch {
      setError("Não conseguimos conectar. Confira sua internet e tente novamente.");
    } finally { setLoading(false); }
  }

  const fieldClass = "h-12 rounded-xl border-[#d9e5e1] bg-white text-[#172b35] placeholder:text-[#8a9b9c] focus-visible:ring-[#176b55]";

  return (
    <>
      <main className="auth-page">
        <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
        <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
        <section className="auth-panel animate-fade-up">
          <ThemeToggle className="absolute right-5 top-5" />
          <Link href="/" className="auth-brand" aria-label="AgendaFlow, início"><span className="auth-brand-mark">A</span><span>AgendaFlow</span></Link>
          <div className="mb-7"><p className="auth-eyebrow">Bom ter você de volta</p><h1 className="auth-title">Entre na sua conta</h1><p className="auth-description">Acesse sua agenda e veja os próximos atendimentos.</p></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><FloatingInput id="login-email" label="E-mail" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" className={fieldClass} /></div>
            <div className="space-y-2"><div className="flex items-center justify-end"><Link href="/forgot-password" className="text-xs font-medium text-[#176b55] hover:underline">Esqueci minha senha</Link></div><FloatingInput id="login-password" aria-label="Senha" label="Senha" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" className={fieldClass} /></div>
            {error && <p role="alert" className="auth-error">{error}</p>}
            <Button type="submit" disabled={loading} className="auth-primary w-full">{loading ? "Entrando…" : "Entrar"}<ArrowRight size={16} /></Button>
          </form>
          <div className="auth-divider"><span>ou</span></div>
          <Button onClick={() => signIn("google", { callbackUrl: new URLSearchParams(window.location.search).get("callbackUrl") ?? "/dashboard" })} variant="ghost" className="auth-google w-full"><Globe2 size={17} />Continuar com Google</Button>
          <p className="mt-6 text-center text-sm text-[#69797a]">Ainda não tem conta? <Link href="/register" className="auth-text-link">Criar conta grátis</Link></p>
        </section>
        <p className="auth-footnote">Seus horários, organizados em um só lugar.</p>
      </main>
    </>
  );
}
