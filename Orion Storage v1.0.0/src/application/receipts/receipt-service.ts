import {
  DuplicateReceiptRequestError,
  buildCreatedHistory,
  insertBox,
  planReceipt,
  type Box,
  type BoxRepository,
  type ProductRepository,
  type Receipt,
  type ReceiptDraft,
  type ReceiptPlan,
  type ReceiptRepository,
} from "@orion/domain";

import { LocalStorageBoxRepository } from "@/persistence/local-storage-box-repository";
import { LocalStorageProductRepository } from "@/persistence/local-storage-product-repository";
import { LocalStorageReceiptRepository } from "@/persistence/local-storage-receipt-repository";

export type ReceiptConfirmation = {
  receipt: Receipt;
  boxes: Box[];
  replayed: boolean;
};

export type ReceiptService = {
  list(): Promise<Receipt[]>;
  getById(id: string): Promise<Receipt | null>;
  listByProductId(productId: string): Promise<Receipt[]>;
  listByDateRange(from: string, to: string): Promise<Receipt[]>;
  listBoxes(receiptId: string): Promise<Box[]>;
  preview(draft: ReceiptDraft): Promise<ReceiptPlan>;
  confirm(draft: ReceiptDraft): Promise<ReceiptConfirmation>;
};

export function createReceiptService(
  products: ProductRepository,
  boxes: BoxRepository,
  receipts: ReceiptRepository,
  ids: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
): ReceiptService {
  return {
    list: () => receipts.list(),
    getById: (id) => receipts.getById(id),
    listByProductId: (productId) => receipts.listByProductId(productId),
    listByDateRange: (from, to) => receipts.listByDateRange(from, to),
    listBoxes: async (receiptId) =>
      (await boxes.list())
        .filter((box) => box.receiptId === receiptId)
        .sort((a, b) => a.code.localeCompare(b.code)),
    async preview(draft) {
      return planFromCurrent(products, boxes, receipts, draft, now);
    },
    async confirm(draft) {
      const requestId = draft.requestId?.trim() ?? "";
      const existing = requestId ? await receipts.findByRequestId(requestId) : null;
      if (existing) {
        return { receipt: existing, boxes: await boxesOf(boxes, existing.id), replayed: true };
      }
      const plan = await planFromCurrent(products, boxes, receipts, draft, now);
      const timestamp = now();
      const receiptId = ids();
      const receipt = materializeReceipt(plan, receiptId, timestamp, ids);
      const created = materializeBoxes(plan, receipt, timestamp, ids);
      const before = await boxes.captureState();
      let next = { boxes: before.boxes, codeLedger: plan.boxLedger };
      for (const box of created) next = insertBox(next, box);
      await boxes.replaceState(next);
      try {
        const stored = await receipts.create(receipt, plan.receiptLedger);
        return { receipt: stored, boxes: created, replayed: false };
      } catch (caught) {
        await boxes.replaceState(before);
        if (caught instanceof DuplicateReceiptRequestError) {
          const winner = await receipts.findByRequestId(requestId);
          if (winner) {
            return { receipt: winner, boxes: await boxesOf(boxes, winner.id), replayed: true };
          }
        }
        throw caught;
      }
    },
  };
}

async function planFromCurrent(
  products: ProductRepository,
  boxes: BoxRepository,
  receipts: ReceiptRepository,
  draft: ReceiptDraft,
  now: () => string,
): Promise<ReceiptPlan> {
  const [catalog, boxState, receiptState] = await Promise.all([
    products.list(),
    boxes.captureState(),
    receipts.captureState(),
  ]);
  return planReceipt({
    draft,
    products: catalog,
    boxCodes: boxState.boxes.map((box) => box.code),
    boxLedger: boxState.codeLedger,
    receiptCodes: receiptState.receipts.map((receipt) => receipt.code),
    receiptLedger: receiptState.codeLedger,
    now: new Date(now()),
  });
}

function materializeReceipt(
  plan: ReceiptPlan,
  receiptId: string,
  timestamp: string,
  ids: () => string,
): Receipt {
  const receipt: Receipt = {
    id: receiptId,
    code: plan.receiptCode,
    status: "CONFIRMED",
    receivedAt: plan.receivedAt,
    requestId: plan.requestId,
    createdAt: timestamp,
    updatedAt: timestamp,
    items: plan.items.map((item) => {
      const line: Receipt["items"][number] = {
        id: ids(),
        receiptId,
        productId: item.productId,
        boxesQuantity: item.boxesQuantity,
        rollsQuantity: item.rollsQuantity,
        totalLengthM: item.totalLengthM,
      };
      if (item.manufacturerBatch) line.manufacturerBatch = item.manufacturerBatch;
      if (item.notes) line.notes = item.notes;
      return line;
    }),
  };
  if (plan.supplierName) receipt.supplierName = plan.supplierName;
  if (plan.notes) receipt.notes = plan.notes;
  return receipt;
}

function materializeBoxes(
  plan: ReceiptPlan,
  receipt: Receipt,
  timestamp: string,
  ids: () => string,
): Box[] {
  return plan.items.flatMap((item) =>
    item.boxCodes.map((code) => {
      const id = ids();
      const box: Box = {
        id,
        code,
        productId: item.productId,
        status: "RECEIVED",
        rollsQuantity: item.rollsQuantity,
        totalLengthM: item.totalLengthM,
        receivedAt: plan.receivedAt,
        receiptId: receipt.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        history: [
          buildCreatedHistory({
            id: ids(),
            boxId: id,
            code,
            productId: item.productId,
            createdAt: timestamp,
            receiptId: receipt.id,
            receiptCode: receipt.code,
          }),
        ],
      };
      if (item.manufacturerBatch) box.manufacturerBatch = item.manufacturerBatch;
      if (item.notes) box.notes = item.notes;
      return box;
    }),
  );
}

async function boxesOf(boxes: BoxRepository, receiptId: string): Promise<Box[]> {
  return (await boxes.list())
    .filter((box) => box.receiptId === receiptId)
    .sort((a, b) => a.code.localeCompare(b.code));
}

let browserService: ReceiptService | null = null;

export function getBrowserReceiptService(): ReceiptService {
  if (typeof window === "undefined") {
    throw new Error("O recebimento só está disponível no navegador.");
  }
  if (!browserService) {
    const store = window.localStorage;
    browserService = createReceiptService(
      new LocalStorageProductRepository(store),
      new LocalStorageBoxRepository(store),
      new LocalStorageReceiptRepository(store),
    );
  }
  return browserService;
}
