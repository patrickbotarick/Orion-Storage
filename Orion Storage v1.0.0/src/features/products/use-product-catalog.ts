import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterProducts,
  listFilterOptions,
  type Product,
  type ProductInput,
  type ProductQuery,
} from "@orion/domain";

import { getBrowserProductService } from "@/application/products/product-service";

const INITIAL_QUERY: ProductQuery = {
  text: "",
  category: "",
  brand: "",
  status: "ALL",
};

export function useProductCatalog() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<ProductQuery>(INITIAL_QUERY);

  const reload = useCallback(async () => {
    const items = await getBrowserProductService().list();
    setProducts(items);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBrowserProductService()
      .list()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => filterProducts(products ?? [], query), [products, query]);
  const categories = useMemo(() => listFilterOptions(products ?? [], "category"), [products]);
  const brands = useMemo(() => listFilterOptions(products ?? [], "brand"), [products]);

  async function create(input: ProductInput) {
    await getBrowserProductService().create(input);
    await reload();
  }

  async function update(id: string, input: ProductInput) {
    await getBrowserProductService().update(id, input);
    await reload();
  }

  async function toggleStatus(product: Product) {
    await getBrowserProductService().setStatus(
      product.id,
      product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    );
    await reload();
  }

  return {
    products,
    visible,
    categories,
    brands,
    query,
    setQuery,
    error,
    loading: products == null && error == null,
    create,
    update,
    toggleStatus,
  };
}

function errorMessage(caught: unknown): string {
  if (caught instanceof Error && caught.message) return caught.message;
  return "Não foi possível carregar o catálogo.";
}
