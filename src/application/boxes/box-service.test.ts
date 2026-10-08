import { describe, expect, it } from "vitest";

import {
  BoxProductImmutableError,
  InactiveProductBoxError,
  ProductNotFoundError,
  suggestBoxContent,
} from "@orion/domain";

import { createBoxService } from "@/application/boxes/box-service";
import { MemoryKeyValueStore } from "@/persistence/key-value-store";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageProductRepository } from "@/persistence/local-storage-product-repository";

function harness() {
  const store = new MemoryKeyValueStore();
  let tick = 0;
  let nextId = 0;
  const ids = () => `id-${++nextId}`;
  const now = () => {
    const value = `2026-10-06T15:00:${String(tick).padStart(2, "0")}.000Z`;
    tick += 1;
    return value;
  };
  const products = new LocalStorageProductRepository(store, ids, now);
  const boxes = new LocalStorageBoxRepository(store, ids, now);
  return { products, service: createBoxService(boxes, products), store };
}

const proadecId = "seed-proadec-classic-branco-1101";
const realId = "seed-real-rehau-pinole";

describe("BoxService", () => {
  it("vincula a caixa a um produto existente e preserva a quantidade informada", async () => {
    const { products, service } = harness();
    const product = await products.getById(proadecId);
    expect(product).not.toBeNull();
    expect(service.suggestContent(product ?? {})).toEqual({ rollsQuantity: 10, totalLengthM: 200 });
    expect(suggestBoxContent({ rollsPerBox: 10, rollLengthM: 20 }).totalLengthM).toBe(200);

    const box = await service.create({
      productId: proadecId,
      rollsQuantity: 8,
      totalLengthM: 150,
      receivedAt: "2026-10-06",
    });
    expect(box.productId).toBe(proadecId);
    expect(box.rollsQuantity).toBe(8);
    expect(box.totalLengthM).toBe(150);
    expect(box.manufacturerBatch).toBeUndefined();
    expect(box.status).toBe("RECEIVED");
    expect(box.history[0]?.type).toBe("CREATED");
    expect(box.code).toMatch(/^CX-20261006-\d{6}$/);
  });

  it("rejeita produto inexistente e produto inativo, sem invalidar caixa já criada", async () => {
    const { products, service } = harness();
    await expect(
      service.create({
        productId: "nao-existe",
        rollsQuantity: 1,
        totalLengthM: 1,
        receivedAt: "2026-10-06",
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);

    const box = await service.create({
      productId: proadecId,
      rollsQuantity: 10,
      totalLengthM: 200,
      receivedAt: "2026-10-06",
    });
    await products.setStatus(proadecId, "INACTIVE");
    expect((await service.getById(box.id))?.productId).toBe(proadecId);
    await expect(
      service.create({
        productId: proadecId,
        rollsQuantity: 10,
        totalLengthM: 200,
        receivedAt: "2026-10-06",
      }),
    ).rejects.toBeInstanceOf(InactiveProductBoxError);
  });

  it("edita a caixa, muda o status e recusa trocar o produto", async () => {
    const { service, store } = harness();
    const box = await service.create({
      productId: realId,
      rollsQuantity: 15,
      totalLengthM: 300,
      manufacturerBatch: "PIN-1",
      receivedAt: "2026-10-06",
    });
    await expect(
      service.update(box.id, {
        productId: proadecId,
        rollsQuantity: 15,
        totalLengthM: 300,
        manufacturerBatch: "PIN-1",
        receivedAt: "2026-10-06",
      }),
    ).rejects.toBeInstanceOf(BoxProductImmutableError);
    expect((await service.getById(box.id))?.history).toHaveLength(1);

    const edited = await service.update(box.id, {
      productId: box.productId,
      rollsQuantity: 14,
      totalLengthM: 280,
      manufacturerBatch: "PIN-2",
      receivedAt: "2026-10-03",
      notes: "Um rolo avariado",
    });
    expect(edited.code).toBe(box.code);
    expect(edited.productId).toBe(realId);
    expect(edited.history.at(-1)?.type).toBe("UPDATED");

    const available = await service.setStatus(edited.id, "OPENED");
    expect(available.status).toBe("OPENED");
    expect(available.history.at(-1)?.type).toBe("STATUS_CHANGED");
    expect(available.history[0]?.id).toBe(box.history[0]?.id);

    const persisted = new LocalStorageBoxRepository(store);
    expect((await persisted.getByCode(box.code))?.notes).toBe("Um rolo avariado");
  });
});
