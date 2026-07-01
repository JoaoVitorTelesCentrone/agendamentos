import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

// Signup self-service: cria o usuário no Supabase Auth, provisiona o tenant
// (empresa) e o profile admin — tudo server-side com service_role, de forma
// atômica do ponto de vista do cliente. Depois o front faz signIn com a anon key.

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40)
}

export async function POST(request: Request) {
  let body: {
    salao?: string
    nome?: string
    email?: string
    password?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const salao = (body.salao ?? "").trim()
  const nome = (body.nome ?? "").trim()
  const email = (body.email ?? "").trim().toLowerCase()
  const password = body.password ?? ""

  if (!salao || nome.length < 2 || !email || password.length < 6) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 })
  }

  const admin = createAdminClient()

  // slug único a partir do nome do salão
  const base = slugify(salao) || "salao"
  let slug = base
  for (let i = 0; i < 50; i++) {
    const { data } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
    if (!data) break
    slug = `${base}-${i + 2}`
  }

  // 1) cria o usuário
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
  })
  if (userErr || !created.user) {
    const msg = userErr?.message ?? ""
    if (msg.toLowerCase().includes("already")) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado. Tente entrar." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Não foi possível criar a conta." },
      { status: 400 }
    )
  }
  const userId = created.user.id

  // 2) cria o tenant
  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .insert({ name: salao, slug, niche: "salao", status: "trial" })
    .select("id, slug")
    .single()
  if (tenantErr || !tenant) {
    await admin.auth.admin.deleteUser(userId) // rollback do usuário
    return NextResponse.json(
      { error: "Não foi possível criar o salão." },
      { status: 400 }
    )
  }

  // 3) liga o usuário ao tenant como admin
  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: tenant.id,
    name: nome,
    role: "admin",
  })
  if (profileErr) {
    await admin.from("tenants").delete().eq("id", tenant.id)
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { error: "Não foi possível finalizar o cadastro." },
      { status: 400 }
    )
  }

  return NextResponse.json({ slug: tenant.slug })
}
