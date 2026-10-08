import {
  BoxNotFoundError,
  InactiveStorageAreaError,
  LocationNotFoundError,
  StorageAreaNotFoundError,
  assertLocationAssignable,
  assertLocationHasRoom,
  type Box,
  type BoxRepository,
  type LocationRepository,
  type StorageAreaRepository,
} from "@orion/domain";

import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";

export type BoxLocationService = {
  assign(boxId: string, locationId: string): Promise<Box>;
  clear(boxId: string): Promise<Box>;
};

export function createBoxLocationService(
  boxes: BoxRepository,
  locations: LocationRepository,
  areas: StorageAreaRepository,
): BoxLocationService {
  return {
    async assign(boxId, locationId) {
      const box = await boxes.getById(boxId);
      if (!box) throw new BoxNotFoundError(boxId);
      if (box.currentLocationId === locationId) return box;
      const location = await locations.getById(locationId);
      if (!location) throw new LocationNotFoundError(locationId);
      assertLocationAssignable(location.status);
      const area = await areas.getById(location.areaId);
      if (!area) throw new StorageAreaNotFoundError(location.areaId);
      if (area.status !== "ACTIVE") throw new InactiveStorageAreaError(area.id);
      assertLocationHasRoom({
        capacityBoxes: location.capacityBoxes,
        boxes: await boxes.list(),
        locationId: location.id,
        movingBoxId: box.id,
      });
      const previous = box.currentLocationId
        ? await locations.getById(box.currentLocationId)
        : null;
      return boxes.setCurrentLocation(box.id, {
        nextLocationId: location.id,
        nextCode: location.code,
        previousCode: previous?.code,
      });
    },
    async clear(boxId) {
      const box = await boxes.getById(boxId);
      if (!box) throw new BoxNotFoundError(boxId);
      if (!box.currentLocationId) return box;
      const previous = await locations.getById(box.currentLocationId);
      return boxes.setCurrentLocation(box.id, { previousCode: previous?.code });
    },
  };
}

let browserService: BoxLocationService | null = null;

export function getBrowserBoxLocationService(): BoxLocationService {
  if (typeof window === "undefined") {
    throw new Error("O endereçamento da caixa só está disponível no navegador.");
  }
  if (!browserService) {
    const store = window.localStorage;
    browserService = createBoxLocationService(
      new LocalStorageBoxRepository(store),
      new LocalStorageLocationRepository(store),
      new LocalStorageStorageAreaRepository(store),
    );
  }
  return browserService;
}
