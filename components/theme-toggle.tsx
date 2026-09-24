"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={mounted ? isDark ? "Ativar modo claro" : "Ativar modo escuro" : "Alternar tema"}
      aria-pressed={mounted ? isDark : undefined}
      title={mounted ? isDark ? "Ativar modo claro" : "Ativar modo escuro" : "Alternar tema"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "w-8 h-8 shrink-0 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex items-center justify-center transition-colors",
        className
      )}
    >
      {/* Ícone só após montar — antes disso o tema resolvido é desconhecido no cliente */}
      {mounted ? isDark ? <Sun size={14} /> : <Moon size={14} /> : <Sun size={14} className="opacity-0" />}
    </button>
  );
}
