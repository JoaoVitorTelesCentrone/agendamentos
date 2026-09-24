import type { Metadata } from "next"

import { QuizClient } from "./quiz-client"

export const metadata: Metadata = {
  title: "Quanto sua agenda deixa na mesa todo mês? — Diagnóstico AgendaFlow",
  description:
    "Faltas, horários vagos e clientes que não voltam têm impacto no seu negócio. Responda 8 perguntas e descubra oportunidades para recuperar tempo e receita.",
}

export default function QuizPage() {
  return <QuizClient />
}
