import { describe, expect, it } from "vitest";
import { createInventoryService } from "./inventory-service";
import { MemoryKeyValueStore } from "@/persistence/key-value-store";
import { LocalStorageInventoryRepository } from "@/persistence/local-storage-inventory-repository";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";
import {
  DEMO_AREA_ID,
  DEMO_LOCATION_IDS,
  summarizeInventory,
  type InventoryScope,
} from "@orion/domain";

function fixture() {
  const store = new MemoryKeyValueStore();
  const boxes = new LocalStorageBoxRepository(store);
  const locations = new LocalStorageLocationRepository(store);
  const areas = new LocalStorageStorageAreaRepository(store);
  const inventories = new LocalStorageInventoryRepository(store);
  let next = 0;
  const service = createInventoryService(
    inventories,
    boxes,
    locations,
    areas,
    () => `inv-${++next}`,
    () => `2026-10-08T15:00:${String(next).padStart(2, "0")}.000Z`,
  );
  const location: InventoryScope = {
    scope: "LOCATION",
    areaId: DEMO_AREA_ID,
    locationId: DEMO_LOCATION_IDS.a010101,
  };
  return { store, boxes, locations, areas, inventories, service, location };
}
const box1 = "CX-20261006-000001";

describe("InventoryService", () => {
  it("inicia uma sessão de posição e persiste o snapshot sem mudar caixas/movimentos", async () => {
    const f = fixture();
    await f.boxes.list();
    await f.locations.list();
    await f.areas.list();
    const before = f.store.getItem("orion-storage.boxes.v1");
    const session = await f.service.start(f.location, "Conferência");
    expect(session.status).toBe("IN_PROGRESS");
    expect(session.code).toBe("INV-20261008-000001");
    expect(session.items).toHaveLength(1);
    expect(session.items[0]).toMatchObject({
      code: box1,
      expected: true,
      found: false,
      classification: "MISSING",
    });
    expect((await f.inventories.getById(session.id))?.notes).toBe("Conferência");
    expect(f.store.getItem("orion-storage.boxes.v1")).toBe(before);
    expect(f.store.getItem("orion-storage.movements.v1")).toBeNull();
  });
  it("classifica MATCH e calcula resumo", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    const next = await f.service.record(
      session.id,
      `orion://v1/box/${box1}`,
      f.location.locationId!,
    );
    expect(next.items[0]?.classification).toBe("MATCH");
    expect(summarizeInventory(next)).toEqual({
      expected: 1,
      found: 1,
      match: 1,
      missing: 0,
      unexpected: 0,
      wrongLocation: 0,
      divergences: 0,
    });
  });
  it("caixa não lida fica MISSING na conclusão", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    const closed = await f.service.complete(session.id);
    expect(closed.items[0]?.classification).toBe("MISSING");
    expect(closed.completedAt).toBeDefined();
    expect(summarizeInventory(closed).missing).toBe(1);
  });
  it("caixa sem localização vira UNEXPECTED", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    const next = await f.service.record(session.id, "CX-20261006-000004", f.location.locationId!);
    expect(next.items.find((item) => item.code.endsWith("000004"))).toMatchObject({
      expected: false,
      found: true,
      classification: "UNEXPECTED",
    });
  });
  it("caixa registrada fora do escopo vira WRONG_LOCATION sem mover", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    const before = f.store.getItem("orion-storage.boxes.v1");
    const next = await f.service.record(session.id, "CX-20261006-000002", f.location.locationId!);
    expect(next.items.find((item) => item.code.endsWith("000002"))).toMatchObject({
      expected: false,
      found: true,
      classification: "WRONG_LOCATION",
      expectedLocationId: DEMO_LOCATION_IDS.a010102,
    });
    expect(f.store.getItem("orion-storage.boxes.v1")).toBe(before);
    expect(f.store.getItem("orion-storage.movements.v1")).toBeNull();
  });
  it("caixa esperada em outra posição do mesmo escopo é uma única WRONG_LOCATION", async () => {
    const f = fixture();
    const session = await f.service.start({ scope: "AREA", areaId: DEMO_AREA_ID });
    const next = await f.service.record(session.id, box1, DEMO_LOCATION_IDS.a010102);
    expect(next.items).toHaveLength(3);
    expect(summarizeInventory(next)).toMatchObject({
      expected: 3,
      found: 1,
      missing: 2,
      wrongLocation: 1,
      divergences: 3,
    });
  });
  it("recusa leitura duplicada, inclusive em outra posição", async () => {
    const f = fixture();
    const session = await f.service.start({ scope: "AREA", areaId: DEMO_AREA_ID });
    await f.service.record(session.id, box1, DEMO_LOCATION_IDS.a010101);
    await expect(f.service.record(session.id, box1, DEMO_LOCATION_IDS.a010101)).rejects.toThrow(
      "Esta caixa já foi contabilizada.",
    );
    await expect(f.service.record(session.id, box1, DEMO_LOCATION_IDS.a010102)).rejects.toThrow(
      "Esta caixa já foi contabilizada.",
    );
    expect(summarizeInventory((await f.service.getById(session.id))!).found).toBe(1);
  });
  it("recusa QR válido de caixa inexistente sem criar item", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    await expect(
      f.service.record(session.id, "orion://v1/box/CX-20261008-999999", f.location.locationId!),
    ).rejects.toThrow();
    expect((await f.service.getById(session.id))?.items).toEqual(session.items);
  });
  it("recusa QR de posição como caixa e leitura fora do escopo", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    await expect(
      f.service.record(session.id, "orion://v1/location/SUP-A-01-01-01", f.location.locationId!),
    ).rejects.toThrow("Leia o código de uma caixa");
    await expect(f.service.record(session.id, box1, DEMO_LOCATION_IDS.a010102)).rejects.toThrow(
      "pertencer ao escopo",
    );
  });
  it.each([
    ["AREA", {}, 28, 3],
    ["AISLE", { aisle: "A" }, 28, 3],
    ["RACK", { aisle: "A", rack: "01" }, 16, 3],
    ["LEVEL", { aisle: "A", rack: "01", level: "01" }, 4, 2],
  ] as const)("captura escopo %s", async (scope, structure, count, expected) => {
    const f = fixture();
    const session = await f.service.start({ scope, areaId: DEMO_AREA_ID, ...structure });
    expect(session.locations).toHaveLength(count);
    expect(session.items).toHaveLength(expected);
  });
  it("recusa escopo incompleto, área inexistente e posição de outra área", async () => {
    const f = fixture();
    await expect(f.service.start({ scope: "RACK", areaId: DEMO_AREA_ID })).rejects.toThrow();
    await expect(f.service.start({ scope: "AREA", areaId: "missing" })).rejects.toThrow(
      "Área não encontrada",
    );
    await expect(f.service.start({ ...f.location, locationId: "missing" })).rejects.toThrow();
    expect(await f.service.list()).toEqual([]);
  });
  it("movimentação durante a sessão não altera o esperado nem a classificação", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    await f.boxes.setCurrentLocation("seed-box-proadec-1", {
      nextLocationId: DEMO_LOCATION_IDS.a010102,
    });
    expect((await f.service.getById(session.id))?.catalogSnapshot).toEqual(session.catalogSnapshot);
    const counted = await f.service.record(session.id, box1, f.location.locationId!);
    expect(counted.items[0]?.classification).toBe("MATCH");
    expect((await f.boxes.getByCode(box1))?.currentLocationId).toBe(DEMO_LOCATION_IDS.a010102);
  });
  it("congela também o registro das caixas externas ao escopo", async () => {
    const f = fixture();
    const session = await f.service.start(f.location);
    await f.boxes.setCurrentLocation("seed-box-proadec-2", {
      nextLocationId: f.location.locationId,
    });
    const counted = await f.service.record(
      session.id,
      "CX-20261006-000002",
      f.location.locationId!,
    );
    expect(counted.items.find((item) => item.code.endsWith("000002"))?.classification).toBe(
      "WRONG_LOCATION",
    );
  });
  it.each(["complete", "cancel"] as const)(
    "%s encerra e impede todas as mudanças",
    async (operation) => {
      const f = fixture();
      const session = await f.service.start(f.location);
      const closed = await f.service[operation](session.id);
      expect(closed.status).toBe(operation === "complete" ? "COMPLETED" : "CANCELLED");
      await expect(f.service.record(session.id, box1, f.location.locationId!)).rejects.toThrow(
        "encerrada",
      );
      await expect(f.service.complete(session.id)).rejects.toThrow("encerrada");
      await expect(f.service.cancel(session.id)).rejects.toThrow("encerrada");
      expect(await f.service.getById(session.id)).toEqual(closed);
    },
  );
  it("lista e busca por código, caixa, escopo, notas e status", async () => {
    const f = fixture();
    const first = await f.service.start(f.location, "Conferência diária");
    const second = await f.service.start({ scope: "AREA", areaId: DEMO_AREA_ID });
    await f.service.cancel(second.id);
    expect(await f.service.list({ text: "conferencia diaria" })).toHaveLength(1);
    expect(await f.service.list({ text: box1 })).toHaveLength(2);
    expect(await f.service.list({ status: "IN_PROGRESS" })).toEqual([first]);
    expect(await f.service.list({ text: "Estoque Superior", status: "CANCELLED" })).toHaveLength(1);
    expect(await f.service.list({ text: "nao existe" })).toEqual([]);
  });
});
