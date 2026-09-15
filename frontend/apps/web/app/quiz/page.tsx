import type { Metadata } from "next"

import { QuizClient } from "./quiz-client"

export const metadata: Metadata = {
  title: "Quanto sua agenda deixa na mesa todo mês? — Diagnóstico VÍVIO",
  description:
    "Faltas, horário vazio e cliente que sumiu têm preço. Responda 8 perguntas (90 segundos) e veja quanto seu salão perde por mês — e quanto dá para recuperar.",
}

export default function QuizPage() {
  return <QuizClient />
}
