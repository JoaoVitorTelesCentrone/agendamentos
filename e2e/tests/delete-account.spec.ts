import { test, expect } from "@playwright/test";
import { DELETE_SLUG, DELETEUSER_EMAIL, DELETEUSER_STATE } from "../setup/env";
import { getDb } from "../setup/db";

test.describe("exclusão de conta", () => {
  test.use({ storageState: DELETEUSER_STATE });

  test("exige confirmação digitada e apaga tudo em cascata", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Zona de perigo")).toBeVisible();
    await page.getByRole("button", { name: "Excluir conta" }).click();

    // Botão bloqueado até digitar o slug exato
    const confirmButton = page.getByRole("button", { name: "Excluir definitivamente" });
    await expect(confirmButton).toBeDisabled();
    await page.getByPlaceholder(DELETE_SLUG).fill("slug-errado");
    await expect(confirmButton).toBeDisabled();
    await page.getByPlaceholder(DELETE_SLUG).fill(DELETE_SLUG);
    await expect(confirmButton).toBeEnabled();

    await confirmButton.click();

    // signOut redireciona para a home
    await page.waitForURL(/\/$/);

    // Sessão encerrada: dashboard volta para o login
    await page.goto("/dashboard");
    await page.waitForURL("**/login");

    // Página pública saiu do ar com a 404 customizada
    const response = await page.goto(`/${DELETE_SLUG}`);
    expect(response!.status()).toBe(404);
    await expect(page.getByText("Página não encontrada")).toBeVisible();

    // Cascade no banco: usuário, negócio e serviços apagados
    const db = getDb();
    expect(await db.user.findUnique({ where: { email: DELETEUSER_EMAIL } })).toBeNull();
    expect(await db.business.findUnique({ where: { slug: DELETE_SLUG } })).toBeNull();
    expect(await db.service.count({ where: { name: "Serviço Deletar" } })).toBe(0);
  });
});
