import { describe, expect, it } from "vitest";

import {
  DEMO_LOCATION_IDS,
  DuplicateMovementError,
  InactiveStorageAreaError,
  LocationCapacityError,
  LocationNotAssignableError,
  LocationNotFoundError,
  SameLocationMovementError,
  type Movement,
  type MovementRepository,
} from "@orion/domain";

import { createMovementService } from "@/application/movements/movement-service";
import { MemoryKeyValueStore } from "@/persistence/key-value-store";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageMovementRepository } from "@/persistence/local-storage-movement-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";

function harness() {
  const store = new MemoryKeyValueStore();
  let nextId = 0;
  const ids = () => `mov-${++nextId}`;
  const now = () => "2026-10-07T12:00:00.000Z";
  const areas = new LocalStorageStorageAreaRepository(store, ids, now);
  const locations = new LocalStorageLocationRepository(store, ids, now);
  const boxes = new LocalStorageBoxRepository(store, ids, now);
  const movements = new LocalStorageMovementRepository(store);
  return {
    areas,
    locations,
    boxes,
    movements,
    service: createMovementService(boxes, locations, areas, movements, ids, now),
  };
}

describe("movimentação", () => {
  it("armazena, move, remove e não inventa histórico antigo", async () => {
    const { boxes, movements, service } = harness();
    const before = await movements.list();
    expect(before).toEqual([]);
    const loose = (await boxes.list()).find((box) => box.id === "seed-box-real-2");
    expect(loose?.currentLocationId).toBeUndefined();

    const stored = await service.place(loose!.id, DEMO_LOCATION_IDS.a020101, "SCAN");
    expect(stored.type).toBe("STORED");
    expect(stored.source).toBe("SCAN");
    expect(stored.toLocationId).toBe(DEMO_LOCATION_IDS.a020101);
    let box = await boxes.getById(loose!.id);
    expect(box?.currentLocationId).toBe(DEMO_LOCATION_IDS.a020101);
    expect(box?.history.at(-1)?.metadata?.movementId).toBe(stored.id);

    const moved = await service.place(loose!.id, DEMO_LOCATION_IDS.a020102, "MANUAL");
    expect(moved.type).toBe("MOVED");
    expect(moved.source).toBe("MANUAL");
    expect(moved.fromLocationId).toBe(DEMO_LOCATION_IDS.a020101);
    box = await boxes.getById(loose!.id);
    expect(box?.currentLocationId).toBe(DEMO_LOCATION_IDS.a020102);
    expect(box?.history.at(-1)?.type).toBe("LOCATION_CHANGED");
    expect(box?.history.at(-1)?.metadata?.movementId).toBe(moved.id);

    const removed = await service.remove(loose!.id, "SCAN");
    expect(removed.type).toBe("REMOVED");
    expect(removed.fromLocationId).toBe(DEMO_LOCATION_IDS.a020102);
    expect(removed.toLocationId).toBeUndefined();
    box = await boxes.getById(loose!.id);
    expect(box?.currentLocationId).toBeUndefined();
    expect(box?.history.at(-1)?.metadata?.movementId).toBe(removed.id);

    const all = await movements.list();
    expect(all.map((item) => item.id)).toEqual([removed.id, moved.id, stored.id]);
    expect(await movements.listByBoxId(loose!.id)).toHaveLength(3);
    expect(await movements.listByLocationId(DEMO_LOCATION_IDS.a020101)).toEqual([moved, stored]);
    expect((await movements.listByLocationId(DEMO_LOCATION_IDS.a020102)).map((item) => item.type)).toEqual([
      "REMOVED",
      "MOVED",
    ]);
  });

  it("rejeita o mesmo endereço, destino inválido, bloqueio, inatividade e capacidade", async () => {
    const { areas, locations, boxes, movements, service } = harness();
    const placed = (await boxes.list()).find((box) => box.id === "seed-box-proadec-1")!;
    await expect(service.place(placed.id, placed.currentLocationId!, "MANUAL")).rejects.toBeInstanceOf(
      SameLocationMovementError,
    );
    expect(await movements.list()).toHaveLength(0);

    await expect(service.place(placed.id, "nao-existe", "SCAN")).rejects.toBeInstanceOf(
      LocationNotFoundError,
    );

    await locations.setStatus(DEMO_LOCATION_IDS.a020101, "BLOCKED");
    await expect(service.place(placed.id, DEMO_LOCATION_IDS.a020101, "SCAN")).rejects.toBeInstanceOf(
      LocationNotAssignableError,
    );
    await locations.setStatus(DEMO_LOCATION_IDS.a020101, "INACTIVE");
    await expect(service.place(placed.id, DEMO_LOCATION_IDS.a020101, "SCAN")).rejects.toBeInstanceOf(
      LocationNotAssignableError,
    );

    await areas.setStatus("seed-area-sup", "INACTIVE");
    await expect(service.place(placed.id, DEMO_LOCATION_IDS.a020102, "SCAN")).rejects.toBeInstanceOf(
      InactiveStorageAreaError,
    );
    await areas.setStatus("seed-area-sup", "ACTIVE");

    const tight = await locations.create({
      areaId: "seed-area-sup",
      aisle: "Z",
      rack: "01",
      level: "01",
      position: "01",
      code: "SUP-Z-01-01-01",
      capacityBoxes: 1,
    });
    await service.place(placed.id, tight.id, "MANUAL");
    const other = (await boxes.list()).find((box) => box.id === "seed-box-real-2")!;
    await expect(service.place(other.id, tight.id, "SCAN")).rejects.toBeInstanceOf(LocationCapacityError);
    expect((await boxes.getById(other.id))?.currentLocationId).toBeUndefined();
  });

  it("desfaz a caixa se a movimentação não for gravada e recusa id repetido", async () => {
    const store = new MemoryKeyValueStore();
    const ids = () => "fixed-id";
    const now = () => "2026-10-07T12:00:00.000Z";
    const areas = new LocalStorageStorageAreaRepository(store, () => "area-x", now);
    const locations = new LocalStorageLocationRepository(store, () => "loc-x", now);
    const boxes = new LocalStorageBoxRepository(store, () => "box-x", now);
    const failing: MovementRepository = {
      list: async () => [],
      getById: async () => null,
      listByBoxId: async () => [],
      listByLocationId: async () => [],
      create: async () => {
        throw new Error("falha de gravação");
      },
    };
    const service = createMovementService(boxes, locations, areas, failing, ids, now);
    const loose = (await boxes.list()).find((box) => box.id === "seed-box-real-2")!;
    await expect(service.place(loose.id, DEMO_LOCATION_IDS.a020101, "SCAN")).rejects.toThrow(
      "falha de gravação",
    );
    const restored = await boxes.getById(loose.id);
    expect(restored?.currentLocationId).toBeUndefined();
    expect(restored?.history.some((entry) => entry.metadata?.movementId)).toBe(false);

    const movements = new LocalStorageMovementRepository(store);
    const keeper = createMovementService(boxes, locations, areas, movements, ids, now);
    await keeper.place(loose.id, DEMO_LOCATION_IDS.a020101, "SCAN");
    const duplicate: Movement = {
      id: "fixed-id",
      type: "STORED",
      boxId: loose.id,
      toLocationId: DEMO_LOCATION_IDS.a020102,
      createdAt: now(),
      source: "MANUAL",
    };
    await expect(movements.create(duplicate)).rejects.toBeInstanceOf(DuplicateMovementError);
    expect(await movements.list()).toHaveLength(1);
  });
});
