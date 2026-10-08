import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const out = resolve("screenshots", "fase4c3", String(port));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const results = [];
try {
  for (const [size, viewport] of [
    ["desktop", { width: 1280, height: 800 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const base = `http://127.0.0.1:${port}`;
    async function visit(route) {
      await page.goto(base + route);
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
    }
    async function snapshot() {
      return page.evaluate(() => ({
        boxes: localStorage.getItem("orion-storage.boxes.v1"),
        movements: localStorage.getItem("orion-storage.movements.v1"),
      }));
    }
    await visit("/caixas");
    const before = await snapshot();
    await visit("/");
    const search = page.getByRole("searchbox");
    await search.fill("inexistente-4c3");
    await page.getByText("Nenhum produto encontrado", { exact: true }).waitFor();
    await page.screenshot({
      path: resolve(out, `${size}-empty.png`),
      fullPage: true,
      caret: "initial",
    });
    await search.fill("");
    await page.getByLabel("Status", { exact: true }).selectOption("INACTIVE");
    await page.getByText("Nenhum produto encontrado", { exact: true }).waitFor();
    await page.getByLabel("Status", { exact: true }).selectOption("ALL");
    const productsBefore = await page.evaluate(() =>
      localStorage.getItem("orion-storage.products.v1"),
    );
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Novo produto" });
    await dialog.waitFor();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      assert(await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))));
    }
    await dialog.getByRole("button", { name: "Salvar produto", exact: true }).click();
    const name = dialog.getByLabel("Nome", { exact: false });
    assert.equal(await name.getAttribute("aria-invalid"), "true");
    assert((await name.getAttribute("aria-describedby")).includes("name-error"));
    await page.waitForFunction(
      () => getComputedStyle(document.getElementById("name")).borderColor === "rgb(196, 73, 73)",
    );
    assert.equal(
      await name.evaluate((element) => getComputedStyle(element).borderColor),
      "rgb(196, 73, 73)",
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("orion-storage.products.v1")),
      productsBefore,
    );
    await name.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: resolve(out, `${size}-errors.png`),
      fullPage: true,
      caret: "initial",
    });
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Novo produto", exact: true }).click();
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.locator(":focus").textContent(), "Novo produto");
    await page.screenshot({
      path: resolve(out, `${size}-products.png`),
      fullPage: true,
      caret: "initial",
    });
    await visit("/caixas");
    await page.getByRole("button", { name: "Nova caixa", exact: true }).click();
    const boxDialog = page.getByRole("dialog", { name: "Nova caixa" });
    await boxDialog.getByRole("button", { name: "Registrar caixa", exact: true }).click();
    assert.equal(
      await boxDialog.getByLabel("Produto", { exact: false }).getAttribute("aria-invalid"),
      "true",
    );
    await boxDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await boxDialog.waitFor({ state: "hidden" });
    assert.equal(await page.locator(":focus").textContent(), "Nova caixa");
    await page.screenshot({
      path: resolve(out, `${size}-boxes.png`),
      fullPage: true,
      caret: "initial",
    });
    const labelButton = page.getByRole("button", { name: "Etiqueta", exact: true }).first();
    await labelButton.click();
    const labelDialog = page.getByRole("dialog", { name: "Etiqueta da caixa" });
    await labelDialog.waitFor();
    assert.equal(await labelDialog.locator("svg.orion-qr").count(), 1);
    assert.equal(
      await labelDialog
        .locator(".orion-label")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
      "rgb(255, 255, 255)",
    );
    assert.equal(await page.locator(".orion-print-sheet").count(), 1);
    await page.screenshot({ path: resolve(out, `${size}-label.png`), caret: "initial" });
    await labelDialog.getByRole("button", { name: "Fechar", exact: true }).last().click();
    await labelDialog.waitFor({ state: "hidden" });
    await visit("/scanner");
    await page
      .getByLabel("Digitar ou colar código", { exact: true })
      .fill("orion://v1/box/CX-20261006-000001");
    await page.getByRole("button", { name: "Identificar", exact: true }).click();
    await page.getByText("Caixa identificada · Aguardando destino", { exact: true }).waitFor();
    await page
      .getByLabel("Digitar ou colar código", { exact: true })
      .fill("orion://v1/location/SUP-A-01-01-02");
    await page.getByRole("button", { name: "Identificar", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).waitFor();
    assert.deepEqual(
      await snapshot(),
      before,
      "Reading QR changed official stock before confirmation",
    );
    await page.screenshot({
      path: resolve(out, `${size}-scanner-confirm.png`),
      fullPage: true,
      caret: "initial",
    });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    results.push({
      size,
      ok: true,
      invalidFormsPreservedData: true,
      qrRequiresConfirmation: true,
      errors,
    });
    await context.close();
  }
  writeFileSync(
    resolve(out, "components-results.json"),
    JSON.stringify({ ok: true, port, results }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, port, results }));
} finally {
  await browser.close();
}
