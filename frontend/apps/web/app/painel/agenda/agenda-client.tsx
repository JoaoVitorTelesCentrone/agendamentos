"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Plus,
  CalendarClock,
  Check,
  Users,
  Scissors,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import type {
  ApptStatus,
  Professional,
  Service,
  ServiceProfessional,
} from "@/lib/supabase/types"
import { formatPrice } from "@/components/ui-form"
import type { AppointmentRow } from "./page"
import { updateAppointmentStatus } from "./actions"
import { AppointmentDialog } from "./appointment-dialog"
import { WeekCalendar } from "./week-calendar"

const STATUS_LABEL: Record<ApptStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  no_show: "Faltou",
}

const STATUS_STYLE: Record<ApptStatus, string> = {
  agendado: "bg-muted text-foreground",
  confirmado: "bg-primary/10 text-primary",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-muted text-muted-foreground line-through",
  no_show: "bg-destructive/10 text-destructive",
}

type CalendarView = "day" | "week" | "month"

const TIME_ZONE = "America/Sao_Paulo"

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  return x
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  return x
}
function startOfMonth(d: Date): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function addMonths(d: Date, n: number): Date {
  const x = startOfDay(d)
  x.setDate(1)
  x.setMonth(x.getMonth() + n)
  return x
}
function formatDate(d: Date, options: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString("pt-BR", { ...options, timeZone: TIME_ZONE })
}
function getRangeLabel(date: Date, view: CalendarView): string {
  if (view === "day") {
    return formatDate(date, {
      weekday: "long",
      day: "2-digit",
      month: "long",
    })
  }
  if (view === "month") {
    return formatDate(date, {
      month: "long",
      year: "numeric",
    })
  }
  const weekStart = startOfWeek(date)
  const weekEnd = addDays(weekStart, 6)
  return `${formatDate(weekStart, {
    day: "2-digit",
    month: "short",
  })} - ${formatDate(weekEnd, { day: "2-digit", month: "short" })}`
}
function shiftDate(date: Date, view: CalendarView, direction: number): Date {
  if (view === "day") return addDays(date, direction)
  if (view === "month") return addMonths(date, direction)
  return addDays(date, direction * 7)
}

export function AgendaClient({
  appointments,
  services,
  professionals,
  links,
}: {
  appointments: AppointmentRow[]
  services: Service[]
  professionals: Professional[]
  links: ServiceProfessional[]
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRow | null>(
    null
  )
  const [selected, setSelected] = useState<AppointmentRow | null>(null)
  const [view, setView] = useState<CalendarView>("week")
  const [visibleDate, setVisibleDate] = useState(() => startOfDay(new Date()))

  const hasPro = professionals.length > 0
  const hasService = services.length > 0
  const canCreate = hasService && hasPro
  const needsSetup = !canCreate

  const rangeLabel = getRangeLabel(visibleDate, view)

  return (
    <div>
      {needsSetup ? (
        <OnboardingSetup hasPro={hasPro} hasService={hasService} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex w-fit rounded-md border border-border bg-card p-1">
                {(["day", "week", "month"] as CalendarView[]).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={view === item ? "default" : "ghost"}
                    size="xs"
                    onClick={() => setView(item)}
                    className="min-w-16"
                  >
                    {item === "day" ? "Dia" : item === "week" ? "Semana" : "Mes"}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleDate(startOfDay(new Date()))}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Periodo anterior"
                  onClick={() => setVisibleDate((date) => shiftDate(date, view, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Proximo periodo"
                  onClick={() => setVisibleDate((date) => shiftDate(date, view, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <span className="text-sm font-medium capitalize text-muted-foreground">
                {rangeLabel}
              </span>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              Novo agendamento
            </Button>
          </div>

          <WeekCalendar
            view={view}
            date={visibleDate}
            appointments={appointments}
            onSelect={(a) => setSelected(a)}
          />
        </>
      )}

      {showCreate && (
        <AppointmentDialog
          mode="create"
          services={services}
          professionals={professionals}
          links={links}
          onClose={() => setShowCreate(false)}
        />
      )}

      {rescheduleTarget && (
        <AppointmentDialog
          mode="reschedule"
          appointmentId={rescheduleTarget.id}
          serviceId={rescheduleTarget.service_id}
          professionalId={rescheduleTarget.professional_id}
          clientLabel={`${rescheduleTarget.clients?.name ?? "Cliente"} · ${
            rescheduleTarget.services?.name ?? ""
          }`}
          services={services}
          professionals={professionals}
          links={links}
          onClose={() => setRescheduleTarget(null)}
        />
      )}

      {selected && (
        <EventDetail
          appt={selected}
          onClose={() => setSelected(null)}
          onReschedule={() => {
            setRescheduleTarget(selected)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

// Popover de detalhes do agendamento (clique no bloco do calendário).
function EventDetail({
  appt,
  onClose,
  onReschedule,
}: {
  appt: AppointmentRow
  onClose: () => void
  onReschedule: () => void
}) {
  const [pending, startTransition] = useTransition()
  const done = appt.status === "concluido" || appt.status === "cancelado"

  const start = new Date(appt.starts_at)
  const end = new Date(appt.ends_at)
  const dateLabel = formatDate(start, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
  const timeLabel = `${start.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })} - ${end.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })}`

  function setStatus(status: ApptStatus) {
    startTransition(() =>
      updateAppointmentStatus(appt.id, status).then(() => onClose())
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border border-border bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg">
              {appt.clients?.name ?? "Cliente"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {appt.clients?.whatsapp}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        <dl className="flex flex-col gap-2 border-y border-border py-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Quando</dt>
            <dd className="text-right capitalize">
              {dateLabel}
              <br />
              {timeLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Serviço</dt>
            <dd className="text-right">
              {appt.services?.name} · {formatPrice(appt.price_cents)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Profissional</dt>
            <dd className="text-right">{appt.professionals?.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span className={`px-2 py-0.5 text-xs ${STATUS_STYLE[appt.status]}`}>
                {STATUS_LABEL[appt.status]}
              </span>
            </dd>
          </div>
        </dl>

        {!done && (
          <div className="mt-4 flex flex-wrap gap-2">
            {appt.status === "agendado" && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setStatus("confirmado")}
              >
                Confirmar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onReschedule}>
              <CalendarClock className="size-3.5" data-icon="inline-start" />
              Remarcar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setStatus("concluido")}
            >
              Concluir
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setStatus("no_show")}
            >
              Faltou
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => setStatus("cancelado")}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Estado inicial: sem profissional/serviço não dá pra agendar. Em vez de um
// botão desabilitado, guia o dono a preparar a agenda.
function OnboardingSetup({
  hasPro,
  hasService,
}: {
  hasPro: boolean
  hasService: boolean
}) {
  return (
    <div className="border border-dashed border-border p-8">
      <div className="mx-auto max-w-md text-center">
        <CalendarClock className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-4 font-heading text-lg tracking-tight">
          Vamos preparar sua agenda
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre pelo menos um profissional e um serviço para começar a
          agendar.
        </p>
        <div className="mt-6 flex flex-col gap-3 text-left">
          <SetupStep
            done={hasPro}
            icon={Users}
            label="Cadastrar profissional"
            href="/painel/profissionais"
          />
          <SetupStep
            done={hasService}
            icon={Scissors}
            label="Cadastrar serviço"
            href="/painel/servicos"
          />
        </div>
      </div>
    </div>
  )
}

function SetupStep({
  done,
  icon: Icon,
  label,
  href,
}: {
  done: boolean
  icon: typeof Users
  label: string
  href: string
}) {
  return (
    <div className="flex items-center gap-3 border border-border bg-card p-3">
      <span className={done ? "text-green-600" : "text-muted-foreground"}>
        {done ? <Check className="size-5" /> : <Icon className="size-5" />}
      </span>
      <span
        className={`flex-1 text-sm ${
          done ? "text-muted-foreground line-through" : "font-medium"
        }`}
      >
        {label}
      </span>
      <Button asChild size="sm" variant={done ? "outline" : "default"}>
        <Link href={href}>{done ? "Editar" : "Cadastrar"}</Link>
      </Button>
    </div>
  )
}
