// Auth do painel (browser). O signup provisiona o tenant server-side
// (/api/signup); login/logout passam pelas rotas /api/auth/*, que criam/limpam
// o cookie de sessão (JWT) falando com a Neon.

export async function register(input: {
  salao: string
  nome: string
  email: string
  password: string
  /** nicho vindo do diagnóstico (/quiz) — semeia serviços e expediente */
  niche?: string
}): Promise<{ slug: string }> {
  let res: Response
  try {
    res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  } catch {
    throw new Error("Não foi possível conectar ao servidor.")
  }

  const data = (await res.json().catch(() => ({}))) as {
    slug?: string
    error?: string
  }
  if (!res.ok) {
    throw new Error(data.error ?? "Não foi possível criar a conta.")
  }

  // abre a sessão logo após criar a conta
  await login({ email: input.email, password: input.password })
  return { slug: data.slug ?? "" }
}

export async function login(input: {
  email: string
  password: string
}): Promise<void> {
  let res: Response
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      }),
    })
  } catch {
    throw new Error("Não foi possível conectar ao servidor.")
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? "E-mail ou senha incorretos.")
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" })
  } catch {
    // logout é best-effort
  }
}
