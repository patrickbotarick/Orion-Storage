import { describe, expect, it } from "vitest";

import { buildDuplicateInput } from "./duplicate";
import { suggestInternalCode } from "./internal-code";
import type { Product } from "./product";

const source: Product = {
  id: "prod-real-azul-35",
  internalCode: "REAL-AZUL-035-045-020",
  name: "Azul 35 mm",
  category: "Fita de borda",
  brand: "Real",
  status: "ACTIVE",
  colorName: "Azul",
  widthMm: 35,
  thicknessMm: 0.45,
  rollLengthM: 20,
  rollsPerBox: 10,
  totalLengthPerBoxM: 200,
  createdAt: "2026-10-06T15:00:00.000Z",
  updatedAt: "2026-10-06T15:00:00.000Z",
};

describe("duplicação de produto", () => {
  it("copia os atributos e recalcula o código sem reutilizar o id", () => {
    const copy = buildDuplicateInput(source);
    expect(copy).not.toHaveProperty("id");
    expect(copy.name).toBe(source.name);
    expect(copy.brand).toBe("Real");
    expect(copy.widthMm).toBe(35);
    expect(copy.internalCode).toBe("REAL-AZUL-035-045-020");
  });

  it("recalcula o código quando a variação muda a largura", () => {
    const copy = buildDuplicateInput(source);
    const variant = { ...copy, widthMm: 64 };
    variant.internalCode = suggestInternalCode(variant);
    expect(variant.internalCode).toBe("REAL-AZUL-064-045-020");
    expect(variant.internalCode).not.toBe(source.internalCode);
  });
});
