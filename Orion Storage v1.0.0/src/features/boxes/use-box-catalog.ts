import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterBoxes,
  listFilterOptions,
  type Box,
  type BoxCreateInput,
  type BoxListItem,
  type BoxQuery,
  type BoxStatus,
  type BoxUpdateInput,
  type Product,
} from "@orion/domain";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserProductService } from "@/application/products/product-service";

const INITIAL_QUERY: BoxQuery = {
  text: "",
  productId: "",
  brand: "",
  status: "ALL",
  receivedAt: "",
};

export function useBoxCatalog() {
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<BoxQuery>(INITIAL_QUERY);

  const reload = useCallback(async () => {
    const [nextBoxes, nextProducts] = await Promise.all([
      getBrowserBoxService().list(),
      getBrowserProductService().list(),
    ]);
    setBoxes(nextBoxes);
    setProducts(nextProducts);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBrowserBoxService().list(), getBrowserProductService().list()])
      .then(([nextBoxes, nextProducts]) => {
        if (cancelled) return;
        setBoxes(nextBoxes);
        setProducts(nextProducts);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo<BoxListItem[]>(() => {
    if (!boxes || !products) return [];
    return boxes.map((box) => ({
      box,
      product: products.find((product) => product.id === box.productId) ?? null,
    }));
  }, [boxes, products]);

  const visible = useMemo(() => filterBoxes(items, query), [items, query]);
  const brands = useMemo(() => listFilterOptions(products ?? [], "brand"), [products]);
  const activeProducts = useMemo(
    () => (products ?? []).filter((product) => product.status === "ACTIVE"),
    [products],
  );

  async function create(input: BoxCreateInput) {
    const created = await getBrowserBoxService().create(input);
    await reload();
    return created;
  }

  async function update(id: string, input: BoxUpdateInput) {
    const updated = await getBrowserBoxService().update(id, input);
    await reload();
    return updated;
  }

  async function setStatus(id: string, status: BoxStatus) {
    const updated = await getBrowserBoxService().setStatus(id, status);
    await reload();
    return updated;
  }

  return {
    products,
    activeProducts,
    brands,
    visible,
    query,
    setQuery,
    error,
    loading: error == null && (boxes == null || products == null),
    create,
    update,
    setStatus,
  };
}

function errorMessage(caught: unknown): string {
  if (caught instanceof Error && caught.message) return caught.message;
  return "Não foi possível carregar as caixas.";
}
