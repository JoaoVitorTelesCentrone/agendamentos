"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function VerifyEmailAction({ email, token }: { email: string; token: string }) {
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, token }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error ?? "Não foi possível confirmar o e-mail."); return; }
      setVerified(true); setMessage(data.message);
    } catch { setMessage("Não conseguimos conectar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return <div className="space-y-4">
    {message && <p role="status" className={verified ? "auth-success" : "auth-error"}>{message}</p>}
    {verified ? <Link href="/login" className="auth-primary block text-center">Ir para entrar</Link> : <Button onClick={verify} disabled={loading || !token || !email} className="auth-primary w-full">{loading ? "Confirmando…" : "Confirmar meu e-mail"}</Button>}
    {(!token || !email) && <p className="auth-error">O link está incompleto. Crie sua conta novamente para receber outro.</p>}
    <p className="text-center text-sm text-[#69797a]">O link expira em 30 minutos.</p>
  </div>;
}
