import { describe, expect, it } from "vitest";

import { calculatedTotalLengthM, detectLengthDivergence } from "./length";
import { demoProducts } from "./seeds";

describe("dados de demonstração", () => {
  it("mantém somente os dados confirmados das duas etiquetas", () => {
    const [proadec, pinole] = demoProducts();
    expect(proadec).toMatchObject({
      brand: "Proadec",
      line: "Classic",
      colorName: "Branco 1101 TX",
      widthMm: 35,
      rollLengthM: 20,
      rollsPerBox: 10,
      totalLengthPerBoxM: 200,
      category: "Fita de borda",
      status: "ACTIVE",
    });
    expect(proadec?.thicknessMm).toBeUndefined();
    expect(proadec?.manufacturer).toBeUndefined();
    expect(proadec?.supplier).toBeUndefined();
    expect(proadec?.colorCode).toBeUndefined();

    expect(pinole).toMatchObject({
      name: "Pinole Essencial Duratex",
      brand: "Real/Rehau",
      colorName: "Pinole",
      widthMm: 22,
      thicknessMm: 0.4,
      rollLengthM: 20,
      rollsPerBox: 15,
      totalLengthPerBoxM: 300,
    });
    expect(pinole?.line).toBeUndefined();
    expect(pinole?.manufacturer).toBeUndefined();
  });

  it("não marca divergência nos totais confirmados", () => {
    for (const product of demoProducts()) {
      expect(product.totalLengthPerBoxM).toBe(
        calculatedTotalLengthM(product.rollLengthM ?? 0, product.rollsPerBox ?? 0),
      );
      expect(
        detectLengthDivergence({
          rollLengthM: product.rollLengthM,
          rollsPerBox: product.rollsPerBox,
          informedTotalLengthM: product.totalLengthPerBoxM,
        }).hasDivergence,
      ).toBe(false);
    }
  });
});
