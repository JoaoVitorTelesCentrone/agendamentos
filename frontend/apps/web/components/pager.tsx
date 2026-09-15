import Link from "next/link"

// Paginação por links (server component) — funciona sem JS no cliente.
export function Pager({
  page,
  totalPages,
  hrefFor,
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-muted"
        >
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground tabular-nums">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-muted"
        >
          Próxima →
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}

// Chip de filtro (link) — ativo quando `active`.
export function FilterChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  )
}
