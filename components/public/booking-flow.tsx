"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, DollarSign, Check, ArrowRight, ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
}

interface Business {
  id: string;
  slug: string;
  name: string;
  timezone: string;
}

type Step = "service" | "datetime" | "details" | "success";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function BookingFlow({
  business,
  services,
  initialServiceId,
}: {
  business: Business;
  services: Service[];
  initialServiceId?: string;
}) {
  const [step, setStep] = useState<Step>(initialServiceId ? "datetime" : "service");
  const [selectedService, setSelectedService] = useState<Service | null>(
    services.find((s) => s.id === initialServiceId) ?? null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<{ id: string; date: string } | null>(null);

  async function fetchSlots(date: Date, service: Service) {
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const res = await fetch(
        `/api/business/slots?date=${dateStr}&serviceId=${service.id}&businessId=${business.id}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "slots");
      setSlots(data);
    } catch {
      toast.error("Erro ao buscar horários");
    } finally {
      setSlotsLoading(false);
    }
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    if (selectedService) fetchSlots(date, selectedService);
  }

  async function handleConfirm() {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    if (!form.customerName.trim() || !form.customerEmail.trim()) {
      toast.error("Preencha nome e email");
      return;
    }

    setLoading(true);
    try {
      const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      const [h, m] = selectedSlot.split(":").map(Number);
      const dateTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, m);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: dateTime.toISOString(),
          localDate: dateKey,
          localTime: selectedSlot,
          serviceId: selectedService.id,
          businessId: business.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Erro ao criar agendamento");
        if (res.status === 409) {
          await fetchSlots(selectedDate, selectedService);
        }
        return;
      }

      const data = await res.json();
      setAppointment(data);
      setStep("success");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { year, month } = calendarMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const calendarCells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1)),
  ];

  const stepLabels = ["Serviço", "Data e hora", "Seus dados"];
  const stepKeys: Step[] = ["service", "datetime", "details"];
  const currentStepIdx = stepKeys.indexOf(step);

  if (step === "success" && appointment && selectedService && selectedDate && selectedSlot) {
    const [h, m] = selectedSlot.split(":").map(Number);
    const apptDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, m);
    const dateStr = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    }).format(apptDate);
    const confirmedStart = new Date(appointment.date);
    const calendarDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const gcUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedService.name + " — " + business.name)}&dates=${calendarDate(confirmedStart)}/${calendarDate(new Date(confirmedStart.getTime() + selectedService.duration * 60000))}`;

    return (
      <div className="text-center animate-fade-up">
        <div className="w-14 h-14 rounded-full bg-[var(--mint-dim)] flex items-center justify-center mx-auto mb-6">
          <Check size={24} className="text-[var(--mint)]" />
        </div>
        <h2 className="text-2xl text-[var(--text-primary)] mb-2">Agendamento confirmado!</h2>
        <p className="text-[var(--text-secondary)] text-sm font-light mb-8">
          Seu horário foi registrado. Confira os detalhes abaixo.
        </p>
        <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-left mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Serviço</span>
            <span className="text-[var(--text-primary)]">{selectedService.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Data</span>
            <span className="text-[var(--text-primary)] capitalize">{dateStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Horário</span>
            <span className="text-[var(--text-primary)]">{selectedSlot}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-tertiary)]">Valor</span>
            <span className="text-[var(--text-primary)]">R$ {selectedService.price.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <a href={gcUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" className="w-full border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] gap-2">
              <ExternalLink size={14} />
              Adicionar ao Google Calendar
            </Button>
          </a>
          <a href={`/${business.slug}`}>
            <Button variant="ghost" className="w-full text-[var(--text-tertiary)] text-sm">
              Fazer outro agendamento
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stepper */}
      {step !== "success" && (
        <div className="flex items-center gap-0 mb-10">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors",
                    i < currentStepIdx
                      ? "bg-[var(--mint)] text-black"
                      : i === currentStepIdx
                      ? "border-2 border-[var(--mint)] text-[var(--mint)]"
                      : "border border-[var(--border-subtle)] text-[var(--text-tertiary)]"
                  )}
                >
                  {i < currentStepIdx ? <Check size={12} /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    i === currentStepIdx ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className="flex-1 h-px bg-[var(--border-subtle)] mx-3" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Service */}
      {step === "service" && (
        <div className="space-y-3 animate-fade-up">
          <h2 className="text-xl text-[var(--text-primary)] mb-4">Qual serviço?</h2>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedService(s);
                setStep("datetime");
              }}
              className={cn(
                "w-full text-left p-5 rounded-[var(--radius)] border transition-all hover:scale-[1.01]",
                selectedService?.id === s.id
                  ? "border-[var(--mint)] bg-[var(--mint-dim)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)]"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--text-primary)] font-medium">{s.name}</p>
                  {s.description && (
                    <p className="text-[var(--text-tertiary)] text-sm mt-0.5">{s.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1"><Clock size={12} />{s.duration} min</span>
                    <span className="flex items-center gap-1"><DollarSign size={12} />R$ {s.price.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-tertiary)]" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Date + Time */}
      {step === "datetime" && selectedService && (
        <div className="animate-fade-up">
          <button
            onClick={() => setStep("service")}
            className="flex items-center gap-1 text-[var(--text-tertiary)] text-sm mb-6 hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h2 className="text-xl text-[var(--text-primary)] mb-1">Escolha a data</h2>
          <p className="text-[var(--text-secondary)] text-sm font-light mb-6">
            {selectedService.name} · {selectedService.duration} min
          </p>

          {/* Calendar */}
          <div className="p-4 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const d = new Date(year, month - 1);
                  setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
                }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] px-2 py-1 rounded transition-colors"
              >
                ‹
              </button>
              <span className="text-[var(--text-primary)] text-sm capitalize">
                {MONTHS[month]} {year}
              </span>
              <button
                onClick={() => {
                  const d = new Date(year, month + 1);
                  setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
                }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] px-2 py-1 rounded transition-colors"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[var(--text-tertiary)] text-xs py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((date, i) => {
                if (!date) return <div key={i} />;
                const isPast = date < today;
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                return (
                  <button
                    key={i}
                    disabled={isPast}
                    onClick={() => handleSelectDate(date)}
                    className={cn(
                      "w-full aspect-square rounded-[var(--radius-sm)] text-sm transition-colors",
                      isPast
                        ? "text-[var(--text-tertiary)] cursor-not-allowed"
                        : isSelected
                        ? "bg-[var(--mint)] text-black font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots */}
          {selectedDate && (
            <div>
              <h3 className="text-[var(--text-secondary)] text-sm mb-3">
                Horários disponíveis em {selectedDate.toLocaleDateString("pt-BR")}
              </h3>
              {slotsLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] animate-pulse" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-[var(--text-tertiary)] text-sm">
                  Nenhum horário disponível neste dia.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "py-2 px-3 rounded-[var(--radius-sm)] text-sm border transition-colors",
                        selectedSlot === slot
                          ? "bg-[var(--mint)] text-black border-[var(--mint)] font-medium"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedDate && selectedSlot && (
            <div className="mt-6">
              <Button
                onClick={() => setStep("details")}
                className="w-full bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium gap-2"
              >
                Continuar
                <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && selectedService && selectedDate && selectedSlot && (
        <div className="animate-fade-up">
          <button
            onClick={() => setStep("datetime")}
            className="flex items-center gap-1 text-[var(--text-tertiary)] text-sm mb-6 hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h2 className="text-xl text-[var(--text-primary)] mb-1">Seus dados</h2>
          <p className="text-[var(--text-secondary)] text-sm font-light mb-6">
            {selectedService.name} · {selectedDate.toLocaleDateString("pt-BR")} às {selectedSlot}
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Nome *</Label>
              <Input
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                placeholder="Seu nome completo"
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Email *</Label>
              <Input
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                placeholder="seu@email.com"
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Telefone / WhatsApp</Label>
              <Input
                value={form.customerPhone}
                onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-secondary)] text-sm">Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Alguma informação adicional..."
                className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none"
                rows={2}
              />
            </div>

            <div className="pt-2 p-4 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Serviço</span>
                <span className="text-[var(--text-secondary)]">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Data e hora</span>
                <span className="text-[var(--text-secondary)]">
                  {selectedDate.toLocaleDateString("pt-BR")} às {selectedSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Valor</span>
                <span className="text-[var(--mint)]">
                  R$ {selectedService.price.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium h-11"
            >
              {loading ? "Confirmando..." : "Confirmar agendamento"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
