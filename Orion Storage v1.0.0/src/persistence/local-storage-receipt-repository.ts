import {
  DuplicateReceiptRequestError,
  assertReceiptCodeAvailable,
  canonicalReceiptCode,
  sanitizeReceiptCodeLedger,
  type Receipt,
  type ReceiptCodeLedger,
  type ReceiptPersistenceState,
  type ReceiptRepository,
} from "@orion/domain";

import type { KeyValueStore } from "./key-value-store";

const STORAGE_KEY = "orion-storage.receipts.v1";

type Envelope = { version: 1; receipts: Receipt[]; codeLedger: ReceiptCodeLedger };

/**
 * Confirmed receipts only. A missing key starts empty: old boxes are not turned into a receipt.
 */
export class LocalStorageReceiptRepository implements ReceiptRepository {
  constructor(private readonly store: KeyValueStore) {}

  async list(): Promise<Receipt[]> {
    return this.readState()
      .receipts.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.code.localeCompare(a.code));
  }

  async getById(id: string): Promise<Receipt | null> {
    return this.readState().receipts.find((receipt) => receipt.id === id) ?? null;
  }

  async getByCode(code: string): Promise<Receipt | null> {
    const canonical = canonicalReceiptCode(code);
    if (!canonical) return null;
    return (
      this.readState().receipts.find(
        (receipt) => canonicalReceiptCode(receipt.code) === canonical,
      ) ?? null
    );
  }

  async findByRequestId(requestId: string): Promise<Receipt | null> {
    const key = requestId.trim();
    if (!key) return null;
    return this.readState().receipts.find((receipt) => receipt.requestId === key) ?? null;
  }

  async listByProductId(productId: string): Promise<Receipt[]> {
    return (await this.list()).filter((receipt) =>
      receipt.items.some((item) => item.productId === productId),
    );
  }

  async listByDateRange(from: string, to: string): Promise<Receipt[]> {
    return (await this.list()).filter(
      (receipt) => receipt.receivedAt >= from && receipt.receivedAt <= to,
    );
  }

  async captureState(): Promise<ReceiptPersistenceState> {
    return this.readState();
  }

  async create(receipt: Receipt, ledger: ReceiptCodeLedger): Promise<Receipt> {
    const state = this.readState();
    if (state.receipts.some((item) => item.requestId === receipt.requestId)) {
      throw new DuplicateReceiptRequestError(receipt.requestId);
    }
    assertReceiptCodeAvailable(
      receipt.code,
      state.receipts.map((item) => item.code),
    );
    const stored = cloneReceipt(receipt);
    this.writeState({
      receipts: [...state.receipts, stored],
      codeLedger: sanitizeReceiptCodeLedger(ledger),
    });
    return cloneReceipt(stored);
  }

  private readState(): ReceiptPersistenceState {
    const raw = this.store.getItem(STORAGE_KEY);
    if (raw == null) return { receipts: [], codeLedger: {} };
    try {
      const parsed = JSON.parse(raw) as Partial<Envelope>;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.receipts)) {
        return { receipts: [], codeLedger: {} };
      }
      return {
        receipts: parsed.receipts.map(cloneReceipt),
        codeLedger: sanitizeReceiptCodeLedger(parsed.codeLedger),
      };
    } catch {
      return { receipts: [], codeLedger: {} };
    }
  }

  private writeState(state: ReceiptPersistenceState) {
    const envelope: Envelope = {
      version: 1,
      receipts: state.receipts,
      codeLedger: state.codeLedger,
    };
    this.store.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }
}

function cloneReceipt(receipt: Receipt): Receipt {
  return {
    ...receipt,
    items: receipt.items.map((item) => ({ ...item })),
  };
}
