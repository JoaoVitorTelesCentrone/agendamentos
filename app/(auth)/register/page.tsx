"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloatingInput } from "@/components/watermelon/floating-input";
import { generateSlug } from "@/lib/utils/slug";

type Step = "auth" | "business";

function RegisterForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(() => searchParams.get("step") === "business" ? "business" : "auth");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Não foi possível criar sua conta.");
        return;
      }
      const signInResponse = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnTo: "/register?step=business" }),
      });
      if (!signInResponse.ok) {
        window.location.href = "/login";
        return;
      }
      window.history.replaceState(null, "", "/register?step=business");
      setStep("business");
    } catch {
      setError("Não conseguimos conectar. Confira sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBusiness() {
    if (!businessName.trim() || !slug.trim()) { setError("Preencha o nome do negócio e o link da sua página."); return; }
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: businessName, slug }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Não foi possível criar a página.");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Não conseguimos conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = "h-12 rounded-xl border-[#d9e5e1] bg-white text-[#172b35] placeholder:text-[#8a9b9c] focus-visible:ring-[#176b55]";

  return (
    <main className="auth-page">
      <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
      <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
      <section className="auth-panel animate-fade-up">
        <Link href="/" className="auth-brand" aria-label="AgendaFlow, início">
          <span className="auth-brand-mark">A</span><span>AgendaFlow</span>
        </Link>

        {step === "auth" ? (
          <>
            <div className="mb-7"><p className="auth-eyebrow">Sua agenda começa aqui</p><h1 className="auth-title">Crie sua conta</h1><p className="auth-description">Organize os horários e deixe seus clientes agendarem pelo link.</p></div>
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="space-y-2"><FloatingInput id="register-name" label="Seu nome" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" className={fieldClass} /></div>
              <div className="space-y-2"><FloatingInput id="register-email" label="E-mail" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" className={fieldClass} /></div>
              <div className="space-y-2"><FloatingInput id="register-password" label="Senha" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 10 caracteres" className={fieldClass} /><p className="text-xs text-[#718183]">Use pelo menos 10 caracteres.</p></div>
              {error && <p role="alert" className="auth-error">{error}</p>}
              <Button type="submit" disabled={loading} className="auth-primary w-full">{loading ? "Criando sua conta…" : "Criar conta grátis"}<ArrowRight size={16} /></Button>
            </form>
            <div className="auth-divider"><span>ou</span></div>
            <Button type="button" onClick={() => signIn("google", { callbackUrl: "/register?step=business" })} variant="ghost" className="auth-google w-full"><Globe2 size={17} />Continuar com Google</Button>
            <p className="mt-6 text-center text-sm text-[#69797a]">Já tem conta? <Link href="/login" className="auth-text-link">Entrar</Link></p>
          </>
        ) : (
          <>
            <button onClick={() => setStep("auth")} className="mb-6 inline-flex items-center gap-2 text-sm text-[#627375] hover:text-[#176b55]"><ArrowLeft size={15} />Voltar</button>
            <p className="auth-eyebrow">Quase pronto</p><h1 className="auth-title">Dê um nome à sua agenda</h1><p className="auth-description mb-7">Seus clientes vão encontrar sua página por este endereço.</p>
            <div className="space-y-5">
              <div className="space-y-2"><Label htmlFor="business-name">Nome do negócio</Label><Input id="business-name" placeholder="Ex.: Estúdio da Marina" value={businessName} onChange={(event) => { setBusinessName(event.target.value); setSlug(generateSlug(event.target.value)); }} className={fieldClass} /></div>
              <div className="space-y-2"><Label htmlFor="business-slug">Link da página</Label><div className="flex"><span className="inline-flex items-center rounded-l-xl border border-r-0 border-[#d9e5e1] bg-[#f4f8f6] px-3 text-sm text-[#718183]">agendaflow.com.br/</span><Input id="business-slug" value={slug} onChange={(event) => setSlug(generateSlug(event.target.value))} className={`${fieldClass} rounded-l-none`} /></div></div>
              {error && <p role="alert" className="auth-error">{error}</p>}
              <Button onClick={handleCreateBusiness} disabled={loading} className="auth-primary w-full">{loading ? "Criando sua página…" : "Criar minha agenda"}<ArrowRight size={16} /></Button>
            </div>
          </>
        )}
      </section>
      <p className="auth-footnote">Seus horários, organizados em um só lugar.</p>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <div className="dark" style={{ colorScheme: "dark" }}>
      <Suspense fallback={<main className="auth-page"><section className="auth-panel" /></main>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
