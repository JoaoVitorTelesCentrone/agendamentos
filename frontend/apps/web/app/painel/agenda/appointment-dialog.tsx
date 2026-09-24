"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Clock } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Field } from "@/components/ui-form"
import type {
  Professional,
  Service,
  ServiceProfessional,
} from "@/lib/supabase/types"
import type { Slot } from "@/lib/availability"
import { createAppointment, rescheduleAppointment } from "./actions"

function todayIso(): string {
  const d = new Date()
  const off = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return off.toISOString().slice(0, 10)
}

function nextDayIso(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

type Common = {
  services: Service[]
  professionals: Professional[]
  links: ServiceProfessional[]
  primaryColor: string
  onClose: () => void
}

type Props =
  | ({ mode: "create" } & Common)
  | ({
      mode: "reschedule"
      appointmentId: string
      serviceId: string
      professionalId: string
      clientLabel: string
    } & Common)

export function AppointmentDialog(props: Props) {
  const { services, professionals, links, primaryColor, onClose } = props
  const reschedule = props.mode === "reschedule"
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  const [serviceId, setServiceId] = useState(
    reschedule ? props.serviceId : (services[0]?.id ?? "")
  )
  const [professionalId, setProfessionalId] = useState(
    reschedule ? props.professionalId : ""
  )
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [autoAdvanced, setAutoAdvanced] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    setPortalTarget(document.body)
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // profissionais que fazem o serviço; se nenhum vínculo, cai p/ todos ativos
  const eligible = (() => {
    if (!serviceId) return professionals
    const linked = professionals.filter((p) =>
      links.some(
        (l) => l.service_id === serviceId && l.professional_id === p.id
      )
    )
    return linked.length > 0 ? linked : professionals
  })()

  // default do profissional quando o serviço muda (modo criar)
  useEffect(() => {
    if (reschedule) return
    if (!eligible.some((p) => p.id === professionalId)) {
      setProfessionalId(eligible[0]?.id ?? "")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId])

  // carrega slots quando serviço + profissional + data estão definidos
  useEffect(() => {
    if (!serviceId || !professionalId || !date) return
    let cancelled = false
    setLoadingSlots(true)
    setSlots(null)
    setSlot(null)
    const qs = new URLSearchParams({ serviceId, professionalId, date })
    if (reschedule) qs.set("excludeAppointmentId", props.appointmentId)
    fetch(`/api/painel/availability?${qs.toString()}`)
      .then((r) => r.json())
      .then((d: { slots?: Slot[] }) => {
        if (cancelled) return
        const s = d.slots ?? []
        // Se hoje não sobrou horário (dia já avançado), pula p/ o próximo dia — uma vez.
        if (s.length === 0 && date === todayIso() && !autoAdvanced) {
          setAutoAdvanced(true)
          setDate(nextDayIso(date))
          return
        }
        setSlots(s)
      })
      .catch(() => {
        if (!cancelled) setSlots([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, professionalId, date])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!slot) {
      setError("Escolha um horário.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      if (reschedule) {
        const res = await rescheduleAppointment(props.appointmentId, {
          startsAt: slot.startsAt,
          professionalId,
        })
        if (res?.error) setError(res.error)
        else onClose()
      } else {
        const form = new FormData(e.currentTarget)
        const res = await createAppointment({
          serviceId,
          professionalId,
          startsAt: slot.startsAt,
          name: String(form.get("name") ?? ""),
          whatsapp: String(form.get("whatsapp") ?? ""),
        })
        if (res?.error) setError(res.error)
        else onClose()
      }
    } finally {
      setBusy(false)
    }
  }

  if (!portalTarget) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={onClose}
      style={{ "--primary": primaryColor } as React.CSSProperties}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-dialog-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="appointment-dialog-title" className="font-heading text-lg">
              {reschedule ? "Remarcar agendamento" : "Novo agendamento"}
            </h2>
            {reschedule && (
              <p className="mt-1 text-sm text-muted-foreground">{props.clientLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-5">
            {error && (
              <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            {!reschedule && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-wide">Serviço</span>
                <Select
                  value={serviceId}
                  onValueChange={setServiceId}
                >
                  <SelectTrigger aria-label="Serviço">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {s.duration_min} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide">Profissional</span>
              <Select
                value={professionalId}
                onValueChange={setProfessionalId}
              >
                <SelectTrigger aria-label="Profissional">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide">Data</span>
              <input
                type="date"
                value={date}
                min={todayIso()}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 border border-input bg-background px-3 text-sm"
              />
            </label>

            {/* horários */}
            <div>
              <span className="text-xs font-medium tracking-wide">Horário</span>
              {!professionalId ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Escolha um profissional.
                </p>
              ) : loadingSlots ? (
                <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
              ) : slots && slots.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Sem horários livres nesse dia. Tente outra data — pode ser que o
                  profissional não atenda nesse dia ou os horários já tenham
                  passado.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {slots?.map((s) => (
                    <button
                      key={s.startsAt}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`flex items-center justify-center gap-1 border py-2 text-sm transition-colors ${
                        slot?.startsAt === s.startsAt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary"
                      }`}
                    >
                      <Clock className="size-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!reschedule && (
              <>
                <Field label="Nome do cliente" name="name" placeholder="Maria" required />
                <Field
                  label="WhatsApp"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  required
                />
              </>
            )}

          </div>
          <div className="shrink-0 border-t border-border bg-card px-5 py-4">
            <Button type="submit" size="lg" disabled={busy || !slot} className="w-full">
              {busy
                ? "Salvando..."
                : reschedule
                  ? "Confirmar remarcação"
                  : "Criar agendamento"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    portalTarget
  )
}
