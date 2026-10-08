import type { Receipt } from "./receipt";
import type { ReceiptCodeLedger } from "./receipt-code";

export type ReceiptPersistenceState = {
  receipts: Receipt[];
  codeLedger: ReceiptCodeLedger;
};

/**
 * Persistence port for confirmed receipts.
 * There is no update: a confirmation is a historical fact.
 */
export interface ReceiptRepository {
  list(): Promise<Receipt[]>;
  getById(id: string): Promise<Receipt | null>;
  getByCode(code: string): Promise<Receipt | null>;
  findByRequestId(requestId: string): Promise<Receipt | null>;
  listByProductId(productId: string): Promise<Receipt[]>;
  listByDateRange(from: string, to: string): Promise<Receipt[]>;
  captureState(): Promise<ReceiptPersistenceState>;
  create(receipt: Receipt, ledger: ReceiptCodeLedger): Promise<Receipt>;
}
