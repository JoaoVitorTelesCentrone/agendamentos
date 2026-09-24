"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { AuthShell, FormError, TextField } from "@/components/auth-ui"

export function ResetForm({ email, token }: { email: string; token: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    const password = String(new FormData(event.currentTarget).get("password") ?? "")
    const response = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, token, password }),
    }).catch(() => null)
    setLoading(false)
    if (!response) { setError("Não foi possível conectar ao servidor."); return }
    const data = await response.json().catch(() => ({})) as { message?: string; error?: string }
    if (!response.ok) { setError(data.error ?? "Não foi possível redefinir a senha."); return }
    router.push("/entrar?senha=atualizada")
  }

  return <AuthShell title="Criar nova senha" subtitle="Use pelo menos 10 caracteres." footer={<Link className="font-medium text-foreground underline underline-offset-4" href="/entrar">Voltar para entrar</Link>}><form onSubmit={submit} className="flex flex-col gap-4"><FormError message={error} /><TextField label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /><Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Atualizar senha"}</Button></form></AuthShell>
}
