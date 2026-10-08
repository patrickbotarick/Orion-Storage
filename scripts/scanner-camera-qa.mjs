import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
// Canvas video drives the actual decoder and SCAN handler; no physical camera is opened.
const port = Number(process.argv[2] ?? 8091);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
const out = resolve("screenshots/fase4c5", String(port));
mkdirSync(out, { recursive: true });
const qrReport = JSON.parse(readFileSync(resolve(out, "qr-print-results.json"), "utf8"));
const boxQr = readFileSync(resolve(out, "390-box-qr.svg")).toString("base64");
const locationQr = readFileSync(resolve(out, "390-location-qr.svg")).toString("base64");
const boxPayload = qrReport.results
  .find((r) => r.width === 390)
  .decoded.find((r) => r.kind === "box").value;
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
const results = [];
try {
  for (const width of [390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await context.addInitScript(
      ({ boxQr }) => {
        window.__qaCameraImage = "data:image/svg+xml;base64," + boxQr;
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
          configurable: true,
          value: async () => {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const drawing = canvas.getContext("2d");
            const img = new Image();
            let last = "";
            const stream = canvas.captureStream(8);
            const paint = setInterval(() => {
              if (stream.getVideoTracks().every((track) => track.readyState === "ended")) {
                clearInterval(paint);
                return;
              }
              if (last !== window.__qaCameraImage) {
                last = window.__qaCameraImage;
                img.src = last;
              }
              drawing.fillStyle = "white";
              drawing.fillRect(0, 0, 640, 480);
              if (img.complete && img.naturalWidth) {
                drawing.imageSmoothingEnabled = false;
                drawing.drawImage(img, 160, 80, 320, 320);
              }
            }, 100);
            return stream;
          },
        });
      },
      { boxQr },
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/scanner`);
    await page.waitForLoadState("networkidle");
    const snapshot = () =>
      page.evaluate(() => ({
        boxes: localStorage.getItem("orion-storage.boxes.v1"),
        movements: localStorage.getItem("orion-storage.movements.v1"),
      }));
    const before = await snapshot();
    await page.getByRole("button", { name: "Usar câmera", exact: true }).click();
    await page.getByRole("button", { name: "Parar câmera", exact: true }).waitFor();
    await page
      .getByText("Caixa identificada · Aguardando destino", { exact: true })
      .waitFor({ timeout: 20000 });
    await page.evaluate((locationQr) => {
      window.__qaCameraImage = "data:image/svg+xml;base64," + locationQr;
    }, locationQr);
    await page
      .getByRole("button", { name: "Confirmar movimentação", exact: true })
      .waitFor({ timeout: 20000 })
      .catch(async (error) => {
        await page.screenshot({
          path: resolve(out, `${width}-camera-diagnostic.png`),
          fullPage: true,
          caret: "initial",
        });
        console.log(await page.locator("main").innerText());
        throw error;
      });
    assert.deepEqual(await snapshot(), before);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({
      path: resolve(out, `${width}-camera-live-confirm.png`),
      fullPage: true,
      caret: "initial",
    });
    await page.getByRole("button", { name: "Confirmar movimentação", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Caixa movimentada com sucesso." }).waitFor();
    await page.getByRole("button", { name: "Usar câmera", exact: true }).waitFor();
    const after = await snapshot();
    assert.notEqual(after.boxes, before.boxes);
    const envelope = JSON.parse(after.movements);
    const events = envelope.movements;
    assert(Array.isArray(events));
    assert.equal(events.length, 1);
    assert.equal(events[0].source, "SCAN");
    assert.equal(
      events[0].boxId,
      JSON.parse(before.boxes).boxes.find((box) => box.code === boxPayload.split("/").at(-1)).id,
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      ok: true,
      realDecoderWithCanvasVideo: true,
      noWriteBeforeConfirmation: true,
      source: "SCAN",
      cameraReleased: true,
    });
    await context.close();
  }
  writeFileSync(
    resolve(out, "camera-results.json"),
    JSON.stringify({ ok: true, port, results }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, port, results }));
} finally {
  await browser.close();
}
