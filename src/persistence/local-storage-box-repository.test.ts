import { describe, expect, it } from "vitest";

import { BoxNotFoundError, BoxValidationError, type BoxCreateInput } from "@orion/domain";

import { MemoryKeyValueStore } from "./key-value-store";
import { LocalStorageBoxRepository } from "./local-storage-box-repository";

const KEY = "orion-storage.boxes.v1";

function repository(now?: () => string) {
  let tick = 0;
  let nextId = 0;
  const store = new MemoryKeyValueStore();
  const repo = new LocalStorageBoxRepository(
    store,
    () => `box-${++nextId}`,
    now ??
      (() => {
        const value = `2026-10-06T15:00:${String(tick).padStart(2, "0")}.000Z`;
        tick += 1;
        return value;
      }),
  );
  return { repo, store };
}

const input: BoxCreateInput = {
  productId: "seed-proadec-classic-branco-1101",
  rollsQuantity: 8,
  totalLengthM: 150,
  receivedAt: "2026-10-05",
  notes: "Caixa incompleta",
};

describe("LocalStorageBoxRepository", () => {
  it("semeia as caixas de demonstração só na primeira leitura", async () => {
    const { repo, store } = repository();
    const first = await repo.list();
    expect(first.map((box) => box.code)).toEqual([
      "CX-20261006-000004",
      "CX-20261006-000003",
      "CX-20261006-000002",
      "CX-20261006-000001",
    ]);
    expect(store.getItem(KEY)).toContain("seed-box-proadec-1");
    const again = new LocalStorageBoxRepository(store, () => "should-not-reseed");
    const second = await again.list();
    expect(second).toHaveLength(4);
    expect(second.some((box) => box.id === "should-not-reseed")).toBe(false);
  });

  it("continua a sequência depois de recriar o repositório e em outro dia", async () => {
    const { repo, store } = repository();
    const created = await repo.create(input);
    expect(created.code).toBe("CX-20261006-000005");
    expect(created.rollsQuantity).toBe(8);
    expect(created.totalLengthM).toBe(150);
    expect(created.manufacturerBatch).toBeUndefined();
    expect(created.history.map((entry) => entry.type)).toEqual(["CREATED"]);

    const resumed = new LocalStorageBoxRepository(
      store,
      () => `resume-${Math.random()}`,
      () => "2026-10-06T20:00:00.000Z",
    );
    const next = await resumed.create({ ...input, manufacturerBatch: "Lote 12-A" });
    expect(next.code).toBe("CX-20261006-000006");
    expect(next.manufacturerBatch).toBe("Lote 12-A");
    expect(await resumed.getByCode("cx-20261006-000005")).toMatchObject({ id: created.id });

    const tomorrow = new LocalStorageBoxRepository(
      store,
      () => `tomorrow-${Math.random()}`,
      () => "2026-10-07T15:00:00.000Z",
    );
    const nextDay = await tomorrow.create(input);
    expect(nextDay.code).toBe("CX-20261007-000001");
  });

  it("começa em 000001 quando ainda não há caixa nem ledger", async () => {
    const store = new MemoryKeyValueStore();
    store.setItem(KEY, JSON.stringify({ version: 1, boxes: [], codeLedger: {} }));
    let nextId = 0;
    const clean = new LocalStorageBoxRepository(
      store,
      () => `clean-${++nextId}`,
      () => "2026-10-06T15:00:00.000Z",
    );
    const first = await clean.create(input);
    const second = await clean.create({ ...input, productId: "seed-real-rehau-pinole" });
    expect(first.code).toBe("CX-20261006-000001");
    expect(second.code).toBe("CX-20261006-000002");
    expect(first.code).not.toBe(second.code);
  });

  it("edita conteúdo sem trocar código ou produto e acumula histórico", async () => {
    const { repo, store } = repository();
    const created = await repo.create(input);
    const same = await repo.update(created.id, {
      rollsQuantity: created.rollsQuantity,
      totalLengthM: created.totalLengthM,
      receivedAt: created.receivedAt,
      notes: created.notes,
    });
    expect(same.history).toHaveLength(1);
    expect(same.updatedAt).toBe(created.updatedAt);

    const updated = await repo.update(created.id, {
      rollsQuantity: 9,
      totalLengthM: 180,
      manufacturerBatch: "EDIT-1",
      receivedAt: "2026-10-04",
      notes: "Ajuste de conferência",
    });
    expect(updated.id).toBe(created.id);
    expect(updated.code).toBe(created.code);
    expect(updated.productId).toBe(created.productId);
    expect(updated.history[0]?.type).toBe("CREATED");
    expect(updated.history.at(-1)?.type).toBe("UPDATED");
    expect(updated.history.at(-1)?.description).toContain("lote");

    const cleared = await repo.update(updated.id, {
      rollsQuantity: 9,
      totalLengthM: 180,
      receivedAt: "2026-10-04",
      notes: "Ajuste de conferência",
    });
    expect(cleared.manufacturerBatch).toBeUndefined();
    expect(cleared.history.at(-1)?.metadata?.fields).toBe("manufacturerBatch");

    const reloaded = new LocalStorageBoxRepository(store);
    expect((await reloaded.getById(created.id))?.notes).toBe("Ajuste de conferência");
    expect(await reloaded.listByProductId(created.productId)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );
  });

  it("muda status, recusa status desconhecido e não apaga o histórico", async () => {
    const { repo } = repository();
    const created = await repo.create(input);
    const changed = await repo.setStatus(created.id, "AVAILABLE");
    expect(changed.status).toBe("AVAILABLE");
    expect(changed.history.map((entry) => entry.type)).toEqual(["CREATED", "STATUS_CHANGED"]);
    expect(changed.history.at(-1)?.metadata).toEqual({
      previousStatus: "RECEIVED",
      nextStatus: "AVAILABLE",
    });
    const unchanged = await repo.setStatus(created.id, "AVAILABLE");
    expect(unchanged.history).toHaveLength(2);
    await expect(repo.setStatus(created.id, "ARMAZENADA" as "AVAILABLE")).rejects.toBeInstanceOf(
      BoxValidationError,
    );
    await expect(repo.update("missing", input)).rejects.toBeInstanceOf(BoxNotFoundError);
  });
});
