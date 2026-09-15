// Inputs simples reaproveitados nos formularios do painel.

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground">{label}</span>
      <input
        {...props}
        className="h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50 read-only:text-muted-foreground"
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function TextArea({
  label,
  ...props
}: { label: string } & React.ComponentProps<"textarea">) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground">{label}</span>
      <textarea
        {...props}
        className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50"
      />
    </label>
  )
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}
