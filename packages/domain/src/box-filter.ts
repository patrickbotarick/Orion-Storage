import type { Box, BoxStatus } from "./box";
import { normalizeForComparison } from "./normalize";
import type { Product } from "./product";

export type BoxStatusFilter = BoxStatus | "ALL";
export type BoxPlacementFilter = "ALL" | "WITH_LOCATION" | "WITHOUT_LOCATION";

export type BoxListItem = {
  box: Box;
  product: Product | null;
  locationCode?: string;
};

export type BoxQuery = {
  text?: string;
  productId?: string;
  brand?: string;
  status?: BoxStatusFilter;
  receivedAt?: string;
  placement?: BoxPlacementFilter;
};

export function filterBoxes(items: readonly BoxListItem[], query: BoxQuery): BoxListItem[] {
  const text = normalizeForComparison(query.text);
  const brand = normalizeForComparison(query.brand);
  const status = query.status ?? "ALL";
  const productId = query.productId?.trim() ?? "";
  const receivedAt = query.receivedAt?.trim() ?? "";
  const placement = query.placement ?? "ALL";

  return items.filter((item) => {
    const { box, product } = item;
    if (status !== "ALL" && box.status !== status) return false;
    if (productId && box.productId !== productId) return false;
    if (receivedAt && box.receivedAt !== receivedAt) return false;
    if (brand && normalizeForComparison(product?.brand) !== brand) return false;
    if (placement === "WITH_LOCATION" && !box.currentLocationId) return false;
    if (placement === "WITHOUT_LOCATION" && box.currentLocationId) return false;
    if (!text) return true;
    const haystack = [
      box.code,
      box.manufacturerBatch,
      item.locationCode,
      product?.internalCode,
      product?.name,
      product?.brand,
      product?.colorName,
    ]
      .map((value) => normalizeForComparison(value))
      .join(" ");
    return haystack.includes(text);
  });
}
