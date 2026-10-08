// Read/write integration checks use disposable browser contexts, never an operator's profile.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const port = Number(process.argv[2] ?? 8091);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local port");
const out = resolve("screenshots", "fase4b", String(port));
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
    await page.goto(`${base}/inventarios`);
    await page.getByRole("button", { name: "Novo inventário", exact: true }).waitFor();
    await page.getByText("Nenhum inventário encontrado.", { exact: false }).waitFor();
    const original = await page.evaluate(() => ({
      boxes: localStorage.getItem("orion-storage.boxes.v1"),
      movements: localStorage.getItem("orion-storage.movements.v1"),
    }));
    async function start(scope = "LOCATION", location = "seed-loc-sup-a-01-01-01") {
      await page.getByRole("button", { name: "Novo inventário", exact: true }).click();
      await page.getByLabel("Tipo de escopo", { exact: true }).selectOption(scope);
      if (scope === "LOCATION")
        await page.getByLabel("Posição", { exact: true }).selectOption(location);
      if (["AISLE", "RACK", "LEVEL"].includes(scope))
        await page.getByLabel("Corredor", { exact: true }).selectOption("A");
      if (["RACK", "LEVEL"].includes(scope))
        await page.getByLabel("Prateleira", { exact: true }).selectOption("01");
      if (scope === "LEVEL") await page.getByLabel("Nível", { exact: true }).selectOption("01");
      await page.getByRole("button", { name: "Iniciar inventário", exact: true }).click();
      await page.getByRole("button", { name: "Revisar inventário", exact: true }).waitFor();
    }
    async function record(code) {
      await page.getByLabel("Digitar ou colar código", { exact: true }).fill(code);
      await page.getByRole("button", { name: "Registrar leitura", exact: true }).click();
    }
    async function finish() {
      await page.getByRole("button", { name: "Revisar inventário", exact: true }).click();
      await page.getByRole("button", { name: "Finalizar inventário", exact: true }).click();
      await page.getByText("Sessão encerrada.", { exact: false }).waitFor();
      assert.equal(
        await page.getByRole("button", { name: "Registrar leitura", exact: true }).count(),
        0,
      );
      assert.equal(await page.getByLabel("Digitar ou colar código", { exact: true }).count(), 0);
    }
    async function back() {
      await page.getByRole("button", { name: "Voltar ao histórico", exact: true }).click();
      await page.getByRole("button", { name: "Novo inventário", exact: true }).waitFor();
    }
    async function stored() {
      return page.evaluate(
        () => JSON.parse(localStorage.getItem("orion-storage.inventories.v1")).sessions,
      );
    }

    // Location confirmation with the shared QR resolver, followed by a complete matching count.
    await page.getByRole("button", { name: "Novo inventário", exact: true }).click();
    await page
      .getByLabel("Digitar ou colar código", { exact: true })
      .fill("orion://v1/location/SUP-A-01-01-01");
    await page.getByRole("button", { name: "Identificar posição", exact: true }).click();
    await page.getByText("Posição identificada:", { exact: false }).waitFor();
    assert.equal(
      await page.getByLabel("Posição", { exact: true }).inputValue(),
      "seed-loc-sup-a-01-01-01",
    );
    await page.getByRole("button", { name: "Iniciar inventário", exact: true }).click();
    await record("orion://v1/box/CX-20261006-000001");
    await page.getByRole("status").filter({ hasText: "Encontrada nesta posição" }).waitFor();
    await record("CX-20261006-000001");
    await page.getByRole("alert").filter({ hasText: "Esta caixa já foi contabilizada." }).waitFor();
    assert.equal((await stored())[0].items.filter((item) => item.found).length, 1);
    await finish();
    assert.equal((await stored())[0].items[0].classification, "MATCH");
    await page.screenshot({ path: resolve(out, `${size}-corretas.png`), fullPage: true });
    await back();

    // MISSING, UNEXPECTED and WRONG_LOCATION, plus valid nonexistent QR rejection.
    await start();
    await record("orion://v1/box/CX-20261008-999999");
    await page.getByRole("alert").waitFor();
    assert.equal((await stored())[1].items.length, 1);
    await record("CX-20261006-000004");
    await page.getByRole("status").filter({ hasText: "Encontrada nesta posição" }).waitFor();
    await record("CX-20261006-000002");
    await page.getByRole("status").filter({ hasText: "CX-20261006-000002" }).waitFor();
    await finish();
    const divergent = (await stored())[1];
    assert.deepEqual(divergent.items.map((item) => item.classification).sort(), [
      "MISSING",
      "UNEXPECTED",
      "WRONG_LOCATION",
    ]);
    await page.screenshot({ path: resolve(out, `${size}-divergencias.png`), fullPage: true });
    const immutable = JSON.stringify(divergent);
    await page.reload();
    await page.getByRole("button", { name: "Novo inventário", exact: true }).waitFor();
    await page.getByLabel("Buscar inventário", { exact: true }).fill(divergent.code);
    await page.getByRole("button", { name: "Ver inventário", exact: true }).click();
    await page.getByText("Sessão encerrada.", { exact: false }).waitFor();
    assert.equal(JSON.stringify((await stored())[1]), immutable);
    assert.equal(
      await page.getByRole("button", { name: "Registrar leitura", exact: true }).count(),
      0,
    );
    await page.goto(`${base}/mapa`);
    await page.getByRole("button", { name: /SUP-A-01-01-01.*Divergência encontrada/ }).waitFor();
    await page.screenshot({ path: resolve(out, `${size}-mapa.png`), fullPage: true });
    const stockAfter = await page.evaluate(() => ({
      boxes: localStorage.getItem("orion-storage.boxes.v1"),
      movements: localStorage.getItem("orion-storage.movements.v1"),
    }));
    assert.deepEqual(stockAfter, original);

    // Broad scopes demand the found position and cancellation preserves observations.
    await page.goto(`${base}/inventarios`);
    await page.getByRole("button", { name: "Novo inventário", exact: true }).waitFor();
    for (const scope of ["AREA", "AISLE", "RACK", "LEVEL"]) {
      await start(scope);
      await record("CX-20261006-000001");
      await page.getByRole("alert").filter({ hasText: "Selecione ou leia a posição" }).waitFor();
      await page
        .getByLabel("Encontrada nesta posição", { exact: true })
        .selectOption("seed-loc-sup-a-01-01-01");
      await record("CX-20261006-000001");
      await page.getByRole("status").filter({ hasText: "Encontrada nesta posição" }).waitFor();
      await page.getByRole("button", { name: "Cancelar inventário", exact: true }).click();
      await page.getByRole("button", { name: "Confirmar cancelamento", exact: true }).click();
      await page.getByText("Sessão encerrada.", { exact: false }).waitFor();
      await back();
    }
    await page.getByLabel("Status", { exact: true }).selectOption("CANCELLED");
    assert.equal(
      await page.getByRole("button", { name: "Ver inventário", exact: true }).count(),
      4,
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: resolve(out, `${size}-historico.png`), fullPage: true });
    results.push({
      size,
      port,
      ok: true,
      sessions: (await stored()).length,
      consoleErrors: errors,
      overflow,
    });
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(resolve(out, "resultado.json"), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
