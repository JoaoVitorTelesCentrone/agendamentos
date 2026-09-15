import { NextResponse } from "next/server"

import { query } from "@/lib/db/sql"

// Recebe as respostas do quiz público de validação (/quiz) e grava em
// quiz_responses. Não é tenant-scoped — é funil de descoberta, respostas globais.

const QUIZ_DEFAULT = "agendamento"

function normalizeWhatsapp(input: string): string {
  return (input ?? "").replace(/\D/g, "")
}

export async function POST(request: Request) {
  let body: {
    quiz?: string
    answers?: Record<string, unknown>
    name?: string
    whatsapp?: string
    referrer?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const quiz = (body.quiz ?? QUIZ_DEFAULT).toString().slice(0, 60)
  const answers =
    body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? body.answers
      : null

  if (!answers || Object.keys(answers).length === 0) {
    return NextResponse.json({ error: "Nenhuma resposta enviada." }, { status: 400 })
  }

  const name = (body.name ?? "").toString().trim().slice(0, 120) || null
  const whatsapp = normalizeWhatsapp(body.whatsapp ?? "") || null
  const referrer = (body.referrer ?? "").toString().slice(0, 500) || null
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500) || null

  try {
    const rows = await query<{ id: string }>(
      `insert into quiz_responses (quiz, answers, name, whatsapp, referrer, user_agent)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [quiz, JSON.stringify(answers), name, whatsapp, referrer, userAgent]
    )
    return NextResponse.json({ ok: true, id: rows[0]?.id ?? null })
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar sua resposta." },
      { status: 500 }
    )
  }
}
