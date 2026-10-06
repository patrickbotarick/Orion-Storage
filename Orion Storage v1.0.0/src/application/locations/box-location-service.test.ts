import { describe, expect, it } from "vitest";

import {
  DEMO_LOCATION_IDS,
  DuplicateStorageAreaCodeError,
  LocationCapacityError,
  LocationNotAssignableError,
  LocationNotFoundError,
} from "@orion/domain";

import { createBoxLocationService } from "@/application/locations/box-location-service";
import { createLocationService } from "@/application/locations/location-service";
import { MemoryKeyValueStore } from "@/persistence/key-value-store";
import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";

function harness() {
  const store = new MemoryKeyValueStore();
  let nextId = 0;
  const ids = () => `id-${++nextId}`;
  const now = () => "2026-10-07T12:00:00.000Z";
  const areas = new LocalStorageStorageAreaRepository(store, ids, now);
  const locations = new LocalStorageLocationRepository(store, ids, now);
  const boxes = new LocalStorageBoxRepository(store, ids, now);
  return {
    areas,
    locations,
    boxes,
    locationsApi: createLocationService(areas, locations, boxes),
    placement: createBoxLocationService(boxes, locations, areas),
  };
}

describe("endereçamento da caixa", () => {
  it("lista posições da área, atribui, troca, remove e registra o histórico", async () => {
    const { locations, boxes, locationsApi, placement } = harness();
    const area = await locationsApi.createArea({ code: " exp ", name: "Expedição" });
    expect(area.code).toBe("EXP");
    expect(area.status).toBe("ACTIVE");
    await expect(locationsApi.createArea({ code: "EXP", name: "Outra" })).rejects.toBeInstanceOf(
      DuplicateStorageAreaCodeError,
    );
    const byArea = await locations.listByAreaId("seed-area-sup");
    expect(byArea.map((item) => item.code)).toContain("SUP-A-01-01-01");
    expect(byArea).toHaveLength(6);

    const loose = (await boxes.list()).find((box) => box.id === "seed-box-real-2");
    expect(loose?.currentLocationId).toBeUndefined();
    const assigned = await placement.assign(loose!.id, DEMO_LOCATION_IDS.a020101);
    expect(assigned.currentLocationId).toBe(DEMO_LOCATION_IDS.a020101);
    expect(assigned.history.at(-1)?.type).toBe("LOCATION_ASSIGNED");

    const edited = await boxes.update(assigned.id, {
      rollsQuantity: assigned.rollsQuantity,
      totalLengthM: assigned.totalLengthM,
      receivedAt: assigned.receivedAt,
      notes: "Ajuste sem perder o endereço",
    });
    expect(edited.currentLocationId).toBe(DEMO_LOCATION_IDS.a020101);

    const moved = await placement.assign(assigned.id, DEMO_LOCATION_IDS.a020102);
    expect(moved.currentLocationId).toBe(DEMO_LOCATION_IDS.a020102);
    expect(moved.history.at(-1)?.type).toBe("LOCATION_CHANGED");
    expect(moved.history.at(-1)?.metadata?.previousLocationCode).toBe("SUP-A-02-01-01");

    const cleared = await placement.clear(moved.id);
    expect(cleared.currentLocationId).toBeUndefined();
    expect(cleared.history.at(-1)?.type).toBe("LOCATION_CLEARED");

    await expect(placement.assign(cleared.id, "nao-existe")).rejects.toBeInstanceOf(
      LocationNotFoundError,
    );

    await locationsApi.setLocationStatus(DEMO_LOCATION_IDS.a020101, "BLOCKED");
    await expect(placement.assign(cleared.id, DEMO_LOCATION_IDS.a020101)).rejects.toBeInstanceOf(
      LocationNotAssignableError,
    );
    await locationsApi.setLocationStatus(DEMO_LOCATION_IDS.a020101, "INACTIVE");
    await expect(placement.assign(cleared.id, DEMO_LOCATION_IDS.a020101)).rejects.toBeInstanceOf(
      LocationNotAssignableError,
    );

    const created = await locationsApi.createLocation({
      areaId: "seed-area-sup",
      aisle: "B",
      rack: "01",
      level: "01",
      position: "01",
      capacityBoxes: 1,
    });
    expect(created.code).toBe("SUP-B-01-01-01");
    expect(created.status).toBe("ACTIVE");
    await placement.assign(cleared.id, created.id);
    const other = (await boxes.list()).find((box) => box.id === "seed-box-proadec-2");
    await expect(placement.assign(other!.id, created.id)).rejects.toBeInstanceOf(
      LocationCapacityError,
    );
    expect((await boxes.getById(other!.id))?.currentLocationId).toBe(DEMO_LOCATION_IDS.a010102);
  });
});
