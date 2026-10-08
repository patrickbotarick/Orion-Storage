import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Read the actual CSS so changes to semantic colors are checked without a second palette.
const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = new Map(
  [...css.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
);
function color(name, seen = new Set()) {
  assert(!seen.has(name), `Circular token: ${name}`);
  seen.add(name);
  const value = tokens.get(`--color-${name}`);
  assert(value, `Missing token: ${name}`);
  const alias = value.match(/^var\(--color-([\w-]+)\)$/);
  if (alias) return color(alias[1], seen);
  assert(/^#[\da-f]{6}$/i.test(value), `Unsupported color: ${name} = ${value}`);
  return value;
}
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
const pairs = [
  ["ink", "surface", 4.5],
  ["ink", "bg", 4.5],
  ["muted", "surface", 4.5],
  ["muted", "bg", 4.5],
  ["accent-fg", "accent", 4.5],
  ["accent-fg", "accent-hover", 4.5],
  ["on-ink", "sidebar", 4.5],
  ["on-ink-muted", "sidebar", 4.5],
  ["selected-fg", "selected", 4.5],
  ["disabled", "disabled-bg", 4.5],
  ["control-border", "surface", 3],
  ["control-border", "bg", 3],
  ["focus", "surface", 3],
  ["focus-on-dark", "sidebar", 3],
  ...["success", "warning", "danger", "info"].flatMap((status) => [
    [status, `${status}-bg`, 4.5],
    [status, "surface", 4.5],
    [`${status}-border`, `${status}-bg`, 3],
  ]),
];
const results = pairs.map(([foreground, background, minimum]) => {
  const a = luminance(color(foreground));
  const b = luminance(color(background));
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert(ratio >= minimum, `${foreground}/${background}: ${ratio.toFixed(2)} < ${minimum}`);
  return { foreground, background, ratio: Number(ratio.toFixed(2)), minimum };
});
console.log(JSON.stringify({ ok: true, pairs: results }, null, 2));
