"use client"

import { CalendarClock, Clock, Scissors, UserRound } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import type { ApptStatus } from "@/lib/supabase/types"
import type { AppointmentRow } from "./page"

type CalendarView = "day" | "week" | "month"

const TIME_ZONE = "America/Sao_Paulo"

const STATUS_LABEL: Record<ApptStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  concluido: "Concluido",
  cancelado: "Cancelado",
  no_show: "Faltou",
}

const STATUS_STYLE: Record<ApptStatus, string> = {
  agendado: "border-border bg-muted text-foreground",
  confirmado: "border-primary/30 bg-primary/10 text-primary",
  concluido: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  cancelado: "border-border bg-muted/60 text-muted-foreground line-through",
  no_show: "border-destructive/35 bg-destructive/10 text-destructive",
}

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

function dateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

function monthKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(d)
}

function sameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

function formatDate(d: Date, options: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString("pt-BR", { ...options, timeZone: TIME_ZONE })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })
}

function getAppointmentsForDay(appointments: AppointmentRow[], day: Date) {
  return appointments
    .filter((appt) => sameDay(new Date(appt.starts_at), day))
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
}

function getDaysForView(date: Date, view: CalendarView): Date[] {
  if (view === "day") return [startOfDay(date)]
  if (view === "week") {
    const start = startOfWeek(date)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }

  const monthStart = startOfMonth(date)
  const gridStart = startOfWeek(monthStart)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function WeekCalendar({
  view,
  date,
  appointments,
  onSelect,
}: {
  view: CalendarView
  date: Date
  appointments: AppointmentRow[]
  onSelect: (appt: AppointmentRow) => void
}) {
  if (view === "day") {
    return (
      <DayCalendar
        day={date}
        appointments={appointments}
        onSelect={onSelect}
      />
    )
  }

  if (view === "month") {
    return (
      <MonthCalendar
        date={date}
        appointments={appointments}
        onSelect={onSelect}
      />
    )
  }

  return (
    <WeekGrid
      days={getDaysForView(date, "week")}
      appointments={appointments}
      onSelect={onSelect}
    />
  )
}

function WeekGrid({
  days,
  appointments,
  onSelect,
}: {
  days: Date[]
  appointments: AppointmentRow[]
  onSelect: (appt: AppointmentRow) => void
}) {
  const today = new Date()

  return (
    <Card className="rounded-lg border border-border bg-card p-0 shadow-sm">
      <CardContent className="p-0">
        <div className="grid gap-px overflow-hidden rounded-lg bg-border md:grid-cols-2 xl:grid-cols-7">
          {days.map((day) => {
            const dayAppts = getAppointmentsForDay(appointments, day)
            const isToday = sameDay(day, today)

            return (
              <DayColumn
                key={day.toISOString()}
                day={day}
                appointments={dayAppts}
                isToday={isToday}
                onSelect={onSelect}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function DayColumn({
  day,
  appointments,
  isToday,
  onSelect,
}: {
  day: Date
  appointments: AppointmentRow[]
  isToday: boolean
  onSelect: (appt: AppointmentRow) => void
}) {
  return (
    <Card className="min-w-0 rounded-none border-0 bg-card p-0 shadow-none ring-0">
      <CardHeader
        className={`border-b border-border px-4 py-3 ${
          isToday ? "bg-primary/10" : "bg-white/[0.03]"
        }`}
      >
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {formatDate(day, { weekday: "short" }).replace(".", "")}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`font-heading text-2xl leading-none ${
              isToday ? "text-primary" : "text-foreground"
            }`}
          >
            {formatDate(day, { day: "numeric" })}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {appointments.length} ag.
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-[11rem] flex-col gap-2 p-3">
        {appointments.length ? (
          appointments.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} onSelect={onSelect} />
          ))
        ) : (
          <EmptyDay />
        )}
      </CardContent>
    </Card>
  )
}

function DayCalendar({
  day,
  appointments,
  onSelect,
}: {
  day: Date
  appointments: AppointmentRow[]
  onSelect: (appt: AppointmentRow) => void
}) {
  const dayAppts = getAppointmentsForDay(appointments, day)
  const isToday = sameDay(day, new Date())

  return (
    <Card className="rounded-lg border border-border bg-card p-0 shadow-sm">
      <CardHeader
        className={`border-b border-border px-5 py-4 ${
          isToday ? "bg-primary/10" : "bg-white/[0.03]"
        }`}
      >
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {formatDate(day, { weekday: "long" })}
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="font-heading text-3xl leading-none text-foreground">
            {formatDate(day, { day: "2-digit", month: "long" })}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {dayAppts.length} agendamentos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {dayAppts.length ? (
          dayAppts.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} onSelect={onSelect} dense={false} />
          ))
        ) : (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyDay />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MonthCalendar({
  date,
  appointments,
  onSelect,
}: {
  date: Date
  appointments: AppointmentRow[]
  onSelect: (appt: AppointmentRow) => void
}) {
  const days = getDaysForView(date, "month")
  const today = new Date()
  const visibleMonth = monthKey(date)

  return (
    <Card className="rounded-lg border border-border bg-card p-0 shadow-sm">
      <CardContent className="overflow-x-auto p-0">
        <div className="grid min-w-[720px] grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
          {days.map((day) => {
            const dayAppts = getAppointmentsForDay(appointments, day)
            const isToday = sameDay(day, today)
            const muted = monthKey(day) !== visibleMonth

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => dayAppts[0] && onSelect(dayAppts[0])}
                className={`min-h-28 min-w-0 bg-card p-2 text-left transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  muted ? "opacity-45" : ""
                } ${isToday ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {formatDate(day, { day: "numeric" })}
                  </span>
                  {dayAppts.length > 0 && (
                    <Badge variant="secondary" className="text-[9px]">
                      {dayAppts.length}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {dayAppts.slice(0, 3).map((appt) => (
                    <div
                      key={appt.id}
                      className={`truncate rounded-sm border px-1.5 py-1 text-[10px] leading-tight ${STATUS_STYLE[appt.status]}`}
                    >
                      {formatTime(appt.starts_at)} {appt.clients?.name ?? "Cliente"}
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayAppts.length - 3} mais
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function AppointmentCard({
  appt,
  onSelect,
  dense = true,
}: {
  appt: AppointmentRow
  onSelect: (appt: AppointmentRow) => void
  dense?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(appt)}
      className="group w-full min-w-0 rounded-md border border-border bg-background p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{formatTime(appt.starts_at)}</span>
          </span>
          <Badge
            variant="outline"
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLE[appt.status]}`}
          >
            {STATUS_LABEL[appt.status]}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <UserRound className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate font-medium text-foreground">
              {appt.clients?.name ?? "Cliente"}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Scissors className="size-3.5 shrink-0" />
            <span className={dense ? "min-w-0 truncate" : "min-w-0 line-clamp-2"}>
              {appt.services?.name ?? "Servico"} - {appt.professionals?.name ?? "Profissional"}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

function EmptyDay() {
  return (
    <div className="flex min-h-28 flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      <CalendarClock className="mb-2 size-5" />
      Sem horarios
    </div>
  )
}