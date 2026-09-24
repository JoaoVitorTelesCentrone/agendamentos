"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, ArrowRight, Home } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

const REDIRECT_SECONDS = 8

export default function NotFound() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval)
          router.push("/")
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [router])

  const progress = ((REDIRECT_SECONDS - seconds) / REDIRECT_SECONDS) * 100

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
          <CalendarDays className="size-4" />
        </span>
        <span className="font-heading text-lg tracking-tight">AgendaFlow</span>
      </Link>

      <p className="font-heading text-7xl tracking-tight text-muted-foreground/40">
        404
      </p>
      <h1 className="mt-4 font-heading text-3xl tracking-tight text-balance">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground text-pretty">
        O endereço que você tentou acessar não existe ou foi movido. Vamos te
        levar de volta para o início.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="size-4" data-icon="inline-start" />
            Ir para o início
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/cadastro">
            Criar minha agenda
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <div className="mt-10 w-full max-w-xs">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Redirecionando em {seconds}s
        </p>
        <div className="mt-2 h-px w-full bg-border">
          <div
            className="h-px bg-foreground transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
