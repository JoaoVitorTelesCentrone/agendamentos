"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const statuses = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "completed", label: "Concluídos" },
  { value: "no_show", label: "Não compareceu" },
];

const periods = [
  { value: "", label: "Todos" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
];

export function AppointmentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "all";
  const currentPeriod = searchParams.get("period") ?? "";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/appointments?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-6">
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-tertiary)] text-xs">Status:</span>
        {statuses.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => update("status", value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs transition-colors border",
              currentStatus === value
                ? "bg-[var(--mint-dim)] text-[var(--mint)] border-[var(--mint)]/20"
                : "text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-tertiary)] text-xs">Período:</span>
        {periods.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => update("period", value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs transition-colors border",
              currentPeriod === value
                ? "bg-[var(--mint-dim)] text-[var(--mint)] border-[var(--mint)]/20"
                : "text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
