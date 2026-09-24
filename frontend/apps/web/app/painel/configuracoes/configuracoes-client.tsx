"use client"

import { useRef, useState, useTransition } from "react"
import { Check, ImagePlus, Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { DEFAULT_BRAND, THEME_PRESETS } from "@/lib/themes"
import { updateAppearance, updateFinanceRates } from "./actions"

const MAX_FILE_BYTES = 8 * 1024 * 1024

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

// Redimensiona no browser (máx. 640px) e devolve um data URL compacto,
// para caber no limite do server action e não pesar na página pública.
async function processLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("invalid image"))
      el.src = url
    })
    const max = 640
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL("image/webp", 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function ConfiguracoesClient({
  tenantName,
  initialColor,
  initialLogoUrl,
  initialTaxRate,
  initialCardFeeRate,
}: {
  tenantName: string
  initialColor: string | null
  initialLogoUrl: string | null
  initialTaxRate: number
  initialCardFeeRate: number
}) {
  const [color, setColor] = useState(initialColor || DEFAULT_BRAND)
  // undefined = mantém o logo atual; null = remover; string = novo data URL
  const [newLogo, setNewLogo] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [taxRate, setTaxRate] = useState(initialTaxRate)
  const [cardFeeRate, setCardFeeRate] = useState(initialCardFeeRate)
  const [financeSaved, setFinanceSaved] = useState(false)
  const [financeError, setFinanceError] = useState<string | null>(null)
  const [financePending, startFinanceTransition] = useTransition()
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const logoShown = newLogo === undefined ? initialLogoUrl : newLogo
  const dirty =
    newLogo !== undefined || color !== (initialColor || DEFAULT_BRAND)

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    setSaved(false)
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem (PNG, JPG ou WebP).")
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Imagem grande demais. Use um arquivo de até 8MB.")
      return
    }
    try {
      setNewLogo(await processLogo(file))
    } catch {
      setError("Não foi possível ler essa imagem. Tente outro arquivo.")
    }
  }

  function onSave() {
    setError(null)
    setSaved(false)
    const data = new FormData()
    data.set("primary_color", color)
    data.set("logo_action", newLogo === undefined ? "keep" : newLogo === null ? "remove" : "replace")
    if (typeof newLogo === "string") data.set("logo_data", newLogo)
    startTransition(async () => {
      const res = await updateAppearance(data)
      if (res?.error) {
        setError(res.error)
      } else {
        setNewLogo(undefined)
        setSaved(true)
      }
    })
  }

  async function onSaveFinance(formData: FormData) {
    setFinanceError(null)
    setFinanceSaved(false)
    await new Promise<void>((resolve) => {
      startFinanceTransition(async () => {
        const result = await updateFinanceRates(formData)
        if (result?.error) setFinanceError(result.error)
        else setFinanceSaved(true)
        resolve()
      })
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-8">
        <form action={onSaveFinance} className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm shadow-foreground/5">
          <h2 className="font-medium">Impostos e taxas</h2>
          <p className="mt-1 text-sm text-muted-foreground">O resumo financeiro estima esses valores sobre o faturamento do mês.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">Imposto sobre faturamento (%)<input name="tax_rate" type="number" min="0" max="100" step="0.01" required value={taxRate} onChange={(event) => { setTaxRate(Number(event.target.value)); setFinanceSaved(false) }} className="h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground" /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">Taxa média de cartão (%)<input name="card_fee_rate" type="number" min="0" max="100" step="0.01" required value={cardFeeRate} onChange={(event) => { setCardFeeRate(Number(event.target.value)); setFinanceSaved(false) }} className="h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground" /></label>
          </div>
          {financeError && <p role="alert" className="mt-3 text-sm text-destructive">{financeError}</p>}
          <div className="mt-4 flex items-center gap-3"><Button disabled={financePending}>{financePending ? "Salvando…" : "Salvar valores"}</Button>{financeSaved && <span role="status" className="text-sm text-muted-foreground">Valores salvos.</span>}</div>
        </form>

        {/* Logo */}
        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm shadow-foreground/5">
          <h2 className="font-medium">Logo do estabelecimento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aparece no topo da sua página pública de agendamento.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background">
              {logoShown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoShown} alt="Logo" className="size-full object-cover" />
              ) : (
                <span className="font-heading text-2xl" style={{ color }}>
                  {initials(tenantName)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="size-4" data-icon="inline-start" />
                {logoShown ? "Trocar imagem" : "Enviar imagem"}
              </Button>
              {logoShown && (
                <button
                  type="button"
                  onClick={() => {
                    setSaved(false)
                    setNewLogo(null)
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Remover
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Tema */}
        <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm shadow-foreground/5">
          <h2 className="font-medium">Tema de cores</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A cor dos botões e destaques que seus clientes veem ao agendar.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {THEME_PRESETS.map((t) => {
              const selected = color.toLowerCase() === t.color.toLowerCase()
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSaved(false)
                    setColor(t.color)
                  }}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors ${
                    selected
                      ? "border-foreground/40 bg-muted"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {selected && <Check className="size-4" />}
                  </span>
                  {t.name}
                </button>
              )
            })}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setSaved(false)
                setColor(e.target.value)
              }}
              className="size-9 cursor-pointer rounded-md border border-border bg-card p-1"
            />
            Ou escolha uma cor personalizada
          </label>
        </section>

        {error && (
          <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={onSave} disabled={pending || !dirty}>
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
          {saved && !dirty && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Check className="size-4" /> Salvo!
            </span>
          )}
        </div>
      </div>

      {/* Prévia da página pública */}
      <aside className="h-fit">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
          PRÉVIA DA PÁGINA PÚBLICA
        </p>
          <div className="overflow-hidden rounded-2xl border border-border/80 shadow-lg shadow-foreground/5">
          <div className="flex flex-col items-center gap-3 border-b border-border bg-card px-6 py-8 text-center">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background">
              {logoShown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoShown} alt="Logo" className="size-full object-cover" />
              ) : (
                <span className="font-heading text-xl" style={{ color }}>
                  {initials(tenantName)}
                </span>
              )}
            </div>
            <div>
              <p className="font-heading text-xl font-bold tracking-tight">{tenantName}</p>
              <p className="text-xs text-muted-foreground">Agende seu horário online</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-background p-5">
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-sm font-medium">Corte + barba</p>
              <p className="text-xs text-muted-foreground">45 min · R$ 80,00</p>
            </div>
            <span
              className="mt-1 rounded-md py-2.5 text-center text-sm font-medium text-white"
              style={{ backgroundColor: color }}
            >
              Continuar
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}
