"use client";

import { useState } from "react";
// O lucide não traz mais ícones de marca; Camera representa o post do feed.
import { Camera, Mail, MessageCircle } from "lucide-react";
import { CopyButton } from "@/components/dashboard/marketing-share";
import type { MessageTemplate } from "@/lib/marketing";

const CHANNEL_ICON = {
  WhatsApp: MessageCircle,
  Instagram: Camera,
  "E-mail": Mail,
} as const;

export function MessageTemplates({ templates }: { templates: MessageTemplate[] }) {
  const [activeId, setActiveId] = useState(templates[0]?.id);
  const active = templates.find((t) => t.id === activeId) ?? templates[0];

  if (!active) return null;

  return (
    <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <h2 className="text-sm text-[var(--text-primary)] mb-1">Mensagens prontas</h2>
      <p className="text-xs text-[var(--text-tertiary)] font-light mb-4">
        Já preenchidas com o nome do seu negócio, seu serviço mais vendido e seu link.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {templates.map((template) => {
          const Icon = CHANNEL_ICON[template.channel];
          const selected = template.id === active.id;
          return (
            <button
              key={template.id}
              onClick={() => setActiveId(template.id)}
              aria-pressed={selected}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border text-xs transition-colors ${
                selected
                  ? "border-[var(--mint)] bg-[var(--mint-dim)] text-[var(--mint)]"
                  : "border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              }`}
            >
              <Icon size={13} />
              {template.title}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--text-tertiary)] mb-3">{active.when}</p>

      <pre className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] font-light whitespace-pre-wrap break-words font-[family-name:var(--font-body)] mb-3">
        {active.body}
      </pre>

      <CopyButton value={active.body} label="Copiar mensagem" />
    </div>
  );
}
