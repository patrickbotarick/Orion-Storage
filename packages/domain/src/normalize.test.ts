import { describe, expect, it } from "vitest";

import { normalizeDisplay, normalizeForComparison, normalizeInternalCode } from "./normalize";

describe("normalização de strings", () => {
  it("trata marca com caixa e espaços como a mesma chave", () => {
    const key = normalizeForComparison("Real");
    expect(normalizeForComparison("REAL")).toBe(key);
    expect(normalizeForComparison(" real ")).toBe(key);
    expect(normalizeForComparison("Real / Rehau")).toBe(normalizeForComparison("real/rehau"));
  });

  it("trata cor com caixa, espaços e acentos como a mesma chave", () => {
    expect(normalizeForComparison("Azul")).toBe(normalizeForComparison(" AZUL "));
    expect(normalizeForComparison("azul")).toBe("azul");
    expect(normalizeForComparison("Açúcar")).toBe(normalizeForComparison("acucar"));
  });

  it("preserva o valor amigável de exibição", () => {
    expect(normalizeDisplay("  Azul  ")).toBe("Azul");
    expect(normalizeDisplay("REAL")).toBe("REAL");
    expect(normalizeDisplay("Branco  1101   TX")).toBe("Branco 1101 TX");
  });

  it("converte string vazia e espaços em ausência", () => {
    expect(normalizeDisplay("")).toBeUndefined();
    expect(normalizeDisplay("   ")).toBeUndefined();
    expect(normalizeDisplay(null)).toBeUndefined();
    expect(normalizeForComparison("")).toBe("");
  });

  it("remove acentos e espaços do código", () => {
    expect(normalizeInternalCode(" real  açúcar ")).toBe("REAL-ACUCAR");
    expect(normalizeInternalCode("")).toBe("");
  });
});
