import { describe, expect, it } from "vitest";

import { demoBoxState } from "./box-seeds";
import { demoProducts } from "./seeds";

describe("caixas de demonstração", () => {
  it("cria duas caixas para cada produto de demonstração, com código único", () => {
    const products = demoProducts();
    const state = demoBoxState();
    expect(state.boxes).toHaveLength(4);
    expect(state.codeLedger["20261006"]).toBe(4);
    expect(new Set(state.boxes.map((box) => box.code)).size).toBe(4);
    expect(state.boxes.map((box) => box.code)).toEqual([
      "CX-20261006-000001",
      "CX-20261006-000002",
      "CX-20261006-000003",
      "CX-20261006-000004",
    ]);

    const proadec = products.find((product) => product.brand === "Proadec");
    const real = products.find((product) => product.brand === "Real/Rehau");
    const proadecBoxes = state.boxes.filter((box) => box.productId === proadec?.id);
    const realBoxes = state.boxes.filter((box) => box.productId === real?.id);
    expect(proadecBoxes).toHaveLength(2);
    expect(realBoxes).toHaveLength(2);
    expect(proadecBoxes[0]?.rollsQuantity).toBe(10);
    expect(proadecBoxes[0]?.totalLengthM).toBe(200);
    expect(realBoxes[0]?.rollsQuantity).toBe(15);
    expect(realBoxes[0]?.totalLengthM).toBe(300);
    expect(state.boxes.some((box) => box.manufacturerBatch == null)).toBe(true);
    expect(state.boxes.every((box) => box.history[0]?.type === "CREATED")).toBe(true);
    const addressed = state.boxes.filter((box) => box.currentLocationId);
    const loose = state.boxes.filter((box) => !box.currentLocationId);
    expect(addressed).toHaveLength(3);
    expect(loose).toHaveLength(1);
    expect(loose[0]?.id).toBe("seed-box-real-2");
    expect(
      state.boxes.find((box) => box.id === "seed-box-proadec-1")?.history.map((entry) => entry.type),
    ).toEqual(["CREATED", "STATUS_CHANGED", "LOCATION_ASSIGNED"]);
  });
});
