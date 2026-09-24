"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Copiar",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
      return;
    }
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      aria-label={label}
      className={
        className ??
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
      }
    >
      {copied ? <Check size={13} className="text-[var(--mint)]" /> : <Copy size={13} />}
      {copied ? "Copiado" : label}
    </button>
  );
}

/**
 * Link público do negócio com QR pronto para imprimir. O SVG chega renderizado
 * do servidor — vira um Blob local na hora de baixar, sem depender de rede.
 */
export function ShareCard({
  bookingUrl,
  qrSvg,
  slug,
}: {
  bookingUrl: string;
  qrSvg: string;
  slug: string;
}) {
  function downloadQr() {
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qrcode-${slug}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("QR code baixado");
  }

  const shareText = `Agende seu horário direto por aqui: ${bookingUrl}`;

  return (
    <div className="p-5 rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <h2 className="text-sm text-[var(--text-primary)] mb-1">Seu link de agendamento</h2>
      <p className="text-xs text-[var(--text-tertiary)] font-light mb-4">
        Coloque na bio do Instagram, no status do WhatsApp e impresso no balcão.
      </p>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-primary)] truncate flex-1">
              {bookingUrl}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyButton value={bookingUrl} label="Copiar link" />
            <CopyButton value={shareText} label="Copiar com mensagem" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <MessageCircle size={13} />
              Enviar no WhatsApp
            </a>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ExternalLink size={13} />
              Abrir página
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div
            aria-label="QR code do link de agendamento"
            className="w-28 h-28 shrink-0 p-2 rounded-[var(--radius-sm)] bg-white"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <Button
            onClick={downloadQr}
            variant="outline"
            className="gap-2 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Download size={14} />
            Baixar QR
          </Button>
        </div>
      </div>
    </div>
  );
}
