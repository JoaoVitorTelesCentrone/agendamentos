"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { logout } from "@/lib/auth"

export function LogoutButton() {
  const router = useRouter()

  async function onLogout() {
    await logout()
    router.refresh()
    router.replace("/entrar")
  }

  return (
    <Button variant="ghost" size="sm" onClick={onLogout}>
      <LogOut className="size-4" data-icon="inline-start" />
      Sair
    </Button>
  )
}
