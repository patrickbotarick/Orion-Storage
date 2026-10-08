import { allocateBoxCodes, type BoxCodeLedger } from "./box-code";
import { assertValidBoxCreate } from "./box-schema";
import {
  InactiveProductBoxError,
  ProductNotFoundError,
  ReceiptValidationError,
  type FieldIssue,
} from "./errors";
import { normalizeDisplay } from "./normalize";
import type { Product } from "./product";
import { allocateReceiptCode, type ReceiptCodeLedger } from "./receipt-code";
import { MAX_BOXES_PER_RECEIPT, type ReceiptDraft, type ReceiptItemDraft } from "./receipt";

export type PlannedReceiptItem = ReceiptItemDraft & {
  boxCodes: string[];
};

/** Projection of the next codes. Nothing here is written. */
export type ReceiptPlan = {
  requestId: string;
  receivedAt: string;
  supplierName?: string;
  notes?: string;
  receiptCode: string;
  items: PlannedReceiptItem[];
  boxCodes: string[];
  totalBoxes: number;
  boxLedger: BoxCodeLedger;
  receiptLedger: ReceiptCodeLedger;
};

export function planReceipt(input: {
  draft: ReceiptDraft;
  products: readonly Product[];
  boxCodes: readonly string[];
  boxLedger: BoxCodeLedger;
  receiptCodes: readonly string[];
  receiptLedger: ReceiptCodeLedger;
  now: Date;
}): ReceiptPlan {
  const draft = normalizeDraft(input.draft);
  const items = draft.items.map((item, index) =>
    prepareItem(item, index, input.products, draft.receivedAt),
  );
  const totalBoxes = items.reduce((sum, item) => sum + item.boxesQuantity, 0);
  if (totalBoxes > MAX_BOXES_PER_RECEIPT) {
    throw new ReceiptValidationError([
      {
        path: "boxesQuantity",
        message: `Um recebimento pode criar no máximo ${MAX_BOXES_PER_RECEIPT} caixas.`,
      },
    ]);
  }

  const allocatedBoxes = allocateBoxCodes({
    existingCodes: input.boxCodes,
    ledger: input.boxLedger,
    now: input.now,
    count: totalBoxes,
  });
  const allocatedReceipt = allocateReceiptCode({
    existingCodes: input.receiptCodes,
    ledger: input.receiptLedger,
    now: input.now,
  });

  let cursor = 0;
  const planned = items.map((item) => {
    const boxCodes = allocatedBoxes.codes.slice(cursor, cursor + item.boxesQuantity);
    cursor += item.boxesQuantity;
    return { ...item, boxCodes };
  });

  const plan: ReceiptPlan = {
    requestId: draft.requestId,
    receivedAt: draft.receivedAt,
    receiptCode: allocatedReceipt.code,
    items: planned,
    boxCodes: allocatedBoxes.codes,
    totalBoxes,
    boxLedger: allocatedBoxes.ledger,
    receiptLedger: allocatedReceipt.ledger,
  };
  if (draft.supplierName) plan.supplierName = draft.supplierName;
  if (draft.notes) plan.notes = draft.notes;
  return plan;
}

function normalizeDraft(draft: ReceiptDraft): ReceiptDraft {
  const issues: FieldIssue[] = [];
  const requestId = draft.requestId?.trim() ?? "";
  if (!requestId)
    issues.push({ path: "requestId", message: "A confirmação não tem identificador." });
  if (requestId.length > 80) {
    issues.push({ path: "requestId", message: "O identificador da confirmação é longo demais." });
  }
  if (!Array.isArray(draft.items) || draft.items.length === 0) {
    issues.push({ path: "items", message: "Inclua pelo menos um produto." });
  }
  const supplierName = normalizeDisplay(draft.supplierName);
  if (supplierName && supplierName.length > 120) {
    issues.push({
      path: "supplierName",
      message: "O fornecedor deve ter no máximo 120 caracteres.",
    });
  }
  const notes = normalizeDisplay(draft.notes);
  if (issues.length > 0) throw new ReceiptValidationError(issues);
  const normalized: ReceiptDraft = {
    requestId,
    receivedAt: draft.receivedAt,
    items: draft.items,
  };
  if (supplierName) normalized.supplierName = supplierName;
  if (notes) normalized.notes = notes;
  return normalized;
}

function prepareItem(
  item: ReceiptItemDraft,
  index: number,
  products: readonly Product[],
  receivedAt: string,
): ReceiptItemDraft {
  const path = `items.${index}`;
  if (!Number.isInteger(item.boxesQuantity) || item.boxesQuantity <= 0) {
    throw new ReceiptValidationError([
      {
        path: `${path}.boxesQuantity`,
        message: "A quantidade de caixas deve ser um número inteiro maior que zero.",
      },
    ]);
  }
  const productId = item.productId?.trim() ?? "";
  if (!productId) {
    throw new ReceiptValidationError([
      { path: `${path}.productId`, message: "Selecione o produto." },
    ]);
  }
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) throw new ProductNotFoundError(productId);
  if (product.status !== "ACTIVE") throw new InactiveProductBoxError(product.id);
  const valid = assertValidBoxCreate({
    productId,
    rollsQuantity: item.rollsQuantity,
    totalLengthM: item.totalLengthM,
    receivedAt,
    manufacturerBatch: item.manufacturerBatch,
    notes: item.notes,
  });
  const prepared: ReceiptItemDraft = {
    productId,
    boxesQuantity: item.boxesQuantity,
    rollsQuantity: valid.rollsQuantity,
    totalLengthM: valid.totalLengthM,
  };
  if (valid.manufacturerBatch) prepared.manufacturerBatch = valid.manufacturerBatch;
  if (valid.notes) prepared.notes = valid.notes;
  return prepared;
}
