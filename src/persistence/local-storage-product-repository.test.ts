import { describe, expect, it } from "vitest";

import { ProductValidationError } from "@orion/domain";

import { MemoryKeyValueStore } from "./key-value-store";
import { LocalStorageProductRepository } from "./local-storage-product-repository";

function repository() {
  let tick = 0;
  const ids = ["id-1", "id-2", "id-3"];
  let next = 0;
  const store = new MemoryKeyValueStore();
  const repo = new LocalStorageProductRepository(
    store,
    () => ids[next++] ?? `id-${next}`,
    () => `2026-10-06T15:00:0${tick++}.000Z`,
  );
  return { repo, store };
}

describe("LocalStorageProductRepository", () => {
  it("semeia os produtos de demonstração apenas na primeira leitura", async () => {
    const { repo, store } = repository();
    const first = await repo.list();
    expect(first.map((product) => product.internalCode)).toEqual([
      "PROADEC-BRANCO-1101-TX-035-020",
      "REAL-REHAU-PINOLE-022-040-020",
    ]);
    const raw = store.getItem("orion-storage.products.v1");
    expect(raw).toContain("seed-proadec-classic-branco-1101");

    const again = new LocalStorageProductRepository(store, () => "should-not-reseed");
    const second = await again.list();
    expect(second).toHaveLength(2);
    expect(second[0]?.id).not.toBe("should-not-reseed");
  });

  it("cria, edita, duplica e muda status sem apagar o registro", async () => {
    const { repo } = repository();
    const created = await repo.create({
      internalCode: "PARAFUSO",
      name: "Parafuso",
      category: "Ferragem",
      status: "ACTIVE",
    });
    expect(created.id).toBe("id-1");

    const updated = await repo.update(created.id, {
      ...created,
      name: "Parafuso zincado",
      internalCode: "PARAFUSO-ZINCADO",
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Parafuso zincado");
    expect(updated.createdAt).toBe(created.createdAt);

    const copy = await repo.duplicate("seed-real-rehau-pinole");
    expect(copy.id).not.toBe("seed-real-rehau-pinole");
    expect(copy.internalCode).toBe("REAL-REHAU-PINOLE-022-040-020");
    expect(copy.widthMm).toBe(22);

    const inactive = await repo.setStatus(created.id, "INACTIVE");
    expect(inactive.status).toBe("INACTIVE");
    const stored = await repo.getById(created.id);
    expect(stored?.status).toBe("INACTIVE");
    expect(await repo.list()).toHaveLength(4);
  });

  it("rejeita largura negativa antes de persistir", async () => {
    const { repo } = repository();
    await expect(
      repo.create({
        internalCode: "REAL-AZUL",
        name: "Azul",
        category: "Fita de borda",
        status: "ACTIVE",
        widthMm: -35,
      }),
    ).rejects.toBeInstanceOf(ProductValidationError);
  });
});
