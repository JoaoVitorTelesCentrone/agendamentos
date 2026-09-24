import Link from "next/link"

import { AuthShell } from "@/components/auth-ui"
import { ResetForm } from "./reset-form"

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) {
  const params = await searchParams
  if (!params.email || !params.token) {
    return <AuthShell title="Link incompleto" subtitle="Solicite um novo link de redefinição de senha." footer={<Link className="font-medium text-foreground underline underline-offset-4" href="/recuperar-senha">Solicitar novo link</Link>}><p className="text-sm text-muted-foreground">O endereço não contém as informações necessárias para continuar.</p></AuthShell>
  }
  return <ResetForm email={params.email} token={params.token} />
}
