import { describe, expect, it } from "vitest";

import { suggestInternalCode } from "./internal-code";
import { demoProducts } from "./seeds";

describe("geração de internalCode", () => {
  it("gera o exemplo legível de fita com todas as medidas", () => {
    expect(
      suggestInternalCode({
        brand: "Real",
        colorName: "Azul",
        widthMm: 35,
        thicknessMm: 0.45,
        rollLengthM: 20,
      }),
    ).toBe("REAL-AZUL-035-045-020");
  });

  it("é determinístico e ignora caixa e acentos", () => {
    const first = suggestInternalCode({
      brand: " real ",
      colorName: "AZUL",
      widthMm: 35,
      thicknessMm: 0.45,
      rollLengthM: 20,
    });
    const second = suggestInternalCode({
      brand: "REAL",
      colorName: "azul",
      widthMm: 35,
      thicknessMm: 0.45,
      rollLengthM: 20,
    });
    expect(first).toBe(second);
    expect(first).toBe("REAL-AZUL-035-045-020");
  });

  it("omite medidas ausentes em vez de inventar um segmento", () => {
    expect(
      suggestInternalCode({
        brand: "Real",
        colorName: "Azul",
        widthMm: 35,
        rollLengthM: 20,
      }),
    ).toBe("REAL-AZUL-035-020");
  });

  it("funciona só com nome quando não há marca nem medidas", () => {
    expect(suggestInternalCode({ name: "Parafuso sextavado" })).toBe("PARAFUSO-SEXTAVADO");
  });

  it("não inclui espaços nem acentos", () => {
    const code = suggestInternalCode({
      brand: "Proadec",
      colorName: "Branco 1101 TX",
      widthMm: 35,
      rollLengthM: 20,
    });
    expect(code).toBe("PROADEC-BRANCO-1101-TX-035-020");
    expect(code).not.toMatch(/\s/);
    expect(code).toMatch(/^[A-Z0-9-]+$/);
  });

  it("usa os dados confirmados das demonstrações", () => {
    const [proadec, pinole] = demoProducts();
    expect(proadec?.internalCode).toBe("PROADEC-BRANCO-1101-TX-035-020");
    expect(pinole?.internalCode).toBe("REAL-REHAU-PINOLE-022-040-020");
  });
});
