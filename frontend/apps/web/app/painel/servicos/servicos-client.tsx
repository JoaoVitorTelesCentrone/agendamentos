"use client"

import { useState, useTransition } from "react"
import { Trash2, Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field, TextArea, formatPrice } from "@/components/ui-form"
import type { Service } from "@/lib/supabase/types"
import { createService, deleteService, toggleService } from "./actions"

export function ServicosClient({
  initialServices,
}: {
  initialServices: Service[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)
    startTransition(async () => {
      const res = await createService(data)
      if (res?.error) setError(res.error)
      else form.reset()
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      {/* Formulário */}
      <form
        onSubmit={onSubmit}
        className="flex h-fit flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm shadow-foreground/5"
      >
        <h2 className="font-medium">Novo serviço</h2>
        {error && (
          <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Field label="Nome" name="name" placeholder="Corte feminino" required />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Duração (min)"
            name="duration_min"
            type="number"
            min={1}
            step={1}
            placeholder="45"
            required
          />
          <Field
            label="Preço (R$)"
            name="price"
            inputMode="decimal"
            placeholder="80,00"
          />
        </div>
        <TextArea
          label="Descrição (opcional)"
          name="description"
          placeholder="Detalhes que o cliente vê na página."
        />
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" data-icon="inline-start" />
          {pending ? "Salvando..." : "Adicionar serviço"}
        </Button>
      </form>

      {/* Lista */}
      <div className="flex flex-col">
        {initialServices.length === 0 ? (
          <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum serviço ainda. Cadastre o primeiro ao lado.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border/80 shadow-sm">
            {initialServices.map((s) => (
              <li key={s.id} className="flex items-center gap-3 bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{s.name}</span>
                    {!s.active && (
                      <span className="border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                        inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.duration_min} min · {formatPrice(s.price_cents)}
                  </p>
                </div>
                <ActionButtons id={s.id} active={s.active} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ActionButtons({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() =>
          startTransition(() => toggleService(id, !active).then(() => {}))
        }
        disabled={pending}
        className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {active ? "Desativar" : "Ativar"}
      </button>
      <button
        onClick={() =>
          startTransition(() => deleteService(id).then(() => {}))
        }
        disabled={pending}
        className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
        aria-label="Excluir"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
