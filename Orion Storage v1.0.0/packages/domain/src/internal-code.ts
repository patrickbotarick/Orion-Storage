import { normalizeDisplay, normalizeInternalCode, toCodeToken } from "./normalize";

export type InternalCodeSource = {
  name?: string | null;
  brand?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  widthMm?: number | null;
  thicknessMm?: number | null;
  rollLengthM?: number | null;
};

/**
 * Suggested internal code.
 *
 * Segments, joined by "-", omitted when absent:
 * 1. brand
 * 2. color name, or color code when the name is empty
 * 3. width in whole millimeters, at least 3 digits (35 → 035)
 * 4. thickness in hundredths of a millimeter, at least 3 digits (0.45 → 045)
 * 5. roll length in whole meters, at least 3 digits (20 → 020)
 *
 * Line, supplier and category are not part of the code.
 * If no segment exists, the product name is used.
 * The result is uppercase ASCII without spaces or accents.
 * Manual codes are normalized with the same character rules and are not overwritten
 * unless the caller asks for a new suggestion.
 */
export function suggestInternalCode(source: InternalCodeSource): string {
  const parts: string[] = [];
  const brand = toCodeToken(source.brand);
  if (brand) parts.push(brand);

  const color = toCodeToken(source.colorName) || toCodeToken(source.colorCode);
  if (color) parts.push(color);

  const width = measureToken(source.widthMm, 0);
  if (width) parts.push(width);

  const thickness = measureToken(source.thicknessMm, 2);
  if (thickness) parts.push(thickness);

  const length = measureToken(source.rollLengthM, 0);
  if (length) parts.push(length);

  if (parts.length === 0) {
    const name = toCodeToken(source.name);
    if (name) parts.push(name);
  }

  return normalizeInternalCode(parts.join("-")).slice(0, 80);
}

function measureToken(value: number | null | undefined, decimalPlaces: number): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
  const factor = 10 ** decimalPlaces;
  const rounded = Math.round((value + Number.EPSILON) * factor);
  if (!Number.isFinite(rounded) || rounded <= 0) return "";
  return String(rounded).padStart(3, "0");
}

export function hasManualCode(value: string | null | undefined): boolean {
  return normalizeDisplay(value) != null;
}
