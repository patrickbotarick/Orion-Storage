import { describe, expect, it } from "vitest";

import { mergeBoxContentSuggestion, suggestBoxContent } from "./box-content";

describe("conteúdo sugerido da caixa", () => {
  it("sugere a quantidade de rolos do produto", () => {
    expect(suggestBoxContent({ rollsPerBox: 10 }).rollsQuantity).toBe(10);
  });

  it("calcula a metragem pelo comprimento do rolo, não pelo total informado do produto", () => {
    const product = { rollsPerBox: 10, rollLengthM: 20, totalLengthPerBoxM: 180 };
    expect(suggestBoxContent(product)).toEqual({ rollsQuantity: 10, totalLengthM: 200 });
    expect(suggestBoxContent({ rollsPerBox: 15, rollLengthM: 20 }).totalLengthM).toBe(300);
  });

  it("não sugere metragem quando falta o comprimento do rolo", () => {
    expect(suggestBoxContent({})).toEqual({});
    expect(suggestBoxContent({ rollsPerBox: 10 })).toEqual({ rollsQuantity: 10 });
  });

  it("não substitui quantidade nem metragem já informadas", () => {
    const suggestion = suggestBoxContent({ rollsPerBox: 10, rollLengthM: 20 });
    expect(
      mergeBoxContentSuggestion({ rollsQuantity: 7, totalLengthM: 150 }, suggestion, {
        rollsQuantity: true,
        totalLengthM: true,
      }),
    ).toEqual({ rollsQuantity: 7, totalLengthM: 150 });
    expect(
      mergeBoxContentSuggestion({ rollsQuantity: 7 }, suggestion, {
        rollsQuantity: true,
        totalLengthM: false,
      }),
    ).toEqual({ rollsQuantity: 7, totalLengthM: 200 });
  });
});
