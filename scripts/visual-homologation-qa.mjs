import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

// npm install --prefix screenshots/fase4c5/tooling --no-package-lock --ignore-scripts axe-core@4.11.4
// The audit tool is isolated from application dependencies and production data.
const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const axePath = resolve(
  process.argv[3] ?? "screenshots/fase4c5/tooling/node_modules/axe-core/axe.min.js",
);
const out = resolve("screenshots/fase4c5", String(port));
mkdirSync(out, { recursive: true });
const routes = [
  "/",
  "/caixas",
  "/enderecamento",
  "/movimentacoes",
  "/mapa",
  "/scanner",
  "/recebimentos",
  "/inventarios",
];
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const results = [];
const failures = [];
try {
  for (const width of [1280, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
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
      await page.evaluate(() => document.fonts.ready);
    };
    const audit = async (state) => {
      await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: axePath });
      const report = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
          },
        });
        return {
          version: r.testEngine.version,
          violations: r.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            url: v.helpUrl,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          })),
          incomplete: r.incomplete.map((v) => ({ id: v.id, count: v.nodes.length })),
        };
      });
      const dialog = page.getByRole("dialog");
      if (await dialog.count()) {
        const enlarged = await page.addStyleTag({ content: "html {font-size:200%;}" });
        const fit = await dialog.first().evaluate((e) => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          internal: e.scrollWidth > e.clientWidth + 1,
        }));
        if (fit.overflow || fit.internal)
          failures.push({ width, state: state + ":modal-200", fit });
        await enlarged.evaluate((e) => e.remove());
      }
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        smallTargets: [
          ...document.querySelectorAll(
            "main button,main input:not([type=checkbox]):not([type=radio]),main select,[role=dialog] button",
          ),
        ]
          .filter((e) => e.getClientRects().length && !e.disabled)
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width < 24 || r.height < 24;
          })
          .map((e) => ({ text: e.textContent.trim().slice(0, 60), id: e.id })),
      }));
      results.push({ width, state, ...report, ...metrics });
      if (report.violations.length || metrics.overflow || metrics.smallTargets.length)
        failures.push({ width, state, violations: report.violations, metrics });
    };
    for (const route of routes) {
      await visit(route);
      await audit(route);
      // Traverse real tab order, checking visible focus and overlap by author content.
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press("Tab");
        const focus = await page.evaluate(() => {
          const e = document.activeElement;
          if (e === document.body) return { ok: true };
          const s = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          const x = Math.min(innerWidth - 1, Math.max(1, r.left + r.width / 2));
          const y = Math.min(innerHeight - 1, Math.max(1, r.top + r.height / 2));
          const hit = document.elementFromPoint(x, y);
          return {
            ok:
              s.outlineStyle !== "none" &&
              parseFloat(s.outlineWidth) >= 3 &&
              r.bottom > 0 &&
              r.top < innerHeight &&
              r.right > 0 &&
              r.left < innerWidth &&
              (e === hit || e.contains(hit) || hit?.contains(e)),
            text: e.textContent.trim().slice(0, 70),
            tag: e.tagName,
            id: e.id,
            type: e.type,
            outline: s.outlineStyle,
            outlineWidth: s.outlineWidth,
            hit: hit?.tagName,
          };
        });
        if (!focus.ok) failures.push({ width, state: route, focus });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const normal = await page.screenshot({
        path: resolve(out, `${width}-${route === "/" ? "produtos" : route.slice(1)}.png`),
        fullPage: true,
        caret: "initial",
      });
      assert(normal.length > 0);
      // Resize text and apply WCAG text-spacing values without hiding content.
      const zoomStyle = await page.addStyleTag({ content: "html { font-size:200%; }" });
      await audit(`${route}:text-200`);
      if (width === 320 || width === 768)
        await page.screenshot({
          path: resolve(
            out,
            `${width}-${route === "/" ? "produtos" : route.slice(1)}-text-200.png`,
          ),
          fullPage: true,
          caret: "initial",
        });
      await zoomStyle.evaluate((e) => e.remove());
      const spacing = await page.addStyleTag({
        content:
          "main * { line-height:1.5 !important; letter-spacing:0.12em !important; word-spacing:0.16em !important; } main p { margin-bottom:2em !important; }",
      });
      await audit(`${route}:text-spacing`);
      await spacing.evaluate((e) => e.remove());
    }
    if (width === 1280 || width === 320) {
      await visit("/");
      await page.getByRole("button", { name: "Novo produto", exact: true }).click();
      const product = page.getByRole("dialog", { name: "Novo produto" });
      await product.waitFor();
      await audit("product-modal");
      await product.getByRole("button", { name: "Salvar produto", exact: true }).click();
      await audit("product-errors");
      await page.keyboard.press("Escape");
      await visit("/caixas");
      await page.getByRole("button", { name: "Nova caixa", exact: true }).click();
      const box = page.getByRole("dialog", { name: "Nova caixa" });
      await box.waitFor();
      await audit("box-modal");
      await box.getByRole("button", { name: "Registrar caixa", exact: true }).click();
      await audit("box-errors");
      await page.keyboard.press("Escape");
      await visit("/enderecamento");
      await page.getByRole("button", { name: "Novo endereço", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      await audit("location-modal");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Nova área", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      await audit("area-modal");
      await page.keyboard.press("Escape");
      await visit("/mapa");
      await page.locator("button.orion-map-cell").first().click();
      await page.getByRole("dialog").waitFor();
      await audit("map-detail");
      await page.keyboard.press("Escape");
      await visit("/recebimentos");
      await page.getByRole("button", { name: "+ Novo recebimento", exact: true }).click();
      await audit("receipt-form");
      await page.getByRole("button", { name: "Gerar prévia", exact: true }).click();
      await audit("receipt-errors");
      await visit("/inventarios");
      const inventoryStock = await page.evaluate(() => [
        localStorage.getItem("orion-storage.boxes.v1"),
        localStorage.getItem("orion-storage.movements.v1"),
      ]);
      await page.getByRole("button", { name: "Novo inventário", exact: true }).click();
      await audit("inventory-create");
      await page.getByLabel("Tipo de escopo", { exact: true }).selectOption("LOCATION");
      await page.getByLabel("Posição", { exact: true }).selectOption("seed-loc-sup-a-01-01-01");
      await page.getByRole("button", { name: "Iniciar inventário", exact: true }).click();
      await page.getByRole("button", { name: "Revisar inventário", exact: true }).waitFor();
      await audit("inventory-active");
      await page
        .getByLabel("Digitar ou colar código", { exact: true })
        .fill("orion://v1/box/CX-20261006-000001");
      await page.getByRole("button", { name: "Registrar leitura", exact: true }).click();
      await audit("inventory-counted");
      await page.getByRole("button", { name: "Revisar inventário", exact: true }).click();
      await audit("inventory-review");
      await page.getByRole("button", { name: "Finalizar inventário", exact: true }).click();
      await page.getByText("Sessão encerrada.", { exact: false }).waitFor();
      await audit("inventory-complete");
      assert.deepEqual(
        await page.evaluate(() => [
          localStorage.getItem("orion-storage.boxes.v1"),
          localStorage.getItem("orion-storage.movements.v1"),
        ]),
        inventoryStock,
      );
      if (width === 320) {
        await visit("/scanner");
        await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
        await page.getByRole("dialog", { name: "Navegação" }).waitFor();
        await audit("mobile-menu");
        await page.keyboard.press("Escape");
      }
    }
    if (errors.length) failures.push({ width, errors });
    await context.close();
    console.log(
      JSON.stringify({
        width,
        states: results.filter((r) => r.width === width).length,
        failures: failures.filter((r) => r.width === width).length,
      }),
    );
  }
  writeFileSync(
    resolve(out, "homologation-results.json"),
    JSON.stringify({ ok: failures.length === 0, port, results, failures }, null, 2),
  );
  console.log(JSON.stringify({ ok: failures.length === 0, states: results.length, failures }));
  assert.equal(failures.length, 0, "Visual/accessibility audit failed; see results JSON");
} finally {
  await browser.close();
}
