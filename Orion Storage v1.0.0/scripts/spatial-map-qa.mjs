import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port > 1023 && port < 65536);
const out = resolve("screenshots/fase5a", String(port));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  args: ["--enable-unsafe-swiftshader"],
});
const results = [];
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    const accessibility = [];
    const audit = async (name) => {
      const axePath = resolve("screenshots/fase4c5/tooling/node_modules/axe-core/axe.min.js");
      if (!existsSync(axePath)) return;
      if (!(await page.evaluate(() => Boolean(window.axe))))
        await page.addScriptTag({ path: axePath });
      const result = await page.evaluate(() =>
        window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
        }),
      );
      accessibility.push({
        name,
        violations: result.violations,
        incomplete: result.incomplete.map((v) => v.id),
      });
      assert.deepEqual(
        result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        [],
        name,
      );
    };
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const visit = async (route) => {
      await page.goto(`http://127.0.0.1:${port}${route}`);
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
    };
    const shot = async (name, locator = page) =>
      locator.screenshot({
        path: resolve(out, `${width}-${name}.png`),
        fullPage: locator === page,
        caret: "initial",
      });
    const stock = () =>
      page.evaluate(() => [
        localStorage.getItem("orion-storage.boxes.v1"),
        localStorage.getItem("orion-storage.movements.v1"),
      ]);
    const loadSpatial = async () => {
      await page.getByRole("button", { name: "Mapa espacial", exact: true }).click();
      await page.getByRole("button", { name: "Editar layout", exact: true }).waitFor();
    };
    const choose = async (code) =>
      page.getByRole("button", { name: new RegExp(`^${code} ·`) }).click();
    const field = async (name, value) => page.getByLabel(name, { exact: true }).fill(String(value));
    await visit("/mapa");
    const before = await stock();
    await loadSpatial();
    await audit("empty-spatial");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("orion-storage.spatial-layouts.v1")),
      null,
    );
    await page.getByRole("button", { name: "Exemplo interativo", exact: true }).click();
    assert(await page.getByRole("button", { name: "Salvar layout", exact: true }).isDisabled());
    await page.getByRole("button", { name: "Ativar 3D", exact: true }).click();
    await page.locator(".orion-spatial-viewport canvas").waitFor();
    await page.waitForTimeout(700);
    await shot("example-3d", page.locator(".orion-spatial-viewport"));
    await page.getByRole("button", { name: "Vista superior", exact: true }).click();
    await page.waitForTimeout(200);
    await shot("top-3d", page.locator(".orion-spatial-viewport"));
    await choose("E002");
    await page.getByRole("button", { name: "Face B", exact: true }).click();
    await page.getByRole("button", { name: "Visualização frontal", exact: true }).click();
    await page.waitForTimeout(200);
    await shot("front-b-3d", page.locator(".orion-spatial-viewport"));
    for (const name of [
      "Aproximar câmera",
      "Afastar câmera",
      "Centralizar seleção",
      "Restaurar vista",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Cancelar edição", exact: true }).click();
    assert.deepEqual(await stock(), before);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("orion-storage.spatial-layouts.v1")),
      null,
    );
    await page.getByRole("button", { name: "Vista 2D / lista", exact: true }).click();
    await page.getByRole("button", { name: "Editar layout", exact: true }).click();
    await page.getByRole("button", { name: "Adicionar estrutura", exact: true }).click();
    await field("Coordenada X (m)", 4);
    await field("Coordenada Z (m)", 3);
    await field("Face U nível 1: posições", 5);
    await page.getByRole("button", { name: /^Face U nível 1 posição 1,/ }).click();
    await page
      .getByLabel("Vincular endereço existente", { exact: true })
      .selectOption("seed-loc-sup-a-01-01-01");
    await page.getByRole("button", { name: "Salvar layout", exact: true }).click();
    await page
      .getByText("Layout salvo. As posições utilizam o estoque oficial.", { exact: true })
      .waitFor();
    assert.deepEqual(await stock(), before);
    const getLayout = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("orion-storage.spatial-layouts.v1")).layouts[0],
      );
    let stored = await getLayout();
    assert.deepEqual(
      stored.structures[0].faces[0].levels.map((l) => l.slots.length),
      [5, 3, 5],
    );
    const legacy = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("orion-storage.locations.v1")).locations.find(
        (l) => l.id === "seed-loc-sup-a-01-01-01",
      ),
    );
    assert.equal(legacy.code, "SUP-A-01-01-01");
    await page.reload();
    await page.waitForLoadState("networkidle");
    await loadSpatial();
    await choose("E001");
    await page.getByRole("button", { name: /^Face U nível 1 posição 1,/ }).click();
    await page.getByRole("button", { name: "Consultar caixas e produtos", exact: true }).click();
    await page.getByRole("dialog", { name: "SUP-A-01-01-01", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Editar layout", exact: true }).click();
    await field("Código da nova zona", "FIT");
    await field("Nome da nova zona", "Fitas");
    await page.getByRole("button", { name: "Adicionar zona", exact: true }).click();
    await page.getByLabel("Zona", { exact: true }).selectOption({ label: "FIT · Fitas" });
    await field("Código da estrutura", "E010");
    await page.getByRole("button", { name: "Girar 90°", exact: true }).click();
    await page.getByRole("button", { name: "Salvar layout", exact: true }).click();
    await page.getByRole("button", { name: "Editar layout", exact: true }).waitFor();
    stored = await getLayout();
    assert.equal(stored.structures[0].rotation, 90);
    assert.equal(stored.structures[0].faces[0].levels[0].slots[0].locationId, legacy.id);
    assert.deepEqual(await stock(), before);
    // Add double and honeycomb, with asymmetric counts; no implicit stock mutation.
    await page.getByRole("button", { name: "Editar layout", exact: true }).click();
    await page.getByLabel("Nova estrutura", { exact: true }).selectOption("DOUBLE");
    await page.getByRole("button", { name: "Adicionar estrutura", exact: true }).click();
    await field("Coordenada X (m)", 10);
    await field("Coordenada Z (m)", 6);
    await page.getByRole("button", { name: "Face A", exact: true }).click();
    await field("Face A nível 1: posições", 5);
    await page.getByRole("button", { name: "Face B", exact: true }).click();
    await field("Face B nível 2: posições", 2);
    await page.getByLabel("Nova estrutura", { exact: true }).selectOption("HONEYCOMB");
    await page.getByRole("button", { name: "Adicionar estrutura", exact: true }).click();
    await field("Coordenada X (m)", 4);
    await field("Coordenada Z (m)", 9);
    await page.getByRole("button", { name: "Salvar layout", exact: true }).click();
    await page.getByRole("button", { name: "Editar layout", exact: true }).waitFor();
    assert.deepEqual(await stock(), before);
    stored = await getLayout();
    assert.equal(stored.structures.length, 3);
    const double = stored.structures.find((s) => s.kind === "DOUBLE");
    assert.deepEqual(
      double.faces.map((f) => f.levels.map((l) => l.slots.length)),
      [
        [5, 3, 5],
        [4, 2, 5],
      ],
    );
    await choose("E010");
    const dragStructure = async () => {
      await page.getByRole("button", { name: /^Estrutura E010 / }).scrollIntoViewIfNeeded();
      const bounds = await page.getByRole("button", { name: /^Estrutura E010 / }).boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width / 2 + 20, bounds.y + bounds.height / 2 + 10, {
        steps: 4,
      });
      await page.mouse.up();
    };
    await dragStructure();
    assert.deepEqual(await getLayout(), stored, "read-only drag must not write geometry");
    await page.getByRole("button", { name: "Editar layout", exact: true }).click();
    await dragStructure();
    const draggedX = Number(
      await page.getByLabel("Coordenada X (m)", { exact: true }).inputValue(),
    );
    assert.notEqual(draggedX, stored.structures[0].x);
    assert.equal(draggedX % stored.grid, 0, "drag respects snap");
    await audit("layout-editor");
    await field("Coordenada X (m)", 0);
    assert(await page.getByRole("button", { name: "Salvar layout", exact: true }).isDisabled());
    await page.getByText(/fora dos limites da área/).waitFor();
    await page.getByRole("button", { name: "Cancelar edição", exact: true }).click();
    assert.deepEqual(await getLayout(), stored);
    // Destructive change must keep occupied address and require a decision.
    await choose("E010");
    await page.getByRole("button", { name: "Editar layout", exact: true }).click();
    await page.getByRole("button", { name: "Remover estrutura", exact: true }).click();
    await page.getByRole("button", { name: "Salvar layout", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await confirmation.waitFor();
    await audit("removal-confirmation");
    await confirmation
      .getByRole("button", { name: "Confirmar e salvar layout", exact: true })
      .click();
    await confirmation
      .getByRole("alert")
      .filter({ hasText: /ocupada/ })
      .waitFor();
    assert.deepEqual(await getLayout(), stored);
    assert.deepEqual(await stock(), before);
    await confirmation.getByRole("button", { name: "Voltar ao editor", exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "spatial-save-layout");
    await page.getByRole("button", { name: "Cancelar edição", exact: true }).click();
    await choose(double.code);
    await page.getByRole("button", { name: "Face B", exact: true }).click();
    await page.getByRole("button", { name: /^Face B nível 1 posição 1,/ }).click();
    await page.getByRole("button", { name: "Etiqueta da posição", exact: true }).click();
    const label = page.getByRole("dialog", { name: "Sinalização da posição" });
    await label.waitFor();
    await shot("new-location-label");
    assert(await label.locator("svg.orion-qr").count());
    const destinationId = double.faces.find((f) => f.code === "B").levels[0].slots[0].locationId;
    const destination = await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("orion-storage.locations.v1")).locations.find(
          (l) => l.id === id,
        ),
      destinationId,
    );
    const png = await label.locator("svg.orion-qr").screenshot({ caret: "initial" });
    await page.addScriptTag({ path: resolve("node_modules/html5-qrcode/html5-qrcode.min.js") });
    const decoded = await page.evaluate(async (bytes) => {
      const host = document.createElement("div");
      host.id = "qa-spatial-qr";
      host.style.cssText = "position:fixed;left:-10000px;width:400px";
      document.body.append(host);
      const reader = new window.Html5Qrcode(host.id, false);
      try {
        const blob = await (await fetch(`data:image/png;base64,${bytes}`)).blob();
        return await reader.scanFile(new File([blob], "qr.png", { type: "image/png" }), false);
      } finally {
        reader.clear();
        host.remove();
      }
    }, png.toString("base64"));
    assert.equal(decoded, `orion://v1/location/${destination.qrCode}`);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ativar 3D", exact: true }).click();
    await page.locator(".orion-spatial-viewport canvas").waitFor();
    await page.waitForTimeout(300);
    await shot("saved-3d", page.locator(".orion-spatial-viewport"));
    await page.getByRole("button", { name: "Vista 2D / lista", exact: true }).click();
    await shot("saved-2d");
    await audit("saved-spatial");
    assert.equal(
      await page
        .getByText("Visualização gráfica indisponível. Use a alternativa 2D.", { exact: true })
        .count(),
      0,
      "normal exit must not report context loss",
    );
    assert(
      !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
      "horizontal overflow",
    );
    assert.deepEqual(errors, []);
    // Stable QR reaches the existing scanner; only its explicit confirmation moves a real box.
    await visit("/scanner");
    const beforeScan = await stock();
    const identify = async (value) => {
      await page.getByLabel("Digitar ou colar código", { exact: true }).fill(value);
      await page.getByRole("button", { name: "Identificar", exact: true }).click();
    };
    await identify("orion://v1/box/CX-20261006-000004");
    await page.getByText("Caixa identificada · Aguardando destino", { exact: true }).waitFor();
    await identify(decoded);
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).waitFor();
    assert.deepEqual(await stock(), beforeScan);
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Caixa movimentada com sucesso." }).waitFor();
    const moved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("orion-storage.boxes.v1")).boxes.find(
        (b) => b.code === "CX-20261006-000004",
      ),
    );
    assert.equal(moved.currentLocationId, destinationId);
    await visit("/mapa");
    await loadSpatial();
    await page.getByLabel("Buscar no mapa", { exact: true }).fill("Pinole");
    const search = page.getByRole("region", { name: "Busca no mapa" });
    const resultsButtons = search.getByRole("button", { name: new RegExp(`^${destination.code}`) });
    await resultsButtons.click();
    await page.getByRole("button", { name: /^Face B nível 1 posição 1,/ }).waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Face B", exact: true }).getAttribute("aria-pressed"),
      "true",
    );
    await page.getByRole("button", { name: "Consultar caixas e produtos", exact: true }).click();
    await page.getByRole("dialog", { name: destination.code, exact: true }).waitFor();
    await page.getByRole("dialog").getByText("CX-20261006-000004", { exact: true }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(
      await search.getByRole("button", { name: /^SUP-A-01-02-01/ }).count(),
      1,
      "all product occurrences must remain visible",
    );
    await shot("product-located");
    assert.deepEqual(errors, []);
    writeFileSync(
      resolve(out, `${width}-accessibility.json`),
      JSON.stringify(accessibility, null, 2),
    );
    results.push({
      width,
      ok: true,
      realWebGL: true,
      exampleNotPersisted: true,
      legacyBound: true,
      asymmetricFaces: true,
      reloaded: true,
      invalidSaveBlocked: true,
      occupiedRemovalBlocked: true,
      qrPreview: true,
      stockPreserved: true,
      stableQrDecoded: true,
      scannerConfirmed: true,
      productMultipleLocations: true,
    });
    await context.close();
  }
  // Unsupported WebGL must never block layout or stock operations.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).startsWith("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/mapa`);
  await page.getByRole("button", { name: "Mapa espacial", exact: true }).click();
  await page.getByRole("button", { name: "Editar layout", exact: true }).waitFor();
  await page.getByRole("button", { name: "Ativar 3D", exact: true }).click();
  await page.getByText(/WebGL indisponível/).waitFor();
  assert.equal(await page.locator(".orion-spatial-viewport canvas").count(), 0);
  await page.screenshot({
    path: resolve(out, "mobile-fallback.png"),
    fullPage: true,
    caret: "initial",
  });
  await context.close();
  writeFileSync(
    resolve(out, "spatial-results.json"),
    JSON.stringify({ ok: true, port, results, fallback: true }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, port, results, fallback: true }));
} finally {
  await browser.close();
}
