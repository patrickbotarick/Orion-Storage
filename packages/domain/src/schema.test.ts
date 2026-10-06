import { describe, expect, it } from "vitest";

import { productInputSchema, validateProductForm } from "./schema";
import { EMPTY_PRODUCT_FORM, type ProductFormValues } from "./product";

function validForm(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    ...EMPTY_PRODUCT_FORM,
    name: "Azul 35",
    category: "Fita de borda",
    brand: "Real",
    colorName: "Azul",
    widthMm: "35",
    thicknessMm: "0,45",
    rollLengthM: "20",
    rollsPerBox: "10",
    ...overrides,
  };
}

describe("validação de medidas", () => {
  it("aceita largura e espessura positivas, inclusive com vírgula", () => {
    const result = validateProductForm(validForm());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.widthMm).toBe(35);
      expect(result.input.thicknessMm).toBe(0.45);
      expect(result.input.internalCode).toBe("REAL-AZUL-035-045-020");
    }
  });

  it("rejeita largura negativa, zero e texto com unidade", () => {
    expect(validateProductForm(validForm({ widthMm: "-1" })).ok).toBe(false);
    expect(validateProductForm(validForm({ widthMm: "0" })).ok).toBe(false);
    const withUnit = validateProductForm(validForm({ widthMm: "35 mm" }));
    expect(withUnit.ok).toBe(false);
    if (!withUnit.ok) expect(withUnit.fieldErrors.widthMm).toMatch(/número/i);

    expect(productInputSchema.safeParse(baseInput({ widthMm: -5 })).success).toBe(false);
    expect(productInputSchema.safeParse(baseInput({ widthMm: 0 })).success).toBe(false);
    expect(productInputSchema.safeParse(baseInput({ widthMm: 35 })).success).toBe(true);
  });

  it("rejeita espessura negativa e zero", () => {
    expect(validateProductForm(validForm({ thicknessMm: "-0,4" })).ok).toBe(false);
    expect(validateProductForm(validForm({ thicknessMm: "0" })).ok).toBe(false);
    expect(productInputSchema.safeParse(baseInput({ thicknessMm: -0.4 })).success).toBe(false);
    expect(productInputSchema.safeParse(baseInput({ thicknessMm: 0.4 })).success).toBe(true);
  });

  it("rejeita valores negativos de rolos, comprimento e total", () => {
    expect(validateProductForm(validForm({ rollsPerBox: "-2" })).ok).toBe(false);
    expect(validateProductForm(validForm({ rollLengthM: "-20" })).ok).toBe(false);
    expect(validateProductForm(validForm({ totalLengthPerBoxM: "-200" })).ok).toBe(false);
    expect(validateProductForm(validForm({ rollsPerBox: "10,5" })).ok).toBe(false);
  });

  it("permite produto sem medidas de fita", () => {
    const result = validateProductForm(
      validForm({
        category: "Ferragem",
        name: "Parafuso",
        brand: "",
        colorName: "",
        widthMm: "",
        thicknessMm: "",
        rollLengthM: "",
        rollsPerBox: "",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.widthMm).toBeUndefined();
      expect(result.input.internalCode).toBe("PARAFUSO");
    }
  });
});

function baseInput(overrides: Record<string, unknown>) {
  return {
    internalCode: "REAL-AZUL-035",
    name: "Azul",
    category: "Fita de borda",
    status: "ACTIVE" as const,
    ...overrides,
  };
}
