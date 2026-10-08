/** A confirmed receiving operation. Drafts stay in memory and are not stored. */
export const RECEIPT_STATUSES = ["CONFIRMED"] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = {
  CONFIRMED: "Confirmado",
};

/** Safety cap for one confirmation. Documented in the phase notes. */
export const MAX_BOXES_PER_RECEIPT = 500;

export type ReceiptItem = {
  id: string;
  receiptId: string;
  productId: string;
  boxesQuantity: number;
  /** Rolls inside each box of this line, not the sum of the line. */
  rollsQuantity: number;
  /** Meters inside each box of this line, not the sum of the line. */
  totalLengthM: number;
  manufacturerBatch?: string;
  notes?: string;
};

export type Receipt = {
  id: string;
  code: string;
  status: ReceiptStatus;
  receivedAt: string;
  supplierName?: string;
  notes?: string;
  /** Stable id of the confirmation attempt. A repeat returns the same receipt. */
  requestId: string;
  createdAt: string;
  updatedAt: string;
  items: ReceiptItem[];
};

export type ReceiptItemDraft = {
  productId: string;
  boxesQuantity: number;
  rollsQuantity: number;
  totalLengthM: number;
  manufacturerBatch?: string;
  notes?: string;
};

export type ReceiptDraft = {
  requestId: string;
  receivedAt: string;
  supplierName?: string;
  notes?: string;
  items: ReceiptItemDraft[];
};
