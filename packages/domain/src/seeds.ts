import { suggestInternalCode } from "./internal-code";
import type { Product, ProductInput } from "./product";

const SEEDED_AT = "2026-10-06T15:00:00.000Z";

/**
 * Demonstration catalog from confirmed label data only.
 * Unconfirmed manufacturer, supplier, thickness or color-code fields are omitted.
 */
export function demoProducts(): Product[] {
  return [proadecClassic(), realRehauPinole()];
}

function proadecClassic(): Product {
  const input: ProductInput = {
    internalCode: "",
    name: "Classic Branco 1101 TX",
    category: "Fita de borda",
    brand: "Proadec",
    line: "Classic",
    status: "ACTIVE",
    colorName: "Branco 1101 TX",
    widthMm: 35,
    rollLengthM: 20,
    rollsPerBox: 10,
    totalLengthPerBoxM: 200,
  };
  input.internalCode = suggestInternalCode(input);
  return stamp("seed-proadec-classic-branco-1101", input);
}

function realRehauPinole(): Product {
  const input: ProductInput = {
    internalCode: "",
    name: "Pinole Essencial Duratex",
    category: "Fita de borda",
    brand: "Real/Rehau",
    status: "ACTIVE",
    colorName: "Pinole",
    widthMm: 22,
    thicknessMm: 0.4,
    rollLengthM: 20,
    rollsPerBox: 15,
    totalLengthPerBoxM: 300,
  };
  input.internalCode = suggestInternalCode(input);
  return stamp("seed-real-rehau-pinole", input);
}

function stamp(id: string, input: ProductInput): Product {
  return {
    ...input,
    id,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
}
