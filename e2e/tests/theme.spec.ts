import { test, expect } from "@playwright/test";
import { E2E_SLUG, OWNER_STATE } from "../setup/env";

test.describe("dark/light mode", () => {
  test("alterna o tema na landing e persiste após reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Ativar modo claro" }).click();
    await expect(html).toHaveClass(/light/);

    await page.reload();
    await expect(html).toHaveClass(/light/);

    await page.getByRole("button", { name: "Ativar modo escuro" }).click();
    await expect(html).toHaveClass(/dark/);
  });

  test("toggle disponível na página pública e no booking", async ({ page }) => {
    await page.goto(`/${E2E_SLUG}`);
    await expect(page.getByRole("button", { name: /Ativar modo (claro|escuro)/ })).toBeVisible();

    await page.goto(`/${E2E_SLUG}/book`);
    await expect(page.getByRole("button", { name: /Ativar modo (claro|escuro)/ })).toBeVisible();
  });
});

test.describe("dark/light mode no dashboard", () => {
  test.use({ storageState: OWNER_STATE });

  test("alterna o tema pela sidebar", async ({ page }) => {
    await page.goto("/dashboard");
    const html = page.locator("html");

    // Um toggle na sidebar desktop (visível) e outro no drawer mobile (oculto)
    await page.getByRole("button", { name: "Ativar modo claro" }).last().click();
    await expect(html).toHaveClass(/light/);
    await page.getByRole("button", { name: "Ativar modo escuro" }).last().click();
    await expect(html).toHaveClass(/dark/);
  });
});
