import {
  LocationNotFoundError,
  LocationValidationError,
  assertUniqueLocation,
  assertValidLocationForm,
  canonicalStructure,
  demoLocations,
  isLocationStatus,
  type Location,
  type LocationDraft,
  type LocationRepository,
  type LocationStatus,
} from "@orion/domain";

import type { KeyValueStore } from "./key-value-store";

const STORAGE_KEY = "orion-storage.locations.v1";

type Envelope = { version: 1; locations: Location[] };

export type Clock = () => string;
export type IdFactory = () => string;

/** Phase 2B adapter. React components must not import this module. */
export class LocalStorageLocationRepository implements LocationRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly ids: IdFactory = () => crypto.randomUUID(),
    private readonly now: Clock = () => new Date().toISOString(),
  ) {}

  async list(): Promise<Location[]> {
    return this.readAll()
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getById(id: string): Promise<Location | null> {
    return this.readAll().find((location) => location.id === id) ?? null;
  }

  async getByCode(code: string): Promise<Location | null> {
    const key = code.trim().toUpperCase();
    return this.readAll().find((location) => location.code.toUpperCase() === key) ?? null;
  }

  async listByAreaId(areaId: string): Promise<Location[]> {
    return (await this.list()).filter((location) => location.areaId === areaId);
  }

  async create(input: LocationDraft): Promise<Location> {
    const draft = normalizeDraft(input);
    const locations = this.readAll();
    assertUniqueLocation(locations, draft);
    const timestamp = this.now();
    const location: Location = {
      id: this.ids(),
      code: draft.code,
      areaId: draft.areaId,
      aisle: draft.aisle,
      rack: draft.rack,
      level: draft.level,
      position: draft.position,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (draft.capacityBoxes != null) location.capacityBoxes = draft.capacityBoxes;
    if (draft.notes) location.notes = draft.notes;
    this.writeAll([...locations, location]);
    return cloneLocation(location);
  }

  async update(id: string, input: LocationDraft): Promise<Location> {
    const draft = normalizeDraft(input);
    const locations = this.readAll();
    const index = locations.findIndex((location) => location.id === id);
    const current = locations[index];
    if (!current) throw new LocationNotFoundError(id);
    assertUniqueLocation(locations, draft, id);
    const updated: Location = {
      ...cloneLocation(current),
      code: draft.code,
      areaId: draft.areaId,
      aisle: draft.aisle,
      rack: draft.rack,
      level: draft.level,
      position: draft.position,
      updatedAt: this.now(),
    };
    if (draft.capacityBoxes != null) updated.capacityBoxes = draft.capacityBoxes;
    else delete updated.capacityBoxes;
    if (draft.notes) updated.notes = draft.notes;
    else delete updated.notes;
    locations[index] = updated;
    this.writeAll(locations);
    return cloneLocation(updated);
  }

  async setStatus(id: string, status: LocationStatus): Promise<Location> {
    if (!isLocationStatus(status)) {
      throw new LocationValidationError([{ path: "status", message: "Status inválido." }]);
    }
    const locations = this.readAll();
    const index = locations.findIndex((location) => location.id === id);
    const current = locations[index];
    if (!current) throw new LocationNotFoundError(id);
    if (current.status === status) return cloneLocation(current);
    const updated: Location = { ...cloneLocation(current), status, updatedAt: this.now() };
    locations[index] = updated;
    this.writeAll(locations);
    return cloneLocation(updated);
  }

  private readAll(): Location[] {
    const raw = this.store.getItem(STORAGE_KEY);
    if (raw == null) {
      const seeded = demoLocations();
      this.writeAll(seeded);
      return seeded.map(cloneLocation);
    }
    try {
      const parsed = JSON.parse(raw) as Partial<Envelope>;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.locations)) return [];
      return parsed.locations.map(cloneLocation);
    } catch {
      return [];
    }
  }

  private writeAll(locations: Location[]) {
    const envelope: Envelope = { version: 1, locations };
    this.store.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }
}

function normalizeDraft(input: LocationDraft): LocationDraft {
  const valid = assertValidLocationForm(input);
  const parts = canonicalStructure(valid);
  const draft: LocationDraft = {
    ...parts,
    code: input.code.trim().toUpperCase(),
  };
  if (!draft.code) {
    throw new LocationValidationError([{ path: "code", message: "O código do endereço é obrigatório." }]);
  }
  if (valid.capacityBoxes != null) draft.capacityBoxes = valid.capacityBoxes;
  if (valid.notes) draft.notes = valid.notes;
  return draft;
}

function cloneLocation(location: Location): Location {
  const clone: Location = { ...location };
  if (clone.capacityBoxes == null) delete clone.capacityBoxes;
  if (!clone.notes) delete clone.notes;
  return clone;
}
