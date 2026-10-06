import { describe, expect, it } from "vitest";

import { allocateBoxCodes } from "./box-code";
import { demoBoxState } from "./box-seeds";
import { InactiveProductBoxError, ProductNotFoundError, ReceiptValidationError } from "./errors";
import { suggestBoxContent } from "./box-content";
import { filterReceipts } from "./receipt-filter";
import { planReceipt } from "./receipt-plan";
import { allocateReceiptCode, parseReceiptCode } from "./receipt-code";
import { demoProducts } from "./seeds";
import type { Receipt } from "./receipt";
import type { ReceiptDraft } from "./receipt";

const NOW = new Date("2026-10-06T18:00:00.000Z");

function draft(overrides: Partial<ReceiptDraft> = {}): ReceiptDraft {
  const product = demoProducts()[0]!;
  const suggestion = suggestBoxContent(product);
  return {
    requestId: "req-1",
    receivedAt: "2026-10-06",
    supplierName: "Entrega da manhã",
    items: [
      {
        productId: product.id,
        boxesQuantity: 5,
        rollsQuantity: suggestion.rollsQuantity ?? 1,
        totalLengthM: suggestion.totalLengthM ?? 1,
        manufacturerBatch: "LOTE-A",
      },
    ],
    ...overrides,
  };
}

describe("recebimento", () => {
  it("gera código de recebimento único e estável no mesmo dia", () => {
    const first = allocateReceiptCode({ existingCodes: [], ledger: {}, now: NOW });
    const second = allocateReceiptCode({
      existingCodes: [first.code],
      ledger: first.ledger,
      now: NOW,
    });
    expect(first.code).toBe("REC-20261006-000001");
    expect(second.code).toBe("REC-20261006-000002");
    expect(parseReceiptCode(first.code)?.sequence).toBe(1);
    expect(
      allocateReceiptCode({ existingCodes: [], ledger: { "20261006": 4 }, now: NOW }).code,
    ).toBe("REC-20261006-000005");
  });

  it("projeta códigos de caixa sem alterar o ledger informado", () => {
    const state = demoBoxState();
    const ledger = { ...state.codeLedger };
    const codes = [...state.boxes.map((box) => box.code)];
    const plan = planReceipt({
      draft: draft(),
      products: demoProducts(),
      boxCodes: codes,
      boxLedger: ledger,
      receiptCodes: [],
      receiptLedger: {},
      now: NOW,
    });
    expect(plan.totalBoxes).toBe(5);
    expect(plan.boxCodes).toEqual([
      "CX-20261006-000005",
      "CX-20261006-000006",
      "CX-20261006-000007",
      "CX-20261006-000008",
      "CX-20261006-000009",
    ]);
    expect(new Set(plan.boxCodes).size).toBe(5);
    expect(ledger).toEqual(state.codeLedger);
    expect(codes).toEqual(state.boxes.map((box) => box.code));
    expect(plan.items[0]?.rollsQuantity).toBe(10);
    expect(plan.items[0]?.totalLengthM).toBe(200);
  });

  it("aceita vários produtos e recusa quantidade inválida, produto ausente ou inativo", () => {
    const products = demoProducts();
    const state = demoBoxState();
    const base = {
      products,
      boxCodes: state.boxes.map((box) => box.code),
      boxLedger: state.codeLedger,
      receiptCodes: [] as string[],
      receiptLedger: {},
      now: NOW,
    };
    const many = planReceipt({
      ...base,
      draft: draft({
        items: [
          {
            productId: products[0]!.id,
            boxesQuantity: 2,
            rollsQuantity: 8,
            totalLengthM: 140,
            manufacturerBatch: "A",
          },
          {
            productId: products[1]!.id,
            boxesQuantity: 3,
            rollsQuantity: 15,
            totalLengthM: 300,
            manufacturerBatch: "B",
          },
        ],
      }),
    });
    expect(many.totalBoxes).toBe(5);
    expect(many.items[0]?.boxCodes).toHaveLength(2);
    expect(many.items[1]?.boxCodes).toHaveLength(3);
    expect(many.items[0]?.rollsQuantity).toBe(8);
    expect(many.items[0]?.totalLengthM).toBe(140);

    expect(() =>
      planReceipt({
        ...base,
        draft: draft({ items: [{ ...draft().items[0]!, boxesQuantity: 0 }] }),
      }),
    ).toThrow(ReceiptValidationError);
    expect(() =>
      planReceipt({
        ...base,
        draft: draft({ items: [{ ...draft().items[0]!, boxesQuantity: -2 }] }),
      }),
    ).toThrow(/maior que zero/);
    expect(() =>
      planReceipt({
        ...base,
        draft: draft({ items: [{ ...draft().items[0]!, boxesQuantity: 501 }] }),
      }),
    ).toThrow(/500/);
    expect(() =>
      planReceipt({
        ...base,
        draft: draft({ items: [{ ...draft().items[0]!, productId: "nao-existe" }] }),
      }),
    ).toThrow(ProductNotFoundError);
    expect(() =>
      planReceipt({
        ...base,
        products: products.map((product) =>
          product.id === products[0]!.id ? { ...product, status: "INACTIVE" } : product,
        ),
        draft: draft(),
      }),
    ).toThrow(InactiveProductBoxError);
  });

  it("reserva cem códigos de caixa sem repetir", () => {
    const allocated = allocateBoxCodes({ existingCodes: [], ledger: {}, now: NOW, count: 100 });
    expect(new Set(allocated.codes).size).toBe(100);
    expect(allocated.codes[0]).toBe("CX-20261006-000001");
    expect(allocated.codes[99]).toBe("CX-20261006-000100");
  });

  it("busca recebimento por código, produto, lote e caixa", () => {
    const receipt: Receipt = {
      id: "rec-1",
      code: "REC-20261006-000001",
      status: "CONFIRMED",
      receivedAt: "2026-10-06",
      requestId: "req-1",
      createdAt: "2026-10-06T18:00:00.000Z",
      updatedAt: "2026-10-06T18:00:00.000Z",
      items: [
        {
          id: "item-1",
          receiptId: "rec-1",
          productId: "seed-proadec-classic-branco-1101",
          boxesQuantity: 1,
          rollsQuantity: 10,
          totalLengthM: 200,
          manufacturerBatch: "LOTE-A",
        },
      ],
    };
    const items = [
      {
        receipt,
        productLabels: ["Classic Branco 1101 TX"],
        brands: ["Proadec"],
        batches: ["LOTE-A"],
        boxCodes: ["CX-20261006-000005"],
        boxCount: 1,
      },
    ];
    expect(filterReceipts(items, { text: "rec-20261006-000001" })).toHaveLength(1);
    expect(filterReceipts(items, { text: "CX-20261006-000005" })).toHaveLength(1);
    expect(filterReceipts(items, { text: "lote-a" })).toHaveLength(1);
    expect(filterReceipts(items, { text: "inexistente" })).toHaveLength(0);
    expect(filterReceipts(items, { productId: "seed-proadec-classic-branco-1101" })).toHaveLength(
      1,
    );
    expect(
      filterReceipts(items, { brand: "Proadec", date: "2026-10-06", status: "CONFIRMED" }),
    ).toHaveLength(1);
    expect(filterReceipts(items, { date: "2026-10-07" })).toHaveLength(0);
  });
});
