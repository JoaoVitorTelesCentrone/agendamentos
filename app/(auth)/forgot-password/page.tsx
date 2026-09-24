"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage(""); setPreviewUrl(null);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      setMessage(data.message);
      setPreviewUrl(data.previewUrl ?? null);
    } catch { setError("Não conseguimos conectar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><div className="auth-orbit auth-orbit-one" aria-hidden="true" /><section className="auth-panel animate-fade-up"><ThemeToggle className="absolute right-5 top-5" />
    <Link href="/" className="auth-brand"><span className="auth-brand-mark">A</span><span>AgendaFlow</span></Link>
    <p className="auth-eyebrow">Recuperação de acesso</p><h1 className="auth-title">Troque sua senha</h1><p className="auth-description mb-7">Informe o e-mail da sua conta. Vamos enviar um link para você criar outra senha.</p>
    <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="forgot-email">E-mail</Label><Input id="forgot-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" className="h-12 rounded-xl border-[#d9e5e1] bg-white text-[#172b35]" /></div>
      {error && <p role="alert" className="auth-error">{error}</p>}{message && <p role="status" className="auth-success">{message}</p>}
      {previewUrl && <a href={previewUrl} className="auth-primary block text-center">Abrir link de recuperação local</a>}
      {!message && <Button type="submit" disabled={loading} className="auth-primary w-full">{loading ? "Enviando…" : "Enviar link"}<ArrowRight size={16} /></Button>}
    </form>
    <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-[#176b55] hover:underline"><ArrowLeft size={15} />Voltar para entrar</Link>
  </section><p className="auth-footnote">Seus horários, organizados em um só lugar.</p></main>;
}
