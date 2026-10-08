import {
  StorageAreaNotFoundError,
  StorageAreaValidationError,
  assertUniqueAreaCode,
  assertValidAreaCreate,
  assertValidAreaUpdate,
  canonicalAreaCode,
  demoStorageAreas,
  isStorageAreaStatus,
  type StorageArea,
  type StorageAreaCreateInput,
  type StorageAreaRepository,
  type StorageAreaStatus,
  type StorageAreaUpdateInput,
} from "@orion/domain";

import type { KeyValueStore } from "./key-value-store";

const STORAGE_KEY = "orion-storage.storage-areas.v1";

type Envelope = { version: 1; areas: StorageArea[] };

export type Clock = () => string;
export type IdFactory = () => string;

/** Phase 2B adapter. React components must not import this module. */
export class LocalStorageStorageAreaRepository implements StorageAreaRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly ids: IdFactory = () => crypto.randomUUID(),
    private readonly now: Clock = () => new Date().toISOString(),
  ) {}

  async list(): Promise<StorageArea[]> {
    return this.readAll()
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
  }

  async getById(id: string): Promise<StorageArea | null> {
    return this.readAll().find((area) => area.id === id) ?? null;
  }

  async getByCode(code: string): Promise<StorageArea | null> {
    const key = canonicalAreaCode(code);
    return this.readAll().find((area) => canonicalAreaCode(area.code) === key) ?? null;
  }

  async create(input: StorageAreaCreateInput): Promise<StorageArea> {
    const valid = assertValidAreaCreate(input);
    const areas = this.readAll();
    const code = assertUniqueAreaCode(areas, valid.code);
    const timestamp = this.now();
    const area: StorageArea = {
      id: this.ids(),
      code,
      name: valid.name,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (valid.notes) area.notes = valid.notes;
    this.writeAll([...areas, area]);
    return cloneArea(area);
  }

  async update(id: string, input: StorageAreaUpdateInput): Promise<StorageArea> {
    const valid = assertValidAreaUpdate(input);
    const areas = this.readAll();
    const index = areas.findIndex((area) => area.id === id);
    const current = areas[index];
    if (!current) throw new StorageAreaNotFoundError(id);
    const updated: StorageArea = {
      ...cloneArea(current),
      name: valid.name,
      updatedAt: this.now(),
    };
    if (valid.notes) updated.notes = valid.notes;
    else delete updated.notes;
    areas[index] = updated;
    this.writeAll(areas);
    return cloneArea(updated);
  }

  async setStatus(id: string, status: StorageAreaStatus): Promise<StorageArea> {
    if (!isStorageAreaStatus(status)) {
      throw new StorageAreaValidationError([{ path: "status", message: "Status inválido." }]);
    }
    const areas = this.readAll();
    const index = areas.findIndex((area) => area.id === id);
    const current = areas[index];
    if (!current) throw new StorageAreaNotFoundError(id);
    if (current.status === status) return cloneArea(current);
    const updated: StorageArea = { ...cloneArea(current), status, updatedAt: this.now() };
    areas[index] = updated;
    this.writeAll(areas);
    return cloneArea(updated);
  }

  private readAll(): StorageArea[] {
    const raw = this.store.getItem(STORAGE_KEY);
    if (raw == null) {
      const seeded = demoStorageAreas();
      this.writeAll(seeded);
      return seeded.map(cloneArea);
    }
    try {
      const parsed = JSON.parse(raw) as Partial<Envelope>;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.areas)) return [];
      return parsed.areas.map(cloneArea);
    } catch {
      return [];
    }
  }

  private writeAll(areas: StorageArea[]) {
    const envelope: Envelope = { version: 1, areas };
    this.store.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }
}

function cloneArea(area: StorageArea): StorageArea {
  const clone: StorageArea = { ...area };
  if (!clone.notes) delete clone.notes;
  return clone;
}
