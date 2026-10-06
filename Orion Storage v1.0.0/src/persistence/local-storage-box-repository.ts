import {
  BoxNotFoundError,
  BoxValidationError,
  allocateBoxCode,
  assertValidBoxCreate,
  assertValidBoxUpdate,
  buildCreatedHistory,
  buildStatusHistory,
  buildUpdatedHistory,
  canonicalBoxCode,
  demoBoxState,
  insertBox,
  isBoxStatus,
  sanitizeBoxCodeLedger,
  type Box,
  type BoxCreateInput,
  type BoxHistoryEntry,
  type BoxPersistenceState,
  type BoxRepository,
  type BoxStatus,
  type BoxUpdateInput,
} from "@orion/domain";

import type { KeyValueStore } from "./key-value-store";

const STORAGE_KEY = "orion-storage.boxes.v1";

type Envelope = {
  version: 1;
  boxes: Box[];
  codeLedger: Record<string, number>;
};

export type Clock = () => string;
export type IdFactory = () => string;

/**
 * Phase 2A adapter. React components must not import this module.
 * The code ledger is stored with the boxes so the next number survives a refresh.
 */
export class LocalStorageBoxRepository implements BoxRepository {
  constructor(
    private readonly store: KeyValueStore,
    private readonly ids: IdFactory = () => crypto.randomUUID(),
    private readonly now: Clock = () => new Date().toISOString(),
  ) {}

  async list(): Promise<Box[]> {
    return this.readState().boxes.slice().sort(byCodeDesc);
  }

  async getById(id: string): Promise<Box | null> {
    return this.readState().boxes.find((box) => box.id === id) ?? null;
  }

  async getByCode(code: string): Promise<Box | null> {
    const canonical = canonicalBoxCode(code);
    if (!canonical) return null;
    return this.readState().boxes.find((box) => canonicalBoxCode(box.code) === canonical) ?? null;
  }

  async listByProductId(productId: string): Promise<Box[]> {
    return (await this.list()).filter((box) => box.productId === productId);
  }

  async create(input: BoxCreateInput): Promise<Box> {
    const valid = assertValidBoxCreate(input);
    const state = this.readState();
    const timestamp = this.now();
    const allocated = allocateBoxCode({
      existingCodes: state.boxes.map((box) => box.code),
      ledger: state.codeLedger,
      now: new Date(timestamp),
    });
    const id = this.ids();
    const box: Box = {
      id,
      code: allocated.code,
      productId: valid.productId,
      status: "RECEIVED",
      rollsQuantity: valid.rollsQuantity,
      totalLengthM: valid.totalLengthM,
      receivedAt: valid.receivedAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      history: [
        buildCreatedHistory({
          id: this.ids(),
          boxId: id,
          code: allocated.code,
          productId: valid.productId,
          createdAt: timestamp,
        }),
      ],
    };
    if (valid.manufacturerBatch) box.manufacturerBatch = valid.manufacturerBatch;
    if (valid.notes) box.notes = valid.notes;
    const next = insertBox({ boxes: state.boxes, codeLedger: allocated.ledger }, box);
    this.writeState(next);
    return cloneBox(box);
  }

  async update(id: string, input: BoxUpdateInput): Promise<Box> {
    const valid = assertValidBoxUpdate(input);
    const state = this.readState();
    const index = state.boxes.findIndex((box) => box.id === id);
    const current = state.boxes[index];
    if (!current) throw new BoxNotFoundError(id);

    const after: BoxUpdateInput = {
      rollsQuantity: valid.rollsQuantity,
      totalLengthM: valid.totalLengthM,
      receivedAt: valid.receivedAt,
    };
    if (valid.manufacturerBatch) after.manufacturerBatch = valid.manufacturerBatch;
    if (valid.notes) after.notes = valid.notes;

    const entry = buildUpdatedHistory({
      id: this.ids(),
      boxId: current.id,
      createdAt: this.now(),
      before: contentOf(current),
      after,
    });
    if (!entry) return cloneBox(current);

    const updated = withContent(current, after, entry);
    state.boxes[index] = updated;
    this.writeState(state);
    return cloneBox(updated);
  }

  async setStatus(id: string, status: BoxStatus): Promise<Box> {
    if (!isBoxStatus(status)) {
      throw new BoxValidationError([{ path: "status", message: "Status inválido." }]);
    }
    const state = this.readState();
    const index = state.boxes.findIndex((box) => box.id === id);
    const current = state.boxes[index];
    if (!current) throw new BoxNotFoundError(id);
    const entry = buildStatusHistory({
      id: this.ids(),
      boxId: current.id,
      createdAt: this.now(),
      previous: current.status,
      next: status,
    });
    if (!entry) return cloneBox(current);
    const updated: Box = {
      ...cloneBox(current),
      status,
      updatedAt: entry.createdAt,
      history: [...current.history.map(cloneHistory), entry],
    };
    state.boxes[index] = updated;
    this.writeState(state);
    return cloneBox(updated);
  }

  private readState(): BoxPersistenceState {
    const raw = this.store.getItem(STORAGE_KEY);
    if (raw == null) {
      const seeded = demoBoxState();
      this.writeState(seeded);
      return cloneState(seeded);
    }
    try {
      const parsed = JSON.parse(raw) as Partial<Envelope>;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.boxes)) {
        return { boxes: [], codeLedger: {} };
      }
      return {
        boxes: parsed.boxes.map(cloneBox),
        codeLedger: sanitizeBoxCodeLedger(parsed.codeLedger),
      };
    } catch {
      return { boxes: [], codeLedger: {} };
    }
  }

  private writeState(state: BoxPersistenceState) {
    const envelope: Envelope = {
      version: 1,
      boxes: state.boxes,
      codeLedger: state.codeLedger,
    };
    this.store.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }
}

function contentOf(box: Box): BoxUpdateInput {
  const content: BoxUpdateInput = {
    rollsQuantity: box.rollsQuantity,
    totalLengthM: box.totalLengthM,
    receivedAt: box.receivedAt,
  };
  if (box.manufacturerBatch) content.manufacturerBatch = box.manufacturerBatch;
  if (box.notes) content.notes = box.notes;
  return content;
}

function withContent(current: Box, content: BoxUpdateInput, entry: BoxHistoryEntry): Box {
  const updated: Box = {
    id: current.id,
    code: current.code,
    productId: current.productId,
    status: current.status,
    rollsQuantity: content.rollsQuantity,
    totalLengthM: content.totalLengthM,
    receivedAt: content.receivedAt,
    createdAt: current.createdAt,
    updatedAt: entry.createdAt,
    history: [...current.history.map(cloneHistory), entry],
  };
  if (content.manufacturerBatch) updated.manufacturerBatch = content.manufacturerBatch;
  if (content.notes) updated.notes = content.notes;
  return updated;
}

function byCodeDesc(a: Box, b: Box): number {
  return b.code.localeCompare(a.code) || b.createdAt.localeCompare(a.createdAt);
}

function cloneState(state: BoxPersistenceState): BoxPersistenceState {
  return {
    boxes: state.boxes.map(cloneBox),
    codeLedger: { ...state.codeLedger },
  };
}

function cloneBox(box: Box): Box {
  const clone: Box = {
    ...box,
    history: Array.isArray(box.history) ? box.history.map(cloneHistory) : [],
  };
  return clone;
}

function cloneHistory(entry: BoxHistoryEntry): BoxHistoryEntry {
  const clone: BoxHistoryEntry = {
    id: entry.id,
    boxId: entry.boxId,
    type: entry.type,
    createdAt: entry.createdAt,
    description: entry.description,
  };
  if (entry.metadata) clone.metadata = { ...entry.metadata };
  return clone;
}
