import { describe, expect, it } from "vitest";

import {
  createBoxQrPayload,
  resolveIdentification,
  suggestBoxContent,
  type ReceiptRepository,
} from "@orion/domain";

import { createReceiptService } from "@/application/receipts/receipt-service";
import { MemoryKeyValueStore } from "@/persistence/key-value-store";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageProductRepository } from "@/persistence/local-storage-product-repository";
import { LocalStorageReceiptRepository } from "@/persistence/local-storage-receipt-repository";

const NOW = "2026-10-06T18:00:00.000Z";
const PROADEC = "seed-proadec-classic-branco-1101";
const REAL = "seed-real-rehau-pinole";

function harness() {
  const store = new MemoryKeyValueStore();
  let next = 0;
  const ids = () => `id-${++next}`;
  const now = () => NOW;
  const products = new LocalStorageProductRepository(store, ids, now);
  const boxes = new LocalStorageBoxRepository(store, ids, now);
  const receipts = new LocalStorageReceiptRepository(store);
  return {
    store,
    products,
    boxes,
    receipts,
    service: createReceiptService(products, boxes, receipts, ids, now),
  };
}

function oneProduct(quantity = 1, rolls = 10, length = 200) {
  return {
    requestId: "req-fixed",
    receivedAt: "2026-10-06",
    supplierName: "Entrega",
    items: [
      {
        productId: PROADEC,
        boxesQuantity: quantity,
        rollsQuantity: rolls,
        totalLengthM: length,
        manufacturerBatch: "LOTE-A",
      },
    ],
  };
}

describe("serviço de recebimento", () => {
  it("cria um recebimento, vincula as caixas e não inventa movimento nem localização", async () => {
    const { boxes, service, store, products } = harness();
    const product = await products.getById(PROADEC);
    const suggestion = suggestBoxContent(product!);
    const before = await boxes.list();
    expect(before.every((box) => box.receiptId == null)).toBe(true);

    const preview = await service.preview({
      ...oneProduct(5, suggestion.rollsQuantity, suggestion.totalLengthM),
      requestId: "preview-only",
    });
    expect(preview.boxCodes).toEqual([
      "CX-20261006-000005",
      "CX-20261006-000006",
      "CX-20261006-000007",
      "CX-20261006-000008",
      "CX-20261006-000009",
    ]);
    expect(await boxes.list()).toHaveLength(before.length);
    expect(store.getItem("orion-storage.receipts.v1")).toBeNull();

    const confirmed = await service.confirm(
      oneProduct(5, suggestion.rollsQuantity!, suggestion.totalLengthM!),
    );
    expect(confirmed.replayed).toBe(false);
    expect(confirmed.receipt.code).toBe("REC-20261006-000001");
    expect(confirmed.receipt.status).toBe("CONFIRMED");
    expect(confirmed.boxes).toHaveLength(5);
    expect(confirmed.boxes.every((box) => box.receiptId === confirmed.receipt.id)).toBe(true);
    expect(confirmed.boxes.every((box) => box.currentLocationId == null)).toBe(true);
    expect(confirmed.boxes.every((box) => box.status === "RECEIVED")).toBe(true);
    expect(confirmed.boxes.every((box) => box.manufacturerBatch === "LOTE-A")).toBe(true);
    expect(confirmed.boxes.every((box) => box.receivedAt === "2026-10-06")).toBe(true);
    expect(confirmed.boxes[0]?.history[0]?.metadata).toMatchObject({
      receiptId: confirmed.receipt.id,
      receiptCode: "REC-20261006-000001",
    });
    expect(store.getItem("orion-storage.movements.v1")).toBeNull();

    const hit = resolveIdentification(createBoxQrPayload(confirmed.boxes[0]!.code), {
      boxes: await boxes.list(),
      locations: [],
    });
    expect(hit.entityId).toBe(confirmed.boxes[0]!.id);

    const listed = await service.list();
    expect(listed.map((receipt) => receipt.code)).toEqual(["REC-20261006-000001"]);
    expect(await service.listByProductId(PROADEC)).toHaveLength(1);
    expect(await service.listByDateRange("2026-10-01", "2026-10-31")).toHaveLength(1);
    expect(await service.listBoxes(confirmed.receipt.id)).toHaveLength(5);
    expect(
      (await boxes.list())
        .filter((box) => box.id.startsWith("seed-"))
        .every((box) => !box.receiptId),
    ).toBe(true);
  });

  it("cria uma caixa, vários produtos, e não duplica no segundo envio", async () => {
    const { boxes, service } = harness();
    const single = await service.confirm(oneProduct(1));
    expect(single.boxes).toHaveLength(1);
    expect(single.boxes[0]?.code).toBe("CX-20261006-000005");

    const again = await service.confirm({
      ...oneProduct(9),
      requestId: "req-fixed",
    });
    expect(again.replayed).toBe(true);
    expect(again.receipt.id).toBe(single.receipt.id);
    expect(await service.listBoxes(single.receipt.id)).toHaveLength(1);
    expect((await boxes.list()).filter((box) => box.receiptId)).toHaveLength(1);

    const multi = await service.confirm({
      requestId: "req-multi",
      receivedAt: "2026-10-08",
      items: [
        {
          productId: PROADEC,
          boxesQuantity: 2,
          rollsQuantity: 8,
          totalLengthM: 140,
          manufacturerBatch: "A",
        },
        {
          productId: REAL,
          boxesQuantity: 3,
          rollsQuantity: 15,
          totalLengthM: 300,
          manufacturerBatch: "B",
        },
      ],
    });
    expect(multi.receipt.code).toBe("REC-20261006-000002");
    expect(multi.receipt.items).toHaveLength(2);
    expect(multi.boxes.map((box) => box.productId)).toEqual([PROADEC, PROADEC, REAL, REAL, REAL]);
    expect(multi.boxes.map((box) => box.rollsQuantity)).toEqual([8, 8, 15, 15, 15]);
    expect(new Set(multi.boxes.map((box) => box.code)).size).toBe(5);
    expect(multi.boxes[0]?.code).toBe("CX-20261006-000006");

    const beforeReprint = (await boxes.list()).length;
    expect(await service.listBoxes(multi.receipt.id)).toHaveLength(5);
    expect(await boxes.list()).toHaveLength(beforeReprint);

    const edited = await boxes.update(multi.boxes[0]!.id, {
      rollsQuantity: 8,
      totalLengthM: 140,
      receivedAt: "2026-10-08",
      manufacturerBatch: "A",
    });
    expect(edited.receiptId).toBe(multi.receipt.id);
  });

  it("desfaz as caixas se o recebimento não for gravado", async () => {
    const store = new MemoryKeyValueStore();
    const ids = () => "same-id";
    const now = () => NOW;
    const products = new LocalStorageProductRepository(store, () => "p", now);
    const boxes = new LocalStorageBoxRepository(store, () => "b", now);
    const failing: ReceiptRepository = {
      list: async () => [],
      getById: async () => null,
      getByCode: async () => null,
      findByRequestId: async () => null,
      listByProductId: async () => [],
      listByDateRange: async () => [],
      captureState: async () => ({ receipts: [], codeLedger: {} }),
      create: async () => {
        throw new Error("falha de gravação");
      },
    };
    const service = createReceiptService(products, boxes, failing, ids, now);
    const before = (await boxes.captureState()).codeLedger["20261006"];
    await expect(service.confirm(oneProduct(4))).rejects.toThrow("falha de gravação");
    expect(await boxes.list()).toHaveLength(4);
    expect((await boxes.list()).some((box) => box.receiptId)).toBe(false);
    expect((await boxes.captureState()).codeLedger["20261006"]).toBe(before);
    expect(store.getItem("orion-storage.receipts.v1")).toBeNull();
  });
});
