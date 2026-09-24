"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServiceOption = { id: string; name: string; duration: number };

export function ManualBooking({ businessId, services }: { businessId: string; services: ServiceOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSlots(nextDate = date, nextServiceId = serviceId) {
    setTime("");
    setSlots([]);
    if (!nextDate || !nextServiceId) return;
    try {
      const params = new URLSearchParams({ date: nextDate, serviceId: nextServiceId, businessId });
      const response = await fetch(`/api/business/slots?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os horários");
      setSlots(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar os horários");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!time) { toast.error("Escolha um horário disponível"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, serviceId, localDate: date, localTime: time,
          customerName: name, customerEmail: email, customerPhone: phone,
          source: "DASHBOARD",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? "Não foi possível agendar");
        if (response.status === 409) await loadSlots();
        return;
      }
      toast.success("Agendamento criado");
      setOpen(false);
      setTime(""); setName(""); setEmail(""); setPhone("");
      router.refresh();
    } catch {
      toast.error("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left text-sm text-[var(--text-primary)]">
        <CalendarPlus size={18} className="text-[var(--mint)]" />
        <span className="flex-1">Criar agendamento pelo painel</span>
        <ChevronDown size={16} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <form onSubmit={submit} className="grid gap-4 border-t border-[var(--border-subtle)] p-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="manual-service">Serviço</Label><select id="manual-service" required value={serviceId} onChange={(event) => { setServiceId(event.target.value); void loadSlots(date, event.target.value); }} className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]">{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration} min</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="manual-date">Data</Label><Input id="manual-date" required type="date" value={date} onChange={(event) => { setDate(event.target.value); void loadSlots(event.target.value); }} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="manual-time">Horário disponível</Label><select id="manual-time" required value={time} onChange={(event) => setTime(event.target.value)} className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)]"><option value="">{date ? "Selecione um horário" : "Escolha uma data primeiro"}</option>{slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select>{date && slots.length === 0 && <p className="text-xs text-[var(--text-tertiary)]">Nenhum horário livre para este dia.</p>}</div>
          <div className="space-y-2"><Label htmlFor="manual-name">Nome do cliente</Label><Input id="manual-name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="manual-email">E-mail do cliente</Label><Input id="manual-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="manual-phone">Telefone</Label><Input id="manual-phone" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
          <div className="flex items-end"><Button type="submit" disabled={loading || !time || !services.length} className="w-full bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)]">{loading ? "Salvando..." : "Criar agendamento"}</Button></div>
        </form>
      )}
    </section>
  );
}
