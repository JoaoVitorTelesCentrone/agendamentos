import { beforeAll, describe, expect, test } from "bun:test"
import { NextRequest } from "next/server"

import { proxy } from "../proxy"
import {
  createSessionToken,
  SESSION_COOKIE,
  verifySessionToken,
} from "../lib/db/session"

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-with-at-least-thirty-two-characters"
})

describe("sessao do painel", () => {
  test("cria e valida um token assinado", async () => {
    const token = await createSessionToken({ id: "user-1", email: "dono@example.com" })

    await expect(verifySessionToken(token)).resolves.toEqual({
      id: "user-1",
      email: "dono@example.com",
    })
  })

  test("rejeita token adulterado", async () => {
    const token = await createSessionToken({ id: "user-1", email: "dono@example.com" })

    await expect(verifySessionToken(`${token}adulterado`)).resolves.toBeNull()
  })
})

describe("proxy de autenticacao", () => {
  test("redireciona visitante do painel para o login preservando o destino", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/painel/agenda?view=week")
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "http://localhost/entrar?next=%2Fpainel%2Fagenda%3Fview%3Dweek"
    )
  })

  test("remove cookie invalido", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/painel", {
        headers: { cookie: `${SESSION_COOKIE}=invalido` },
      })
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=;`)
  })

  test("permite painel com sessao valida e tira usuario logado do login", async () => {
    const token = await createSessionToken({ id: "user-1", email: "dono@example.com" })
    const headers = { cookie: `${SESSION_COOKIE}=${token}` }

    const panelResponse = await proxy(
      new NextRequest("http://localhost/painel", { headers })
    )
    expect(panelResponse.status).toBe(200)

    const loginResponse = await proxy(
      new NextRequest("http://localhost/entrar", { headers })
    )
    expect(loginResponse.status).toBe(307)
    expect(loginResponse.headers.get("location")).toBe("http://localhost/painel")
  })
})
