import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

// All writes below are confined to disposable contexts; no operator profile is accessed.
const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const out = resolve("screenshots", "fase4c4", String(port));
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
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const visit = async (route) => {
      await page.goto(`http://127.0.0.1:${port}${route}`);
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
    };
    const snapshot = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.keys(localStorage)
            .filter((k) => k.startsWith("orion-storage."))
            .map((k) => [k, localStorage.getItem(k)]),
        ),
      );
    const shot = async (name) => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({
        path: resolve(out, `${size}-${name}.png`),
        fullPage: true,
        caret: "initial",
      });
    };
    await visit("/enderecamento");
    const officialBefore = await snapshot();
    await page.getByRole("button", { name: "Estrutura", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Estrutura", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await shot("structure");
    await page.getByRole("button", { name: "Áreas", exact: true }).click();
    await page.getByRole("region", { name: "Áreas cadastradas" }).waitFor();
    await page.getByRole("button", { name: "Nova área", exact: true }).click();
    const areaDialog = page.getByRole("dialog", { name: "Nova área" });
    await areaDialog.waitFor();
    await page.keyboard.press("Escape");
    await areaDialog.waitFor({ state: "hidden" });
    assert.equal(await page.locator(":focus").textContent(), "Nova área");
    assert.deepEqual(await snapshot(), officialBefore);
    await visit("/mapa");
    const cells = await page.locator("button.orion-map-cell").evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }),
    );
    assert(cells.length > 0 && cells.every((cell) => cell.width >= 104 && cell.height >= 96));
    for (const cell of cells)
      for (const next of cells) {
        if (cell.top === next.top && next.left > cell.left)
          assert(next.left >= cell.right + 7, "Map cells overlap");
      }
    const mapBefore = await snapshot();
    await page.getByRole("searchbox", { name: "Buscar no mapa" }).fill("SUP-A-01-01-01");
    await page.locator(".orion-cell-highlight").first().waitFor();
    await page.locator("button.orion-map-cell.orion-cell-highlight").first().click();
    const mapDialog = page.getByRole("dialog");
    await mapDialog.waitFor();
    assert.equal(
      await mapDialog.getByRole("button", { name: /Salvar|Mover|Confirmar/ }).count(),
      0,
    );
    await shot("map-detail");
    await page.keyboard.press("Escape");
    await mapDialog.waitFor({ state: "hidden" });
    assert(await page.locator(":focus").evaluate((e) => e.classList.contains("orion-map-cell")));
    assert.deepEqual(await snapshot(), mapBefore);
    await visit("/recebimentos");
    const beforeReceipt = await snapshot();
    await page.getByRole("button", { name: "+ Novo recebimento", exact: true }).click();
    await page.getByRole("button", { name: "Gerar prévia", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Selecione o produto" }).waitFor();
    assert.deepEqual(await snapshot(), beforeReceipt);
    const productSelect = page.getByLabel("Produto", { exact: false });
    const productId = await productSelect.locator("option").nth(1).getAttribute("value");
    assert(productId);
    await productSelect.selectOption(productId);
    await page.getByLabel("Quantidade de caixas", { exact: false }).fill("2");
    await page.getByLabel("Rolos por caixa", { exact: false }).fill("3");
    await page.getByLabel("Metragem por caixa", { exact: false }).fill("30");
    await page.getByRole("button", { name: "Gerar prévia", exact: true }).click();
    await page.getByRole("heading", { name: "Prévia", exact: true }).waitFor();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (button) => button.textContent.trim() === "Confirmar recebimento" && !button.disabled,
      ),
    );
    assert.deepEqual(await snapshot(), beforeReceipt, "Preview reserved codes or persisted data");
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (button) =>
          button.textContent.trim() === "Confirmar recebimento" &&
          getComputedStyle(button).backgroundColor === "rgb(22, 108, 106)",
      ),
    );
    await shot("receipt-preview");
    await page.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();
    await page.getByRole("heading", { name: "Recebimento concluído.", exact: true }).waitFor();
    const afterReceipt = await snapshot();
    const oldBoxes = JSON.parse(beforeReceipt["orion-storage.boxes.v1"]).boxes;
    const nextBoxes = JSON.parse(afterReceipt["orion-storage.boxes.v1"]).boxes;
    assert.equal(nextBoxes.length, oldBoxes.length + 2);
    const created = nextBoxes.filter((b) => !oldBoxes.some((o) => o.id === b.id));
    assert(created.every((b) => !b.currentLocationId));
    assert.equal(
      afterReceipt["orion-storage.movements.v1"],
      beforeReceipt["orion-storage.movements.v1"],
    );
    await page.getByRole("button", { name: "Imprimir etiquetas", exact: true }).click();
    const labels = page.getByRole("dialog", { name: "Etiquetas do recebimento" });
    await labels.waitFor();
    assert.equal(await labels.locator("svg.orion-qr").count(), 2);
    assert.equal(await page.locator(".orion-print-sheet .orion-label-box").count(), 2);
    await shot("receipt-labels");
    const paths = await labels
      .locator("svg.orion-qr")
      .evaluateAll((nodes) => nodes.map((n) => n.innerHTML));
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => {
      document.body.dataset.orionPrint = "label";
    });
    const printMetrics = await page.locator(".orion-print-sheet").evaluate((sheet) => ({
      display: getComputedStyle(sheet).display,
      background: getComputedStyle(sheet).backgroundColor,
      labels: [...sheet.querySelectorAll(".orion-label-box")].map((label) => ({
        width: label.getBoundingClientRect().width,
        background: getComputedStyle(label).backgroundColor,
        qr: label.querySelector("svg.orion-qr").innerHTML,
      })),
      uiVisible: [...document.body.children].filter(
        (e) => e !== sheet && getComputedStyle(e).display !== "none",
      ).length,
    }));
    assert.equal(printMetrics.display, "block");
    assert.equal(printMetrics.uiVisible, 0);
    assert.equal(printMetrics.background, "rgb(255, 255, 255)");
    assert(
      printMetrics.labels.every(
        (l, i) =>
          Math.abs(l.width - (90 * 96) / 25.4) < 1 &&
          l.background === "rgb(255, 255, 255)" &&
          l.qr === paths[i],
      ),
    );
    await page.pdf({
      path: resolve(out, `${size}-receipt-labels.pdf`),
      format: "A4",
      printBackground: true,
    });
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => {
      delete document.body.dataset.orionPrint;
    });
    await labels.getByRole("button", { name: "Fechar", exact: true }).last().click();
    await labels.waitFor({ state: "hidden" });
    await visit("/scanner");
    const scanBefore = await snapshot();
    const identify = async (code) => {
      await page.getByLabel("Digitar ou colar código", { exact: true }).fill(code);
      await page.getByRole("button", { name: "Identificar", exact: true }).click();
    };
    await identify(`orion://v1/box/${created[0].code}`);
    await page.getByText("Caixa identificada · Aguardando destino", { exact: true }).waitFor();
    await identify("orion://v1/location/SUP-A-01-01-02");
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).waitFor();
    assert.deepEqual(await snapshot(), scanBefore);
    await shot("scanner-place-confirm");
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Caixa movimentada com sucesso." }).waitFor();
    const afterPlace = await snapshot();
    assert.equal(
      JSON.parse(afterPlace["orion-storage.boxes.v1"]).boxes.find((b) => b.id === created[0].id)
        .currentLocationId,
      "seed-loc-sup-a-01-01-02",
    );
    await page.getByRole("button", { name: "Movimentar outra caixa", exact: true }).click();
    await identify(`orion://v1/box/${created[0].code}`);
    await page.getByText("Caixa identificada · Aguardando destino", { exact: true }).waitFor();
    await identify("orion://v1/location/SUP-A-01-01-01");
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).waitFor();
    assert.deepEqual(await snapshot(), afterPlace);
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Caixa movimentada com sucesso." }).waitFor();
    const afterMove = await snapshot();
    assert.equal(
      JSON.parse(afterMove["orion-storage.boxes.v1"]).boxes.find((box) => box.id === created[0].id)
        .currentLocationId,
      "seed-loc-sup-a-01-01-01",
    );
    await page.getByRole("button", { name: "Movimentar outra caixa", exact: true }).click();
    await identify(`orion://v1/box/${created[0].code}`);
    await page.getByText("Caixa identificada · Aguardando destino", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Remover da localização", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar remoção", exact: true }).waitFor();
    assert.deepEqual(await snapshot(), afterMove);
    await page.getByRole("button", { name: "Confirmar remoção", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Caixa movimentada com sucesso." }).waitFor();
    const afterRemoval = await snapshot();
    assert(
      !JSON.parse(afterRemoval["orion-storage.boxes.v1"]).boxes.find((b) => b.id === created[0].id)
        .currentLocationId,
    );
    await visit("/movimentacoes");
    await page.getByRole("searchbox").fill(created[0].code);
    assert.equal(await page.locator("main li").count(), 3);
    await shot("movement-history");
    assert.deepEqual(await snapshot(), afterRemoval, "History changed persisted data");
    assert.deepEqual(errors, []);
    results.push({
      size,
      ok: true,
      mapReadOnly: true,
      receiptPreviewReadOnly: true,
      receiptCreated: 2,
      scannerExplicitConfirmation: true,
      placeMoveAndRemove: true,
      printWidthMm: 90,
      qrPreserved: true,
      errors,
    });
    await context.close();
  }
  writeFileSync(
    resolve(out, "operational-results.json"),
    JSON.stringify({ ok: true, port, results }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, port, results }));
} finally {
  await browser.close();
}
