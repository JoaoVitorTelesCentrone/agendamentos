"use server"

import { revalidatePath } from "next/cache"

import { query } from "@/lib/db/sql"
import { requireContext } from "@/lib/tenant"

export async function deleteTransaction(formData: FormData) {
  const { tenant } = await requireContext()
  const id = String(formData.get("id") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(id)) return
  await query("delete from transactions where tenant_id = $1 and id = $2", [tenant.id, id])
  revalidatePath("/painel/financeiro")
}
