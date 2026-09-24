"use client"

import { useState } from "react"

import { Button } from "@workspace/ui/components/button"

export function BillingAction({ mode }: { mode: "checkout" | "portal" }) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function openBilling() {
    setError("")
    setLoading(true)
    const response = await fetch(`/api/painel/billing/${mode}`, { method: "POST" }).catch(() => null)
    setLoading(false)
    if (!response) { setError("Não foi possível conectar ao servidor."); return }
    const data = await response.json().catch(() => ({})) as { url?: string; error?: string }
    if (!response.ok || !data.url) { setError(data.error ?? "Não foi possível abrir a cobrança."); return }
    window.location.assign(data.url)
  }

  return <div className="space-y-2"><Button onClick={openBilling} disabled={loading}>{loading ? "Abrindo…" : mode === "checkout" ? "Assinar Pro" : "Gerenciar cobrança"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div>
}
