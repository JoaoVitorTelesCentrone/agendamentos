"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface AvailabilityItem {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

function defaultAvailability(): AvailabilityItem[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    startTime: "09:00",
    endTime: i === 6 ? "13:00" : "18:00",
    active: i !== 0,
  }));
}

export function AvailabilityManager({
  initialAvailability,
}: {
  initialAvailability: AvailabilityItem[];
}) {
  const merged = defaultAvailability().map((def) => {
    const found = initialAvailability.find((a) => a.dayOfWeek === def.dayOfWeek);
    return found ?? def;
  });

  const [items, setItems] = useState(merged);
  const [loading, setLoading] = useState(false);

  function update(dayOfWeek: number, patch: Partial<AvailabilityItem>) {
    setItems((prev) =>
      prev.map((item) => (item.dayOfWeek === dayOfWeek ? { ...item, ...patch } : item))
    );
  }

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (!res.ok) { toast.error("Erro ao salvar disponibilidade"); return; }
      toast.success("Disponibilidade atualizada");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        {items.map((item, idx) => (
          <div
            key={item.dayOfWeek}
            className={`flex items-center gap-6 px-6 py-4 ${
              idx < items.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
            } ${!item.active ? "opacity-50" : ""}`}
          >
            <div className="w-28">
              <span className="text-[var(--text-primary)] text-sm">{DAY_NAMES[item.dayOfWeek]}</span>
            </div>
            <Switch
              checked={item.active}
              onCheckedChange={(v) => update(item.dayOfWeek, { active: v })}
              className="data-[state=checked]:bg-[var(--mint)]"
            />
            {item.active ? (
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={item.startTime}
                  onChange={(e) => update(item.dayOfWeek, { startTime: e.target.value })}
                  className="w-32 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] text-sm"
                />
                <span className="text-[var(--text-tertiary)] text-sm">até</span>
                <Input
                  type="time"
                  value={item.endTime}
                  onChange={(e) => update(item.dayOfWeek, { endTime: e.target.value })}
                  className="w-32 bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] text-sm"
                />
              </div>
            ) : (
              <span className="text-[var(--text-tertiary)] text-sm">Fechado</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-[var(--mint)] text-black hover:bg-[var(--mint-hover)] font-medium"
        >
          {loading ? "Salvando..." : "Salvar horários"}
        </Button>
      </div>
    </div>
  );
}
