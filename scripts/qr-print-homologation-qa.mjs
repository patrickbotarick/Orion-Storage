import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const out = resolve("screenshots/fase4c5", String(port));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const results = [];
// Vite watches SVG files: save fixtures after browser checks so evidence cannot reload the page.
const svgEvidence = [];
try {
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const visit = async (route) => {
      await page.goto(`http://127.0.0.1:${port}${route}`);
      await page.waitForLoadState("networkidle");
      await page.waitForFunction(() => !document.body.innerText.includes("Carregando"));
    };
    const shot = (name) =>
      page.screenshot({
        path: resolve(out, `${width}-${name}.png`),
        fullPage: true,
        caret: "initial",
      });
    await visit("/caixas");
    const original = await page.evaluate(() => ({
      boxes: localStorage.getItem("orion-storage.boxes.v1"),
      movements: localStorage.getItem("orion-storage.movements.v1"),
    }));
    const samples = [];
    for (const [route, title, kind, labelClass, mm] of [
      ["/caixas", "Etiqueta da caixa", "box", ".orion-label-box", 90],
      ["/enderecamento", "Sinalização do endereço", "location", ".orion-label-location", 100],
    ]) {
      await visit(route);
      await page.getByRole("button", { name: "Etiqueta", exact: true }).first().click();
      const dialog = page.getByRole("dialog", { name: title });
      await dialog.waitFor();
      const label = dialog.locator(labelClass);
      const code = await label
        .locator(kind === "box" ? ".orion-code" : ".orion-address")
        .textContent();
      const qr = await label
        .locator("svg.orion-qr")
        .screenshot({ path: resolve(out, `${width}-${kind}-qr.png`), caret: "initial" });
      svgEvidence.push({
        path: resolve(out, `${width}-${kind}-qr.svg`),
        svg: await label
          .locator("svg.orion-qr")
          .evaluate((node) => new XMLSerializer().serializeToString(node)),
      });
      samples.push({ kind, code: code.trim(), png: qr.toString("base64") });
      await shot(`${kind}-label-preview`);
      await page.emulateMedia({ media: "print" });
      await page.evaluate(() => {
        document.body.dataset.orionPrint = "label";
      });
      const metrics = await page.locator(".orion-print-sheet " + labelClass).evaluate((e) => ({
        width: e.getBoundingClientRect().width,
        bg: getComputedStyle(e).backgroundColor,
        fg: getComputedStyle(e).color,
      }));
      assert(Math.abs(metrics.width - (mm * 96) / 25.4) < 1);
      assert.equal(metrics.bg, "rgb(255, 255, 255)");
      await page.pdf({
        path: resolve(out, `${width}-${kind}-label.pdf`),
        format: "A4",
        printBackground: true,
      });
      await page.emulateMedia({ media: "screen" });
      await page.evaluate(() => {
        delete document.body.dataset.orionPrint;
      });
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
    // Decode the pixels actually rendered by the existing label component with its scanner library.
    await page.addScriptTag({ path: resolve("node_modules/html5-qrcode/html5-qrcode.min.js") });
    const decoded = await page.evaluate(async (samples) => {
      const host = document.createElement("div");
      host.id = "qa-qr-reader";
      host.style.cssText = "position:fixed;left:-10000px;top:0;width:480px;";
      document.body.append(host);
      const scanner = new window.Html5Qrcode(host.id, false);
      const values = [];
      try {
        for (const sample of samples) {
          const bytes = Uint8Array.from(atob(sample.png), (c) => c.charCodeAt(0));
          const value = await scanner.scanFile(
            new File([bytes], sample.kind + ".png", { type: "image/png" }),
            false,
          );
          values.push({ kind: sample.kind, value });
        }
      } finally {
        scanner.clear();
        host.remove();
      }
      return values;
    }, samples);
    for (const sample of samples)
      assert.equal(
        decoded.find((d) => d.kind === sample.kind).value,
        `orion://v1/${sample.kind}/${sample.code}`,
      );
    await visit("/scanner");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          await new Promise((resolve) => {
            window.__qaReleaseCamera = resolve;
          });
          throw new DOMException("Permission denied", "NotAllowedError");
        },
      });
    });
    await page.getByRole("button", { name: "Usar câmera", exact: true }).click();
    const starting = page.getByRole("button", { name: "Abrindo câmera…", exact: true });
    await starting.waitFor();
    assert(await starting.isDisabled());
    assert.equal(await starting.getAttribute("aria-busy"), "true");
    assert.equal(
      await starting
        .locator(".animate-spin")
        .evaluate((node) => getComputedStyle(node).animationName),
      "none",
    );
    await page.waitForFunction(() => typeof window.__qaReleaseCamera === "function");
    await page.evaluate(() => window.__qaReleaseCamera());
    await page.getByRole("alert").filter({ hasText: "Permissão da câmera negada." }).waitFor();
    assert(await page.getByLabel("Digitar ou colar código", { exact: true }).isEnabled());
    await shot("camera-denied");
    await page.evaluate(() =>
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("No device", "NotFoundError");
        },
      }),
    );
    await page.getByRole("button", { name: "Usar câmera", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Nenhuma câmera disponível." }).waitFor();
    await shot("camera-missing");
    const after = await page.evaluate(() => ({
      boxes: localStorage.getItem("orion-storage.boxes.v1"),
      movements: localStorage.getItem("orion-storage.movements.v1"),
    }));
    assert.deepEqual(after, original);
    assert.deepEqual(errors, []);
    results.push({
      width,
      decoded,
      boxWidthMm: 90,
      locationWidthMm: 100,
      cameraDeniedFeedback: true,
      cameraMissingFeedback: true,
      reducedMotion: true,
      loadingBlocked: true,
      manualAvailable: true,
      stockPreserved: true,
    });
    await context.close();
  }
  for (const evidence of svgEvidence) writeFileSync(evidence.path, evidence.svg);
  writeFileSync(
    resolve(out, "qr-print-results.json"),
    JSON.stringify({ ok: true, port, results }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, port, results }));
} finally {
  await browser.close();
}
