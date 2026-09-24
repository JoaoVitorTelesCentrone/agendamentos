"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      onClick={handleCopy}
      variant="ghost"
      className="border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] gap-2 text-sm"
    >
      {copied ? <Check size={14} className="text-[var(--mint)]" /> : <Copy size={14} />}
      {copied ? "Copiado!" : "Copiar link"}
    </Button>
  );
}
