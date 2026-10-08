import {
  assertAppendOnly,
  type Movement,
  type MovementRepository,
} from "@orion/domain";

import type { KeyValueStore } from "./key-value-store";

const STORAGE_KEY = "orion-storage.movements.v1";

type Envelope = { version: 1; movements: Movement[] };

export class LocalStorageMovementRepository implements MovementRepository {
  constructor(private readonly store: KeyValueStore) {}

  async list(): Promise<Movement[]> {
    return this.readAll()
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }

  async getById(id: string): Promise<Movement | null> {
    return this.readAll().find((movement) => movement.id === id) ?? null;
  }

  async listByBoxId(boxId: string): Promise<Movement[]> {
    return (await this.list()).filter((movement) => movement.boxId === boxId);
  }

  async listByLocationId(locationId: string): Promise<Movement[]> {
    return (await this.list()).filter(
      (movement) => movement.fromLocationId === locationId || movement.toLocationId === locationId,
    );
  }

  async create(movement: Movement): Promise<Movement> {
    const movements = this.readAll();
    assertAppendOnly(movements, movement);
    const stored = cloneMovement(movement);
    this.writeAll([...movements, stored]);
    return cloneMovement(stored);
  }

  private readAll(): Movement[] {
    const raw = this.store.getItem(STORAGE_KEY);
    if (raw == null) return [];
    try {
      const parsed = JSON.parse(raw) as Partial<Envelope>;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.movements)) return [];
      return parsed.movements.map(cloneMovement);
    } catch {
      return [];
    }
  }

  private writeAll(movements: Movement[]) {
    const envelope: Envelope = { version: 1, movements };
    this.store.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }
}

function cloneMovement(movement: Movement): Movement {
  const clone: Movement = {
    id: movement.id,
    type: movement.type,
    boxId: movement.boxId,
    createdAt: movement.createdAt,
    source: movement.source,
  };
  if (movement.fromLocationId) clone.fromLocationId = movement.fromLocationId;
  if (movement.toLocationId) clone.toLocationId = movement.toLocationId;
  if (movement.notes) clone.notes = movement.notes;
  if (movement.metadata) clone.metadata = { ...movement.metadata };
  return clone;
}
