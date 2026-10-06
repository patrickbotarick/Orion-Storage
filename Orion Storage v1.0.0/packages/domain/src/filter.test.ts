import { describe, expect, it } from "vitest";

import { filterProducts } from "./filter";
import { demoProducts } from "./seeds";

describe("filtros do catálogo", () => {
  it("busca por código, nome, marca e cor sem diferenciar caixa", () => {
    const products = demoProducts();
    expect(filterProducts(products, { text: "pinole" })).toHaveLength(1);
    expect(filterProducts(products, { text: "PROADEC" })[0]?.brand).toBe("Proadec");
    expect(filterProducts(products, { text: "branco 1101" })[0]?.brand).toBe("Proadec");
    expect(filterProducts(products, { text: "real/rehau" })[0]?.colorName).toBe("Pinole");
  });

  it("filtra marca equivalente e status", () => {
    const products = demoProducts().map((product, index) =>
      index === 0 ? { ...product, status: "INACTIVE" as const } : product,
    );
    expect(filterProducts(products, { brand: " proadec " })).toHaveLength(1);
    expect(filterProducts(products, { status: "ACTIVE" })).toHaveLength(1);
    expect(filterProducts(products, { category: "fita de borda" })).toHaveLength(2);
  });
});
