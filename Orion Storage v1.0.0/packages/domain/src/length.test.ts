import { describe, expect, it } from "vitest";

import { calculatedTotalLengthM, detectLengthDivergence } from "./length";

describe("cálculo e divergência de metragem", () => {
  it("calcula rolos vezes comprimento", () => {
    expect(calculatedTotalLengthM(20, 10)).toBe(200);
    expect(calculatedTotalLengthM(20, 15)).toBe(300);
  });

  it("não sobrescreve o total informado quando há divergência", () => {
    const input = { rollLengthM: 20, rollsPerBox: 10, informedTotalLengthM: 180 };
    const result = detectLengthDivergence(input);
    expect(input.informedTotalLengthM).toBe(180);
    expect(result.calculatedTotalLengthM).toBe(200);
    expect(result.informedTotalLengthM).toBe(180);
    expect(result.hasDivergence).toBe(true);
    expect(result.differenceM).toBe(-20);
  });

  it("não acusa divergência quando os totais coincidem", () => {
    const result = detectLengthDivergence({
      rollLengthM: 20,
      rollsPerBox: 10,
      informedTotalLengthM: 200,
    });
    expect(result.hasDivergence).toBe(false);
    expect(result.differenceM).toBe(0);
  });

  it("não acusa divergência quando o fabricante não informou o total", () => {
    const result = detectLengthDivergence({ rollLengthM: 20, rollsPerBox: 10 });
    expect(result.hasDivergence).toBe(false);
    expect(result.calculatedTotalLengthM).toBe(200);
    expect(result.informedTotalLengthM).toBeNull();
  });
});
