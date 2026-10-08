import { DuplicateInternalCodeError } from "./errors";
import { normalizeForComparison, normalizeInternalCode } from "./normalize";

export type InternalCodeCarrier = {
  id: string;
  internalCode: string;
};

/** Comparison key for internal codes: canonical token, then accent/case-insensitive. */
export function internalCodeKey(internalCode: string): string {
  return normalizeForComparison(normalizeInternalCode(internalCode));
}

export function findDuplicateInternalCode<T extends InternalCodeCarrier>(
  products: readonly T[],
  internalCode: string,
  ignoreId?: string,
): T | null {
  const key = internalCodeKey(internalCode);
  if (!key) return null;
  return (
    products.find(
      (product) => product.id !== ignoreId && internalCodeKey(product.internalCode) === key,
    ) ?? null
  );
}

export function assertUniqueInternalCode(
  products: readonly InternalCodeCarrier[],
  internalCode: string,
  ignoreId?: string,
): void {
  const duplicate = findDuplicateInternalCode(products, internalCode, ignoreId);
  if (!duplicate) return;
  const canonical = normalizeInternalCode(internalCode) || internalCode.trim();
  throw new DuplicateInternalCodeError(canonical);
}
