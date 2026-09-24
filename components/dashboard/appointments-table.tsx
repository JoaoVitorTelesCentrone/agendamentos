"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface Appointment {
  id: string;
  customerName: string;
  customerEmail: string;
  date: Date | string;
  status: string;
  service: { name: string; price: unknown };
}

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  NO_SHOW: "Não compareceu",
};

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CONFIRMED: "bg-[var(--mint-dim)] text-[var(--mint)] border-[var(--mint)]/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  NO_SHOW: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function AppointmentsTable({ appointments: initial }: { appointments: Appointment[] }) {
  const [appointments, setAppointments] = useState(initial);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      toast.error("Erro ao atualizar agendamento");
      return;
    }

    const updated = await res.json();
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: updated.status } : a)));
    toast.success("Status atualizado");
  }

  if (appointments.length === 0) {
    return (
      <div className="p-8 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center">
        <p className="text-[var(--text-tertiary)] font-light">Nenhum agendamento encontrado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {["Cliente", "Serviço", "Data/Hora", "Status", "Ações"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[var(--text-tertiary)] text-xs font-normal"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr
              key={a.id}
              className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <td className="px-4 py-3">
                <p className="text-[var(--text-primary)] text-sm">{a.customerName}</p>
                <p className="text-[var(--text-tertiary)] text-xs">{a.customerEmail}</p>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)] text-sm">{a.service.name}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)] text-sm">{formatDate(a.date)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusColor[a.status] ?? ""}`}
                >
                  {statusLabel[a.status] ?? a.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {a.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(a.id, "CONFIRMED")}
                        className="h-7 w-7 p-0 text-[var(--mint)] hover:bg-[var(--mint-dim)]"
                        title="Confirmar"
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(a.id, "CANCELLED")}
                        className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                        title="Cancelar"
                      >
                        <X size={14} />
                      </Button>
                    </>
                  )}
                  {a.status === "CONFIRMED" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, "COMPLETED")} className="h-7 px-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">Concluir</Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, "NO_SHOW")} className="h-7 px-2 text-xs text-orange-400 hover:text-orange-300">Não compareceu</Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
