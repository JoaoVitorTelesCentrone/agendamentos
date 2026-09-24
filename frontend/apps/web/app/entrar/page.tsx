"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { AuthShell, TextField, FormError } from "@/components/auth-ui"
import { login } from "@/lib/auth"

export default function EntrarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")

    setLoading(true)
    try {
      await login({ email, password })
      const requestedPath = new URLSearchParams(window.location.search).get("next")
      const destination =
        requestedPath?.startsWith("/painel") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/painel"
      router.refresh()
      router.push(destination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.")
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse o painel do seu salão."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-foreground underline underline-offset-4">
            Criar agora
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          placeholder="voce@salao.com"
          autoComplete="email"
          required
        />
        <TextField
          label="Senha"
          name="password"
          type="password"
          placeholder="Sua senha"
          autoComplete="current-password"
          required
        />
        <Link href="/recuperar-senha" className="-mt-2 self-end text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">Esqueci minha senha</Link>
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
          {!loading && <ArrowRight className="size-4" data-icon="inline-end" />}
        </Button>
      </form>
    </AuthShell>
  )
}
