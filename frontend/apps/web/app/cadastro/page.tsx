"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Wallet } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { AuthShell, TextField, FormError } from "@/components/auth-ui"
import { register } from "@/lib/auth"
import { formatBRL } from "@/lib/quiz-diagnosis"
import {
  clearHandoff,
  getHandoffServerSnapshot,
  getHandoffSnapshot,
  subscribeHandoff,
} from "@/lib/quiz-handoff"

export default function CadastroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Quem vem do diagnóstico chega com um número na cabeça. Repetir esse número
  // aqui é o que mantém a promessa viva no ponto de maior fricção do funil.
  const handoff = useSyncExternalStore(
    subscribeHandoff,
    getHandoffSnapshot,
    getHandoffServerSnapshot
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const businessName = String(form.get("business_name") ?? "").trim()
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
      await register({ businessName, nome, email, password, niche: handoff?.niche })
      clearHandoff()
      router.refresh()
      router.push("/painel")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.")
      setLoading(false)
    }
  }

  const recovered = handoff?.recoveredMonthlyCents ?? 0

  return (
    <AuthShell
      title={recovered > 0 ? "Falta pouco pra recuperar isso" : "Crie sua agenda grátis"}
      subtitle={
        recovered > 0
          ? "Quatro campos e sua agenda entra no ar — já com seus serviços cadastrados."
          : "Configure seu negócio em poucos minutos. Sem cartão de crédito."
      }
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      {recovered > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-money/40 bg-money/[0.06] p-4">
          <Wallet className="mt-0.5 size-4 shrink-0 text-money" />
          <p className="text-sm leading-relaxed text-pretty">
            Seu diagnóstico:{" "}
            <span className="font-medium tabular-nums text-money">
              {formatBRL(recovered)} por mês
            </span>{" "}
            de volta no seu caixa
            {handoff && handoff.hoursSaved > 0 && (
              <>
                {" "}
                — e{" "}
                <span className="font-medium">{handoff.hoursSaved}h</span> que
                param de ir embora no WhatsApp
              </>
            )}
            . Começa agora.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <TextField
          label="Nome do negócio ou espaço de atendimento"
          name="business_name"
          type="text"
          placeholder="Studio Aurora ou Clínica Horizonte"
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
          placeholder="voce@seunegocio.com.br"
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
          {loading
            ? "Criando..."
            : recovered > 0
              ? `Recuperar ${formatBRL(recovered)} por mês`
              : "Criar minha agenda"}
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
