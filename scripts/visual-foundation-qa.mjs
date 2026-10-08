import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

// Read-only render checks in disposable profiles; no operator storage is opened.
const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535, "Invalid local port");
const phase = process.argv[3] ?? "fase4c1";
assert(/^[a-z0-9-]+$/.test(phase), "Invalid evidence folder");
const out = resolve("screenshots", phase, String(port));
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
    for (const route of [
      "/",
      "/caixas",
      "/enderecamento",
      "/movimentacoes",
      "/mapa",
      "/scanner",
      "/recebimentos",
      "/inventarios",
    ]) {
      await page.goto(`http://127.0.0.1:${port}${route}`);
      await page.locator("h1").waitFor();
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(async () => {
        await document.fonts.load('500 14px "IBM Plex Mono"');
        const loaded = (name) =>
          [...document.fonts].some(
            (font) => font.family.replaceAll('"', "") === name && font.status === "loaded",
          );
        return {
          text: document.querySelector("h1").textContent,
          bodyFont: getComputedStyle(document.body).fontFamily,
          manrope: loaded("Manrope"),
          mono: loaded("IBM Plex Mono"),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          background: getComputedStyle(document.body).backgroundColor,
        };
      });
      assert(metrics.text.trim(), `${route}: blank heading`);
      assert(metrics.manrope && metrics.mono, `${route}: fonts did not load`);
      assert(metrics.bodyFont.includes("Manrope"), `${route}: wrong interface font`);
      assert.equal(metrics.background, "rgb(245, 247, 249)");
      assert(!metrics.overflow, `${route}: horizontal overflow`);
      await page.screenshot({
        caret: "initial",
        path: resolve(out, `${size}-${route === "/" ? "produtos" : route.slice(1)}.png`),
        fullPage: true,
      });
      if (route === "/") {
        await page.keyboard.press("Tab");
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          const style = getComputedStyle(element);
          return {
            tag: element.tagName,
            width: style.outlineWidth,
            style: style.outlineStyle,
            offset: style.outlineOffset,
          };
        });
        assert.equal(focus.width, "3px");
        assert.equal(focus.style, "solid");
        assert.equal(focus.offset, "3px");
        await page.screenshot({ path: resolve(out, `${size}-foco.png`), caret: "initial" });
      }
      results.push({ size, route, ...metrics });
    }
    // Double the root font preference: rem-based controls must remain readable and fit.
    await page.goto(`http://127.0.0.1:${port}/scanner`);
    await page.locator("h1").waitFor();
    await page.waitForLoadState("networkidle");
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    const zoom = await page.evaluate(() => ({
      size: getComputedStyle(document.body).fontSize,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    assert.equal(zoom.size, "28px");
    assert(!zoom.overflow, "Scanner overflows at 200% font preference");
    await page.screenshot({
      path: resolve(out, `${size}-scanner-200.png`),
      fullPage: true,
      caret: "initial",
    });
    assert.deepEqual(errors, [], `${size}: browser errors`);
    results.push({ size, zoom, errors });
    await context.close();
  }
  writeFileSync(
    resolve(out, "resultado.json"),
    JSON.stringify({ ok: true, port, results }, null, 2),
  );
  console.log(
    JSON.stringify({
      ok: true,
      port,
      routes: 16,
      fonts: "loaded",
      focus: "3px",
      fontPreference: "200%",
    }),
  );
} finally {
  await browser.close();
}
