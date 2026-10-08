import {
  allocateBoxCode,
  assertInventoryOpen,
  filterInventories,
  InventoryError,
  type InventoryRepository,
  type InventorySession,
} from "@orion/domain";
import type { KeyValueStore } from "./key-value-store";

export const INVENTORY_STORAGE_KEY = "orion-storage.inventories.v1";
type Envelope = { version: 1; sessions: InventorySession[]; codeLedger: Record<string, number> };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class LocalStorageInventoryRepository implements InventoryRepository {
  constructor(private readonly store: KeyValueStore) {}

  async list() {
    return filterInventories(this.read().sessions, {});
  }
  async getById(id: string) {
    return this.read().sessions.find((session) => session.id === id) ?? null;
  }

  async create(input: Omit<InventorySession, "code">): Promise<InventorySession> {
    const state = this.read();
    if (state.sessions.some((session) => session.id === input.id))
      throw new InventoryError("Sessão já existente.");
    const allocated = allocateBoxCode({
      existingCodes: state.sessions.map((session) => session.code.replace(/^INV-/, "CX-")),
      ledger: state.codeLedger,
      now: new Date(input.startedAt),
    });
    const session: InventorySession = {
      ...clone(input),
      code: allocated.code.replace(/^CX-/, "INV-"),
    };
    this.write({
      version: 1,
      sessions: [...state.sessions, session],
      codeLedger: allocated.ledger,
    });
    return clone(session);
  }

  async save(session: InventorySession, expectedRevision: number): Promise<InventorySession> {
    const state = this.read();
    const current = state.sessions.find((item) => item.id === session.id);
    if (!current) throw new InventoryError("Inventário não encontrado.");
    assertInventoryOpen(current);
    if (current.revision !== expectedRevision || session.revision !== expectedRevision + 1) {
      throw new InventoryError("A sessão mudou em outra operação. Abra o inventário novamente.");
    }
    const immutable = (value: InventorySession) => {
      const {
        items: _items,
        status: _status,
        updatedAt: _updatedAt,
        revision: _revision,
        completedAt: _completedAt,
        cancelledAt: _cancelledAt,
        ...snapshot
      } = value;
      return snapshot;
    };
    if (JSON.stringify(immutable(current)) !== JSON.stringify(immutable(session))) {
      throw new InventoryError("O snapshot e o escopo da sessão são imutáveis.");
    }
    this.write({
      ...state,
      sessions: state.sessions.map((item) => (item.id === session.id ? clone(session) : item)),
    });
    return clone(session);
  }

  private read(): Envelope {
    const raw = this.store.getItem(INVENTORY_STORAGE_KEY);
    if (raw == null) return { version: 1, sessions: [], codeLedger: {} };
    try {
      const parsed = JSON.parse(raw) as Envelope;
      if (parsed.version !== 1 || !Array.isArray(parsed.sessions) || !parsed.codeLedger)
        throw new Error();
      return parsed;
    } catch {
      // Do not overwrite unreadable inventory records with an empty list.
      throw new InventoryError(
        "Os dados de inventário estão inválidos. Preserve o armazenamento antes de continuar.",
      );
    }
  }
  private write(state: Envelope) {
    this.store.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(state));
  }
}
