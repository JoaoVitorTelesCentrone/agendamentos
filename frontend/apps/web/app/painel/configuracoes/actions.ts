"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireContext } from "@/lib/tenant"

// O logo chega como data URL (redimensionado no browser para ~640px).
// Sem storage de arquivos na stack (Neon), o data URL vive em tenants.logo_url.
const MAX_LOGO_DATA_URL = 900_000 // ~675KB de imagem — folga p/ um webp 640px

export async function updateAppearance(formData: FormData) {
  const { tenant } = await requireContext()
  const supabase = await createClient()

  const color = String(formData.get("primary_color") ?? "").trim()
  const logoAction = String(formData.get("logo_action") ?? "keep") // keep | replace | remove
  const logoData = String(formData.get("logo_data") ?? "")

  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { error: "Cor inválida." }
  }

  const patch: Record<string, unknown> = { primary_color: color || null }
  if (logoAction === "remove") {
    patch.logo_url = null
  } else if (logoAction === "replace") {
    if (!logoData.startsWith("data:image/") || logoData.length > MAX_LOGO_DATA_URL) {
      return { error: "Imagem inválida ou grande demais. Tente outro arquivo." }
    }
    patch.logo_url = logoData
  }

  const { error } = await supabase.from("tenants").update(patch)
  if (error) return { error: "Não foi possível salvar as alterações." }

  revalidatePath("/painel", "layout")
  revalidatePath(`/${tenant.slug}/public`)
  return { ok: true }
}
