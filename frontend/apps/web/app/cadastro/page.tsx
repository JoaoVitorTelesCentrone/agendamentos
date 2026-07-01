"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { AuthShell, TextField, FormError } from "@/components/auth-ui"
import { register } from "@/lib/auth"

export default function CadastroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const salao = String(form.get("salao") ?? "").trim()
    const nome = String(form.get("nome") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")

    if (nome.length < 2) {
      setError("Informe seu nome.")
      return
    }
    if (password.length < 6) {
      setError("A senha precisa ter no mínimo 6 caracteres.")
      return
    }

    setLoading(true)
    try {
      await register({ salao, nome, email, password })
      router.refresh()
      router.push("/painel")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.")
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Crie sua agenda grátis"
      subtitle="Configure seu salão em poucos minutos. Sem cartão de crédito."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="Nome do salão"
          name="salao"
          type="text"
          placeholder="Studio Bella"
          autoComplete="organization"
          required
        />
        <TextField
          label="Seu nome"
          name="nome"
          type="text"
          placeholder="Maria Silva"
          autoComplete="name"
          required
        />
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
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
          {loading ? "Criando..." : "Criar minha agenda"}
          {!loading && <ArrowRight className="size-4" data-icon="inline-end" />}
        </Button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        Ao continuar, você concorda com os termos de uso e a política de
        privacidade.
      </p>
    </AuthShell>
  )
}
