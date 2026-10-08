import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const out = resolve("screenshots", "fase4c2", String(port));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const routes = [
  ["Produtos", "/"],
  ["Caixas", "/caixas"],
  ["Endereçamento", "/enderecamento"],
  ["Scanner", "/scanner"],
  ["Movimentações", "/movimentacoes"],
  ["Recebimentos", "/recebimentos"],
  ["Mapa", "/mapa"],
  ["Inventários", "/inventarios"],
];
const results = [];
try {
  for (const [name, width] of [
    ["desktop", 1280],
    ["mobile", 390],
    ["narrow", 320],
    ["tablet", 768],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").textContent(), "Pular para o conteúdo");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(":focus").getAttribute("id"), "conteudo-principal");
    const mobile = width < 768;
    if (mobile) {
      const trigger = page.getByRole("button", { name: "Abrir navegação" });
      await trigger.click();
      await page.getByRole("dialog", { name: "Navegação" }).waitFor();
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        assert(
          await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))),
          "Focus escaped drawer",
        );
      }
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      assert(
        await trigger.evaluate((element) => element === document.activeElement),
        "Trigger focus was not restored",
      );
    }
    for (const [label, route] of routes) {
      if (mobile) await page.getByRole("button", { name: "Abrir navegação" }).click();
      const nav = page.locator('nav[aria-label="Seções"]:visible');
      await nav.getByRole("link", { name: label, exact: true }).click();
      await page.waitForURL((url) => url.pathname === route && !url.hash);
      await page.getByRole("heading", { name: label, level: 1, exact: true }).waitFor();
      await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
      if (mobile) {
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page.getByRole("button", { name: "Abrir navegação" }).click();
      }
      const active = page.locator('nav:visible a[aria-current="page"]');
      assert.equal(await active.count(), 1);
      assert.equal((await active.textContent()).trim(), label);
      if (mobile) {
        if (label === "Scanner")
          await page.screenshot({ path: resolve(out, `${name}-menu.png`), caret: "initial" });
        await page.getByRole("button", { name: "Fechar navegação" }).click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      }
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${name}/${route} overflow`,
      );
    }
    await page.goBack();
    await page.getByRole("heading", { name: "Mapa", level: 1, exact: true }).waitFor();
    await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
    await page.screenshot({
      path: resolve(out, `${name}-navigation.png`),
      fullPage: true,
      caret: "initial",
    });
    if (mobile) {
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      await page.getByRole("button", { name: "Abrir navegação" }).click();
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        "Menu overflows with enlarged text",
      );
      for (const link of await page.locator("nav:visible a").all()) {
        assert(
          await link.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
          "Menu label overflows",
        );
      }
      await page.setViewportSize({ width: 1024, height: 844 });
      await page.getByRole("dialog").waitFor({ state: "hidden" });
    }
    assert.deepEqual(errors, []);
    results.push({
      name,
      width,
      routes: 8,
      skipLink: true,
      backNavigation: true,
      focusTrap: mobile,
      errors,
    });
    await context.close();
  }
  writeFileSync(
    resolve(out, "shell-results.json"),
    JSON.stringify({ ok: true, port, results }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, port, results }));
} finally {
  await browser.close();
}
