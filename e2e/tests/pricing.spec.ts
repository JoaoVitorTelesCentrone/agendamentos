import { test, expect } from "@playwright/test";
import { OWNER_STATE } from "../setup/env";

test.describe("página de preços", () => {
  test("mostra os dois planos com preços e destaques", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Preço simples/ })).toBeVisible();
    await expect(page.getByText("R$ 0")).toBeVisible();
    await expect(page.getByText("R$ 29")).toBeVisible();
    await expect(page.getByText("Recomendado")).toBeVisible();
    await expect(page.getByText("Serviços ilimitados")).toBeVisible();
  });

  test("FAQ abre e fecha", async ({ page }) => {
    await page.goto("/pricing");
    const question = page.getByRole("button", { name: /Posso cancelar a qualquer momento\?/ });
    await question.click();
    await expect(page.getByText(/O cancelamento é feito direto no painel/)).toBeVisible();
  });

  test("CTA do plano grátis leva ao registro", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("button", { name: "Começar grátis" }).click();
    await page.waitForURL("**/register");
  });

  test("assinar o Pro sem login redireciona para /login", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("button", { name: "Assinar o Pro" }).click();
    await page.waitForURL("**/login");
  });

  test("landing tem link para a página de preços", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Planos", exact: true }).first().click();
    await page.waitForURL("**/pricing");
  });
});

test.describe("assinatura nas configurações", () => {
  test.use({ storageState: OWNER_STATE });

  test("plano grátis mostra upgrade; sem Stripe configurado exibe aviso", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Assinatura", { exact: true })).toBeVisible();
    await expect(page.getByText("Grátis", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Fazer upgrade para o Pro" }).click();
    // Ambiente de teste não tem STRIPE_SECRET_KEY — a rota responde 503 com mensagem clara
    await expect(page.getByText("Pagamentos ainda não configurados. Tente novamente mais tarde.")).toBeVisible();
  });
});
