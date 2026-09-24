"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, token, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Não foi possível trocar a senha."); return; }
      setDone(true); setMessage(data.message);
    } catch { setError("Não conseguimos conectar. Tente novamente."); }
    finally { setLoading(false); }
  }

  if (done) return <div className="space-y-4"><p role="status" className="auth-success">{message}</p><Link href="/login" className="auth-primary block text-center">Entrar com a nova senha</Link></div>;

  return <form onSubmit={submit} className="space-y-4">
    {!token || !email ? <p className="auth-error">Este link está incompleto. Solicite uma nova recuperação.</p> : <>
      <p className="text-sm text-[#68797a]">Conta: {email}</p>
      <div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 10 caracteres" className="h-12 rounded-xl border-[#d9e5e1] bg-white text-[#172b35]" /></div>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <Button type="submit" disabled={loading} className="auth-primary w-full">{loading ? "Salvando…" : "Salvar nova senha"}</Button>
    </>}
  </form>;
}
