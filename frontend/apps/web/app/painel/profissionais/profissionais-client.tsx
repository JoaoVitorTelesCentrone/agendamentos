"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2, Clock, BriefcaseBusiness } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field } from "@/components/ui-form"
import type {
  Professional,
  Service,
  ServiceProfessional,
  WorkingHour,
} from "@/lib/supabase/types"
import {
  createProfessional,
  deleteProfessional,
  setProfessionalServices,
  setWorkingHours,
  toggleProfessional,
} from "./actions"

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
]

type DayState = { enabled: boolean; start: string; end: string }

export function ProfissionaisClient({
  professionals,
  services,
  hours,
  links,
}: {
  professionals: Professional[]
  services: Service[]
  hours: WorkingHour[]
  links: ServiceProfessional[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)
    startTransition(async () => {
      const res = await createProfessional(data)
      if (res?.error) setError(res.error)
      else form.reset()
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/80 bg-card p-6 shadow-sm shadow-foreground/5"
      >
        <div className="min-w-56 flex-1">
          <Field label="Nome do profissional" name="name" placeholder="Ana" required />
        </div>
        {error && <span className="text-sm text-destructive">{error}</span>}
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" data-icon="inline-start" />
          {pending ? "Salvando..." : "Adicionar"}
        </Button>
      </form>

      {professionals.length === 0 ? (
        <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum profissional cadastrado ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {professionals.map((p) => (
            <ProfessionalCard
              key={p.id}
              professional={p}
              services={services}
              hours={hours.filter((h) => h.professional_id === p.id)}
              linkedServiceIds={links
                .filter((l) => l.professional_id === p.id)
                .map((l) => l.service_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProfessionalCard({
  professional,
  services,
  hours,
  linkedServiceIds,
}: {
  professional: Professional
  services: Service[]
  hours: WorkingHour[]
  linkedServiceIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-foreground/5">
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{professional.name}</span>
            {!professional.active && (
              <span className="border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                inativo
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {hours.length} dia(s) de trabalho · {linkedServiceIds.length} serviço(s)
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {open ? "Fechar" : "Configurar"}
        </button>
        <button
          onClick={() =>
            startTransition(() =>
              toggleProfessional(professional.id, !professional.active).then(
                () => {}
              )
            )
          }
          disabled={pending}
          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {professional.active ? "Desativar" : "Ativar"}
        </button>
        <button
          onClick={() =>
            startTransition(() =>
              deleteProfessional(professional.id).then(() => {})
            )
          }
          disabled={pending}
          className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
          aria-label="Excluir"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {open && (
        <div className="grid gap-6 border-t border-border p-4 md:grid-cols-2">
          <HoursEditor professionalId={professional.id} hours={hours} />
          <ServicesEditor
            professionalId={professional.id}
            services={services}
            linkedServiceIds={linkedServiceIds}
          />
        </div>
      )}
    </div>
  )
}

function HoursEditor({
  professionalId,
  hours,
}: {
  professionalId: string
  hours: WorkingHour[]
}) {
  const [days, setDays] = useState<DayState[]>(() =>
    WEEKDAYS.map((_, weekday) => {
      const wh = hours.find((h) => h.weekday === weekday)
      return {
        enabled: !!wh,
        start: wh?.start_time.slice(0, 5) ?? "09:00",
        end: wh?.end_time.slice(0, 5) ?? "18:00",
      }
    })
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function update(i: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  function save() {
    setMsg(null)
    const slots = days
      .map((d, weekday) => ({ ...d, weekday }))
      .filter((d) => d.enabled)
      .map((d) => ({
        weekday: d.weekday,
        start_time: d.start,
        end_time: d.end,
      }))
    startTransition(async () => {
      const res = await setWorkingHours(professionalId, slots)
      setMsg(res?.error ?? "Horários salvos.")
    })
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Clock className="size-4" /> Horários de trabalho
      </h3>
      <div className="flex flex-col gap-2">
        {days.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <label className="flex w-28 items-center gap-2">
              <input
                type="checkbox"
                checked={d.enabled}
                onChange={(e) => update(i, { enabled: e.target.checked })}
              />
              {WEEKDAYS[i]}
            </label>
            <input
              type="time"
              value={d.start}
              disabled={!d.enabled}
              onChange={(e) => update(i, { start: e.target.value })}
              className="h-8 border border-input bg-background px-2 disabled:opacity-40"
            />
            <span className="text-muted-foreground">até</span>
            <input
              type="time"
              value={d.end}
              disabled={!d.enabled}
              onChange={(e) => update(i, { end: e.target.value })}
              className="h-8 border border-input bg-background px-2 disabled:opacity-40"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar horários"}
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  )
}

function ServicesEditor({
  professionalId,
  services,
  linkedServiceIds,
}: {
  professionalId: string
  services: Service[]
  linkedServiceIds: string[]
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(linkedServiceIds)
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await setProfessionalServices(professionalId, [...selected])
      setMsg(res?.error ?? "Serviços vinculados.")
    })
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <BriefcaseBusiness className="size-4" /> Serviços que executa
      </h3>
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre serviços primeiro.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          onClick={save}
          disabled={pending || services.length === 0}
        >
          {pending ? "Salvando..." : "Salvar serviços"}
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  )
}
