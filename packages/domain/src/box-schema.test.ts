import { describe, expect, it } from "vitest";

import { assertValidBoxCreate, validateBoxCreateForm } from "./box-schema";
import { BoxValidationError } from "./errors";

const base = {
  productId: "product-1",
  rollsQuantity: "10",
  totalLengthM: "200",
  manufacturerBatch: "",
  receivedAt: "2026-10-06",
  notes: "",
};

describe("validação da caixa", () => {
  it("aceita lote vazio e lote alfanumérico", () => {
    const withoutBatch = validateBoxCreateForm(base);
    expect(withoutBatch.ok).toBe(true);
    if (withoutBatch.ok) expect(withoutBatch.input.manufacturerBatch).toBeUndefined();

    const withBatch = validateBoxCreateForm({ ...base, manufacturerBatch: " Lote 12-A/2026 " });
    expect(withBatch.ok).toBe(true);
    if (withBatch.ok) expect(withBatch.input.manufacturerBatch).toBe("Lote 12-A/2026");
  });

  it("aceita vírgula decimal e rejeita zero, negativo e data inválida", () => {
    const decimal = validateBoxCreateForm({ ...base, totalLengthM: "200,5", rollsQuantity: "8" });
    expect(decimal.ok).toBe(true);
    if (decimal.ok) expect(decimal.input.totalLengthM).toBe(200.5);

    expect(validateBoxCreateForm({ ...base, rollsQuantity: "0" }).ok).toBe(false);
    expect(validateBoxCreateForm({ ...base, totalLengthM: "-1" }).ok).toBe(false);
    expect(validateBoxCreateForm({ ...base, receivedAt: "2026-02-31" }).ok).toBe(false);
    expect(validateBoxCreateForm({ ...base, productId: " " }).ok).toBe(false);
  });

  it("rejeita metragem inválida no serviço de domínio", () => {
    expect(() =>
      assertValidBoxCreate({
        productId: "product-1",
        rollsQuantity: 10,
        totalLengthM: 0,
        receivedAt: "2026-10-06",
      }),
    ).toThrow(BoxValidationError);
  });
});
