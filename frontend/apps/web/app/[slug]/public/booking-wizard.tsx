"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  MessageCircle,
  CalendarDays,
  User,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field, formatPrice } from "@/components/ui-form"
import type { Professional, Service } from "@/lib/supabase/types"
import type { Slot } from "@/lib/availability"

type Link = { service_id: string; professional_id: string }

const STEPS = ["Serviço", "Profissional", "Horário", "Dados"]

function todayIso(): string {
  const d = new Date()
  const off = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return off.toISOString().slice(0, 10)
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function periodOf(label: string): "Manhã" | "Tarde" | "Noite" {
  const h = parseInt(label.slice(0, 2), 10)
  return h < 12 ? "Manhã" : h < 18 ? "Tarde" : "Noite"
}

export function BookingWizard({
  slug,
  services,
  professionals,
  links,
  brand,
}: {
  slug: string
  services: Service[]
  professionals: Professional[]
  links: Link[]
  brand: string
}) {
  const [service, setService] = useState<Service | null>(null)
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  // identificação + OTP
  const [phase, setPhase] = useState<"form" | "otp">("form")
  const [contact, setContact] = useState<{ name: string; whatsapp: string } | null>(
    null
  )
  const [devCode, setDevCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const eligiblePros = service
    ? professionals.filter((p) =>
        links.some(
          (l) => l.service_id === service.id && l.professional_id === p.id
        )
      )
    : []

  async function loadSlots(d: string, pro: Professional, svc: Service) {
    setLoadingSlots(true)
    setSlots(null)
    setSlot(null)
    setError(null)
    try {
      const res = await fetch(
        `/api/public/${slug}/availability?serviceId=${svc.id}&professionalId=${pro.id}&date=${d}`
      )
      const data = (await res.json()) as { slots?: Slot[] }
      setSlots(data.slots ?? [])
    } catch {
      setError("Não foi possível carregar os horários.")
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  // Passo 4a — envia o OTP e vai para o passo de código
  async function sendOtp(name: string, whatsapp: string) {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/public/${slug}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
      })
      const data = (await res.json()) as { ok?: boolean; devCode?: string; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Não foi possível enviar o código.")
        return
      }
      setContact({ name, whatsapp })
      setDevCode(data.devCode ?? null)
      setPhase("otp")
    } catch {
      setError("Falha de conexão. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  // Passo 4b — verifica o código e, se ok, agenda
  async function verifyAndBook(code: string) {
    if (!service || !professional || !slot || !contact) return
    setError(null)
    setBusy(true)
    try {
      const vr = await fetch(`/api/public/${slug}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: contact.whatsapp, code }),
      })
      const vdata = (await vr.json()) as { ok?: boolean; error?: string }
      if (!vr.ok || !vdata.ok) {
        setError(vdata.error ?? "Código inválido.")
        return
      }

      const br = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          professionalId: professional.id,
          startsAt: slot.startsAt,
          name: contact.name,
          whatsapp: contact.whatsapp,
        }),
      })
      const bdata = (await br.json()) as { ok?: boolean; error?: string }
      if (!br.ok || !bdata.ok) {
        setError(bdata.error ?? "Não foi possível agendar.")
        if (br.status === 409) {
          void loadSlots(date, professional, service)
          setSlot(null)
          setPhase("form")
        }
        return
      }
      setDone(true)
    } catch {
      setError("Falha de conexão. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  // ---- Confirmação --------------------------------------------------------
  if (done) {
    return (
      <div className="border border-border bg-card p-8 text-center">
        <span
          className="mx-auto flex size-14 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: brand }}
        >
          <Check className="size-7" />
        </span>
        <h2 className="mt-4 font-heading text-xl">Agendamento confirmado!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Você vai receber a confirmação e os lembretes no WhatsApp.
        </p>
        <dl className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-left text-sm">
          <SummaryRow label="Serviço" value={service?.name ?? ""} />
          <SummaryRow label="Profissional" value={professional?.name ?? ""} />
          <SummaryRow
            label="Quando"
            value={
              slot
                ? new Date(slot.startsAt).toLocaleString("pt-BR", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })
                : ""
            }
            capitalize
          />
          <SummaryRow label="Valor" value={formatPrice(service?.price_cents ?? 0)} />
        </dl>
      </div>
    )
  }

  const currentStep = !service ? 0 : !professional ? 1 : !slot ? 2 : 3

  const summary = service && professional && slot
    ? `${service.name} com ${professional.name} · ${new Date(
        slot.startsAt
      ).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
    : ""

  return (
    <div className="flex flex-col gap-4">
      <Steps current={currentStep} brand={brand} />

      {/* Passo 1 — serviço */}
      {currentStep === 0 && (
        <Panel title="Escolha o serviço">
          <ul className="flex flex-col gap-2">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setService(s)}
                  className="group flex w-full items-center justify-between gap-3 border border-border bg-card p-4 text-left transition-colors hover:border-primary"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{s.name}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {s.duration_min} min
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold">{formatPrice(s.price_cents)}</span>
                    <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Passo 2 — profissional */}
      {currentStep === 1 && service && (
        <Panel title="Escolha o profissional" onBack={() => setService(null)}>
          <Recap service={service} />
          {eligiblePros.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum profissional disponível para este serviço.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {eligiblePros.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      setProfessional(p)
                      void loadSlots(date, p, service)
                    }}
                    className="group flex w-full items-center gap-3 border border-border bg-card p-3 text-left transition-colors hover:border-primary"
                  >
                    <Avatar name={p.name} brand={brand} />
                    <span className="flex-1 font-medium">{p.name}</span>
                    <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* Passo 3 — data + horário */}
      {currentStep === 2 && service && professional && (
        <Panel
          title="Escolha o horário"
          onBack={() => {
            setProfessional(null)
            setSlots(null)
          }}
        >
          <Recap service={service} professional={professional} />
          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium tracking-wide">Data</span>
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => {
                setDate(e.target.value)
                void loadSlots(e.target.value, professional, service)
              }}
              className="h-10 border border-input bg-background px-3 text-sm"
            />
          </label>

          {loadingSlots && (
            <p className="text-sm text-muted-foreground">Carregando horários...</p>
          )}

          {!loadingSlots && slots && slots.length === 0 && (
            <NoSlots slug={slug} serviceId={service.id} />
          )}

          {!loadingSlots && slots && slots.length > 0 && (
            <div className="flex flex-col gap-4">
              {(["Manhã", "Tarde", "Noite"] as const).map((period) => {
                const list = slots.filter((s) => periodOf(s.label) === period)
                if (list.length === 0) return null
                return (
                  <div key={period}>
                    <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {period}
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {list.map((s) => (
                        <button
                          key={s.startsAt}
                          onClick={() => {
                            setSlot(s)
                            setPhase("form")
                            setError(null)
                          }}
                          className="flex items-center justify-center gap-1 border border-border bg-card py-2 text-sm transition-colors hover:border-primary"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      )}

      {/* Passo 4b — código OTP */}
      {currentStep === 3 && phase === "otp" && contact && (
        <Panel title="Confirme seu WhatsApp" onBack={() => setPhase("form")}>
          <SummaryBar text={summary} />
          <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="size-4" />
            Enviamos um código para {contact.whatsapp}.
          </p>
          {devCode && (
            <p className="mb-4 border border-dashed border-border bg-muted/40 px-3 py-2 text-sm">
              Modo teste — seu código é <strong>{devCode}</strong>.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const code = String(
                new FormData(e.currentTarget).get("code") ?? ""
              ).trim()
              void verifyAndBook(code)
            }}
            className="flex flex-col gap-4"
          >
            {error && <ErrorBox message={error} />}
            <Field
              label="Código de 6 dígitos"
              name="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
            <Button
              type="submit"
              size="lg"
              disabled={busy}
              style={{ backgroundColor: brand }}
              className="hover:opacity-90"
            >
              {busy ? "Confirmando..." : "Confirmar agendamento"}
            </Button>
            <button
              type="button"
              onClick={() => void sendOtp(contact.name, contact.whatsapp)}
              disabled={busy}
              className="text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-50"
            >
              Reenviar código
            </button>
          </form>
        </Panel>
      )}

      {/* Passo 4a — identificação */}
      {currentStep === 3 && phase === "form" && (
        <Panel title="Seus dados" onBack={() => setSlot(null)}>
          <SummaryBar text={summary} />
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const name = String(form.get("name") ?? "").trim()
              const whatsapp = String(form.get("whatsapp") ?? "").trim()
              void sendOtp(name, whatsapp)
            }}
            className="flex flex-col gap-4"
          >
            {error && <ErrorBox message={error} />}
            <Field label="Seu nome" name="name" placeholder="Maria" required />
            <Field
              label="WhatsApp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              hint="Enviaremos um código para confirmar o número."
              required
            />
            <Button
              type="submit"
              size="lg"
              disabled={busy}
              style={{ backgroundColor: brand }}
              className="hover:opacity-90"
            >
              {busy ? "Enviando código..." : "Continuar"}
            </Button>
          </form>
        </Panel>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Subcomponentes
// -----------------------------------------------------------------------------

function Steps({ current, brand }: { current: number; brand: string }) {
  return (
    <ol className="flex items-center gap-1.5">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo"
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  state === "todo" ? "bg-muted text-muted-foreground" : "text-white"
                }`}
                style={state === "todo" ? undefined : { backgroundColor: brand }}
              >
                {state === "done" ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`mx-1 h-px flex-1 ${i < current ? "" : "bg-border"}`}
                  style={i < current ? { backgroundColor: brand } : undefined}
                />
              )}
            </div>
            <span
              className={`text-center text-[10px] uppercase tracking-wide ${
                state === "todo" ? "text-muted-foreground" : "font-medium text-foreground"
              }`}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Avatar({ name, brand }: { name: string; brand: string }) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: brand }}
    >
      {initials(name)}
    </span>
  )
}

function Recap({
  service,
  professional,
}: {
  service: Service
  professional?: Professional
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-xs">
      <span className="inline-flex items-center gap-1 border border-border bg-muted/40 px-2 py-1">
        <CalendarDays className="size-3" />
        {service.name} · {formatPrice(service.price_cents)}
      </span>
      {professional && (
        <span className="inline-flex items-center gap-1 border border-border bg-muted/40 px-2 py-1">
          <User className="size-3" />
          {professional.name}
        </span>
      )}
    </div>
  )
}

function SummaryBar({ text }: { text: string }) {
  if (!text) return null
  return (
    <p className="mb-4 border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      {text}
    </p>
  )
}

function SummaryRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium ${capitalize ? "capitalize" : ""}`}>
        {value}
      </dd>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

function Panel({
  title,
  onBack,
  children,
}: {
  title: string
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-border bg-background p-5">
      <div className="mb-4 flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <h2 className="font-heading text-lg">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function NoSlots({ slug, serviceId }: { slug: string; serviceId: string }) {
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSubmitting(true)
    try {
      await fetch(`/api/public/${slug}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          whatsapp: form.get("whatsapp"),
          serviceId,
        }),
      })
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <p className="border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Prontinho! Assim que abrir um horário a gente te avisa.
      </p>
    )
  }

  return (
    <div className="border border-dashed border-border p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Sem horários nesse dia. Deixe seu WhatsApp que avisamos quando abrir vaga.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Seu nome" name="name" placeholder="Maria" required />
        <Field
          label="WhatsApp"
          name="whatsapp"
          type="tel"
          placeholder="(11) 99999-9999"
          required
        />
        <Button type="submit" variant="outline" disabled={submitting}>
          {submitting ? "Enviando..." : "Quero ser avisado"}
        </Button>
      </form>
    </div>
  )
}
