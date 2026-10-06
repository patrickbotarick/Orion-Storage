import {
  InactiveStorageAreaError,
  LocationNotFoundError,
  StorageAreaNotFoundError,
  assertCapacityCoversOccupancy,
  assertStructureEditable,
  assertUniqueLocation,
  assertValidAreaCreate,
  assertValidAreaUpdate,
  assertValidLocationForm,
  buildLocationCode,
  canonicalStructure,
  countBoxesAtLocation,
  sameLocationStructure,
  type BoxRepository,
  type Location,
  type LocationDraft,
  type LocationRepository,
  type LocationStatus,
  type StorageArea,
  type StorageAreaCreateInput,
  type StorageAreaRepository,
  type StorageAreaStatus,
  type StorageAreaUpdateInput,
} from "@orion/domain";

import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageLocationRepository } from "@/persistence/local-storage-location-repository";
import { LocalStorageStorageAreaRepository } from "@/persistence/local-storage-storage-area-repository";

export type LocationService = {
  listAreas(): Promise<StorageArea[]>;
  createArea(input: StorageAreaCreateInput): Promise<StorageArea>;
  updateArea(id: string, input: StorageAreaUpdateInput): Promise<StorageArea>;
  setAreaStatus(id: string, status: StorageAreaStatus): Promise<StorageArea>;
  listLocations(): Promise<Location[]>;
  listLocationsByArea(areaId: string): Promise<Location[]>;
  createLocation(input: Omit<LocationDraft, "code">): Promise<Location>;
  updateLocation(id: string, input: Omit<LocationDraft, "code">): Promise<Location>;
  setLocationStatus(id: string, status: LocationStatus): Promise<Location>;
};

export function createLocationService(
  areas: StorageAreaRepository,
  locations: LocationRepository,
  boxes: BoxRepository,
): LocationService {
  return {
    listAreas: () => areas.list(),
    async createArea(input) {
      return areas.create(assertValidAreaCreate(input));
    },
    async updateArea(id, input) {
      return areas.update(id, assertValidAreaUpdate(input));
    },
    setAreaStatus: (id, status) => areas.setStatus(id, status),
    listLocations: () => locations.list(),
    listLocationsByArea: (areaId) => locations.listByAreaId(areaId),
    async createLocation(input) {
      const draft = await prepareDraft(areas, locations, input);
      return locations.create(draft);
    },
    async updateLocation(id, input) {
      const current = await locations.getById(id);
      if (!current) throw new LocationNotFoundError(id);
      const occupied = countBoxesAtLocation(await boxes.list(), id);
      const changed = !sameLocationStructure(current, input);
      assertStructureEditable(occupied, changed);
      const draft = await prepareDraft(areas, locations, input, id, changed);
      assertCapacityCoversOccupancy(draft.capacityBoxes, occupied);
      return locations.update(id, draft);
    },
    setLocationStatus: (id, status) => locations.setStatus(id, status),
  };
}

async function prepareDraft(
  areas: StorageAreaRepository,
  locations: LocationRepository,
  input: Omit<LocationDraft, "code">,
  ignoreId?: string,
  requireActiveArea = true,
): Promise<LocationDraft> {
  const valid = assertValidLocationForm(input);
  const area = await areas.getById(valid.areaId);
  if (!area) throw new StorageAreaNotFoundError(valid.areaId);
  if (requireActiveArea && area.status !== "ACTIVE") throw new InactiveStorageAreaError(area.id);
  const structure = canonicalStructure(valid);
  const draft: LocationDraft = {
    ...structure,
    code: buildLocationCode(area.code, structure),
  };
  if (valid.capacityBoxes != null) draft.capacityBoxes = valid.capacityBoxes;
  if (valid.notes) draft.notes = valid.notes;
  assertUniqueLocation(await locations.list(), draft, ignoreId);
  return draft;
}

let browserService: LocationService | null = null;

export function getBrowserLocationService(): LocationService {
  if (typeof window === "undefined") {
    throw new Error("O endereçamento só está disponível no navegador.");
  }
  if (!browserService) {
    const store = window.localStorage;
    browserService = createLocationService(
      new LocalStorageStorageAreaRepository(store),
      new LocalStorageLocationRepository(store),
      new LocalStorageBoxRepository(store),
    );
  }
  return browserService;
}
