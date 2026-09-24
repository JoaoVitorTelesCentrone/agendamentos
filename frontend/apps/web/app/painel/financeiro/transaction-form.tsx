"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"

export function TransactionForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(formData: FormData) {
    setSaving(true)
    setError("")
    const amount = Number(String(formData.get("amount") ?? "").replace(",", "."))
    const response = await fetch("/api/painel/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: formData.get("type"),
        description: formData.get("description"),
        category: formData.get("category"),
        amount_cents: Math.round(amount * 100),
        occurred_on: formData.get("occurred_on"),
        recurring: formData.get("recurring") === "on",
        cost_type: formData.get("cost_type"),
      }),
    })
    setSaving(false)
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string }
      setError(result.error ?? "Não foi possível salvar o lançamento.")
      return
    }
    ;(document.querySelector("#transaction-form") as HTMLFormElement | null)?.reset()
    router.refresh()
  }

  return (
    <form id="transaction-form" action={submit} className="grid gap-3 rounded-2xl border border-border/80 bg-card p-5 sm:grid-cols-2 xl:grid-cols-7">
      <label className="grid gap-1 text-sm">Tipo<select name="type" className="h-10 rounded-lg border border-input bg-background px-3"><option value="expense">Despesa</option><option value="income">Receita</option></select></label>
      <label className="grid gap-1 text-sm xl:col-span-2">Descrição<input name="description" required maxLength={140} className="h-10 rounded-lg border border-input bg-background px-3" placeholder="Ex.: aluguel" /></label>
      <label className="grid gap-1 text-sm">Categoria<input name="category" required maxLength={60} className="h-10 rounded-lg border border-input bg-background px-3" placeholder="Ex.: estrutura" /></label>
      <label className="grid gap-1 text-sm">Valor em R$<input name="amount" required inputMode="decimal" type="number" min="0.01" step="0.01" className="h-10 rounded-lg border border-input bg-background px-3" /></label>
      <label className="grid gap-1 text-sm">Data<input name="occurred_on" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-10 rounded-lg border border-input bg-background px-3" /></label>
      <div className="flex items-end"><Button disabled={saving} type="submit" className="w-full">{saving ? "Salvando…" : "Adicionar"}</Button></div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2"><input name="recurring" type="checkbox" className="accent-primary" />Despesa recorrente</label>
      <label className="grid gap-1 text-sm sm:col-span-2">Natureza da despesa<select name="cost_type" className="h-10 rounded-lg border border-input bg-background px-3"><option value="fixed">Fixa</option><option value="variable">Variável</option></select></label>
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2 xl:col-span-7">{error}</p>}
    </form>
  )
}
