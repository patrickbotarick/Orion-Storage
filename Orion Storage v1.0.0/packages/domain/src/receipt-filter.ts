import { normalizeForComparison } from "./normalize";
import type { Receipt, ReceiptStatus } from "./receipt";

export type ReceiptStatusFilter = ReceiptStatus | "ALL";

export type ReceiptQuery = {
  text?: string;
  date?: string;
  productId?: string;
  brand?: string;
  status?: ReceiptStatusFilter;
};

export type ReceiptListItem = {
  receipt: Receipt;
  productLabels: string[];
  brands: string[];
  batches: string[];
  boxCodes: string[];
  boxCount: number;
};

export function filterReceipts(
  items: readonly ReceiptListItem[],
  query: ReceiptQuery,
): ReceiptListItem[] {
  const text = normalizeForComparison(query.text);
  const date = query.date?.trim() ?? "";
  const productId = query.productId?.trim() ?? "";
  const brand = normalizeForComparison(query.brand);
  const status = query.status ?? "ALL";
  return items.filter((item) => {
    if (status !== "ALL" && item.receipt.status !== status) return false;
    if (date && item.receipt.receivedAt !== date) return false;
    if (productId && !item.receipt.items.some((line) => line.productId === productId)) return false;
    if (brand && !item.brands.some((value) => normalizeForComparison(value) === brand))
      return false;
    if (!text) return true;
    const haystack = [
      item.receipt.code,
      item.receipt.supplierName,
      ...item.productLabels,
      ...item.brands,
      ...item.batches,
      ...item.boxCodes,
    ]
      .map((value) => normalizeForComparison(value))
      .join(" ");
    return haystack.includes(text);
  });
}
