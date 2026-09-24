import { test, expect } from "@playwright/test";
import { OWNER_STATE } from "../setup/env";

test.describe("visitante não autenticado", () => {
  test("landing page renderiza com CTA de registro", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AgendaFlow").first()).toBeVisible();
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
  });

  test("página de login renderiza", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar com Google/ })).toBeVisible();
  });

  test("página de registro renderiza", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Crie sua conta" })).toBeVisible();
  });

  test("proxy redireciona rotas do dashboard para /login", async ({ page }) => {
    for (const route of ["/dashboard", "/appointments", "/services", "/availability", "/settings"]) {
      await page.goto(route);
      await page.waitForURL("**/login");
      await expect(page.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();
    }
  });
});

test.describe("usuário autenticado", () => {
  test.use({ storageState: OWNER_STATE });

  test("proxy redireciona /login para /dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("proxy redireciona /register (etapa auth) para /dashboard", async ({ page }) => {
    await page.goto("/register");
    await page.waitForURL("**/dashboard");
  });
});
