"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { AuthShell, FormError, TextField } from "@/components/auth-ui"

export default function RecuperarSenhaPage() {
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    const email = String(new FormData(event.currentTarget).get("email") ?? "")
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    }).catch(() => null)
    setLoading(false)
    if (!response) { setError("Não foi possível conectar ao servidor."); return }
    const data = await response.json().catch(() => ({})) as { message?: string; error?: string }
    if (!response.ok) setError(data.error ?? "Não foi possível solicitar o link.")
    else setMessage(data.message ?? "Se houver uma conta com esse e-mail, enviaremos um link para redefinir a senha.")
  }

  return <AuthShell title="Recuperar senha" subtitle="Enviaremos um link para o e-mail da sua conta." footer={<Link className="font-medium text-foreground underline underline-offset-4" href="/entrar">Voltar para entrar</Link>}><form onSubmit={submit} className="flex flex-col gap-4"><FormError message={error} /><TextField label="E-mail" name="email" type="email" autoComplete="email" required /><Button type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar link"}</Button>{message && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">{message}</p>}</form></AuthShell>
}
