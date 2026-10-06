import {
  BoxNotFoundError,
  InactiveStorageAreaError,
  LocationNotFoundError,
  StorageAreaNotFoundError,
  assertLocationAssignable,
  assertLocationHasRoom,
  planMovement,
  type Box,
  type BoxRepository,
  type LocationRepository,
  type Movement,
  type MovementRepository,
  type MovementSource,
  type StorageAreaRepository,
} from "@orion/domain";

import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageMovementRepository } from "@/persistence/local-storage-movement-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";

export type MovementService = {
  list(): Promise<Movement[]>;
  listByBoxId(boxId: string): Promise<Movement[]>;
  listByLocationId(locationId: string): Promise<Movement[]>;
  place(boxId: string, locationId: string, source: MovementSource, notes?: string): Promise<Movement>;
  remove(boxId: string, source: MovementSource, notes?: string): Promise<Movement>;
};

export function createMovementService(
  boxes: BoxRepository,
  locations: LocationRepository,
  areas: StorageAreaRepository,
  movements: MovementRepository,
  ids: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
): MovementService {
  return {
    list: () => movements.list(),
    listByBoxId: (boxId) => movements.listByBoxId(boxId),
    listByLocationId: (locationId) => movements.listByLocationId(locationId),
    async place(boxId, locationId, source, notes) {
      const box = await requireBox(boxes, boxId);
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
      const plan = planMovement(box.currentLocationId, location.id);
      return commit(boxes, movements, ids, now, box, {
        type: plan.type,
        boxId: box.id,
        fromLocationId: plan.fromLocationId,
        toLocationId: plan.toLocationId,
        source,
        notes,
        nextLocationId: location.id,
        previousCode: previous?.code,
        nextCode: location.code,
      });
    },
    async remove(boxId, source, notes) {
      const box = await requireBox(boxes, boxId);
      const plan = planMovement(box.currentLocationId, undefined);
      const previous = box.currentLocationId
        ? await locations.getById(box.currentLocationId)
        : null;
      return commit(boxes, movements, ids, now, box, {
        type: plan.type,
        boxId: box.id,
        fromLocationId: plan.fromLocationId,
        source,
        notes,
        previousCode: previous?.code,
      });
    },
  };
}

async function commit(
  boxes: BoxRepository,
  movements: MovementRepository,
  ids: () => string,
  now: () => string,
  snapshot: Box,
  input: {
    type: Movement["type"];
    boxId: string;
    fromLocationId?: string;
    toLocationId?: string;
    source: MovementSource;
    notes?: string;
    nextLocationId?: string;
    previousCode?: string;
    nextCode?: string;
  },
): Promise<Movement> {
  const movement: Movement = {
    id: ids(),
    type: input.type,
    boxId: input.boxId,
    createdAt: now(),
    source: input.source,
    metadata: {},
  };
  if (input.fromLocationId) movement.fromLocationId = input.fromLocationId;
  if (input.toLocationId) movement.toLocationId = input.toLocationId;
  if (input.notes?.trim()) movement.notes = input.notes.trim();
  if (input.previousCode) movement.metadata!.fromLocationCode = input.previousCode;
  if (input.nextCode) movement.metadata!.toLocationCode = input.nextCode;
  const box = await boxes.getById(snapshot.id);
  if (box?.code) movement.metadata!.boxCode = box.code;
  if (movement.metadata && Object.keys(movement.metadata).length === 0) delete movement.metadata;

  await boxes.setCurrentLocation(snapshot.id, {
    nextLocationId: input.nextLocationId,
    previousCode: input.previousCode,
    nextCode: input.nextCode,
    movementId: movement.id,
  });
  try {
    return await movements.create(movement);
  } catch (caught) {
    await boxes.replace(snapshot);
    throw caught;
  }
}

async function requireBox(boxes: BoxRepository, boxId: string): Promise<Box> {
  const box = await boxes.getById(boxId);
  if (!box) throw new BoxNotFoundError(boxId);
  return box;
}

let browserService: MovementService | null = null;

export function getBrowserMovementService(): MovementService {
  if (typeof window === "undefined") {
    throw new Error("A movimentação só está disponível no navegador.");
  }
  if (!browserService) {
    const store = window.localStorage;
    browserService = createMovementService(
      new LocalStorageBoxRepository(store),
      new LocalStorageLocationRepository(store),
      new LocalStorageStorageAreaRepository(store),
      new LocalStorageMovementRepository(store),
    );
  }
  return browserService;
}
