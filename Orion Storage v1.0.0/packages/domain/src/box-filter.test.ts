import { describe, expect, it } from "vitest";

import { filterBoxes, type BoxListItem } from "./box-filter";
import { demoBoxState } from "./box-seeds";
import { demoProducts } from "./seeds";

describe("busca de caixas", () => {
  const items = joinDemo();

  it("busca por código da caixa, código do produto, nome, marca, cor e lote", () => {
    expect(filterBoxes(items, { text: "cx-20261006-000001" })).toHaveLength(1);
    expect(filterBoxes(items, { text: "proadec-branco" })).toHaveLength(2);
    expect(filterBoxes(items, { text: "pinole" })).toHaveLength(2);
    expect(filterBoxes(items, { text: "real/rehau" })).toHaveLength(2);
    expect(filterBoxes(items, { text: "1101tx-26" })).toHaveLength(1);
    expect(filterBoxes(items, { text: "branco 1101" })).toHaveLength(2);
  });

  it("filtra produto, marca, status e data de recebimento", () => {
    const proadec = items.find((item) => item.product?.brand === "Proadec");
    expect(filterBoxes(items, { productId: proadec?.box.productId })).toHaveLength(2);
    expect(filterBoxes(items, { brand: " proadec " })).toHaveLength(2);
    expect(filterBoxes(items, { status: "AVAILABLE" })).toHaveLength(2);
    expect(filterBoxes(items, { status: "BLOCKED" })).toHaveLength(0);
    expect(filterBoxes(items, { receivedAt: "2026-10-06" })).toHaveLength(4);
    expect(filterBoxes(items, { receivedAt: "2026-10-05" })).toHaveLength(0);
  });
});

function joinDemo(): BoxListItem[] {
  const products = demoProducts();
  return demoBoxState().boxes.map((box) => ({
    box,
    product: products.find((product) => product.id === box.productId) ?? null,
  }));
}
