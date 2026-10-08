import { describe, expect, it } from "vitest";
import { MemoryKeyValueStore } from "./key-value-store";
import {
  INVENTORY_STORAGE_KEY,
  LocalStorageInventoryRepository,
} from "./local-storage-inventory-repository";
import { finishInventory, type InventorySession } from "@orion/domain";

const draft = (id: string): Omit<InventorySession, "code"> => ({
  id,
  scope: "AREA",
  areaId: "area",
  status: "IN_PROGRESS",
  scopeLabel: "Área",
  locations: [],
  catalogSnapshot: [],
  items: [],
  revision: 0,
  startedAt: "2026-10-08T15:00:00.000Z",
  createdAt: "2026-10-08T15:00:00.000Z",
  updatedAt: "2026-10-08T15:00:00.000Z",
});

describe("LocalStorageInventoryRepository", () => {
  it("começa vazio e mantém sequência após recarregar", async () => {
    const store = new MemoryKeyValueStore();
    const repo = new LocalStorageInventoryRepository(store);
    expect(await repo.list()).toEqual([]);
    const first = await repo.create(draft("a"));
    const second = await new LocalStorageInventoryRepository(store).create(draft("b"));
    expect(first.code).toBe("INV-20261008-000001");
    expect(second.code).toBe("INV-20261008-000002");
  });
  it("isola objetos retornados e não aceita mudar o snapshot", async () => {
    const repo = new LocalStorageInventoryRepository(new MemoryKeyValueStore());
    const session = await repo.create(draft("a"));
    session.scopeLabel = "Alterado";
    expect((await repo.getById("a"))?.scopeLabel).toBe("Área");
    await expect(repo.save({ ...session, revision: 1 }, 0)).rejects.toThrow("imutáveis");
  });
  it("rejeita revisão concorrente e gravação de sessão encerrada", async () => {
    const repo = new LocalStorageInventoryRepository(new MemoryKeyValueStore());
    const session = await repo.create(draft("a"));
    await expect(repo.save({ ...session, revision: 2 }, 1)).rejects.toThrow("mudou");
    const closed = finishInventory(session, "COMPLETED", "2026-10-08T16:00:00.000Z");
    await repo.save(closed, 0);
    await expect(repo.save({ ...closed, revision: 2 }, 1)).rejects.toThrow("encerrada");
  });
  it("não sobrescreve JSON inválido", async () => {
    const store = new MemoryKeyValueStore();
    store.setItem(INVENTORY_STORAGE_KEY, "invalid");
    const repo = new LocalStorageInventoryRepository(store);
    await expect(repo.create(draft("a"))).rejects.toThrow("inválidos");
    expect(store.getItem(INVENTORY_STORAGE_KEY)).toBe("invalid");
  });
});
