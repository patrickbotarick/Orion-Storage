import { normalizeForComparison } from "./normalize";
import type { Product, ProductStatus } from "./product";

export type ProductStatusFilter = ProductStatus | "ALL";

export type ProductQuery = {
  text?: string;
  category?: string;
  brand?: string;
  status?: ProductStatusFilter;
};

export function filterProducts(products: readonly Product[], query: ProductQuery): Product[] {
  const text = normalizeForComparison(query.text);
  const category = normalizeForComparison(query.category);
  const brand = normalizeForComparison(query.brand);
  const status = query.status ?? "ALL";

  return products.filter((product) => {
    if (status !== "ALL" && product.status !== status) return false;
    if (category && normalizeForComparison(product.category) !== category) return false;
    if (brand && normalizeForComparison(product.brand) !== brand) return false;
    if (!text) return true;
    const haystack = [
      product.internalCode,
      product.name,
      product.brand,
      product.colorName,
    ]
      .map((value) => normalizeForComparison(value))
      .join(" ");
    return haystack.includes(text);
  });
}

export function listFilterOptions(
  products: readonly Product[],
  field: "category" | "brand",
): string[] {
  const seen = new Map<string, string>();
  for (const product of products) {
    const display = product[field];
    if (!display) continue;
    const key = normalizeForComparison(display);
    if (!key || seen.has(key)) continue;
    seen.set(key, display);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
