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
  type Location,
  type Movement,
  type Product,
} from "@orion/domain";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserLocationService } from "@/application/locations/location-service";
import { getBrowserMovementService } from "@/application/movements/movement-service";
import { getBrowserProductService } from "@/application/products/product-service";

const INITIAL_QUERY: BoxQuery = {
  text: "",
  productId: "",
  brand: "",
  status: "ALL",
  receivedAt: "",
  placement: "ALL",
};

export function useBoxCatalog() {
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<BoxQuery>(INITIAL_QUERY);

  const reload = useCallback(async () => {
    const [nextBoxes, nextProducts, nextLocations, nextMovements] = await Promise.all([
      getBrowserBoxService().list(),
      getBrowserProductService().list(),
      getBrowserLocationService().listLocations(),
      getBrowserMovementService().list(),
    ]);
    setBoxes(nextBoxes);
    setProducts(nextProducts);
    setLocations(nextLocations);
    setMovements(nextMovements);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBrowserBoxService().list(),
      getBrowserProductService().list(),
      getBrowserLocationService().listLocations(),
      getBrowserMovementService().list(),
    ])
      .then(([nextBoxes, nextProducts, nextLocations, nextMovements]) => {
        if (cancelled) return;
        setBoxes(nextBoxes);
        setProducts(nextProducts);
        setLocations(nextLocations);
        setMovements(nextMovements);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo<BoxListItem[]>(() => {
    if (!boxes || !products || !locations) return [];
    return boxes.map((box) => ({
      box,
      product: products.find((product) => product.id === box.productId) ?? null,
      locationCode: locations.find((location) => location.id === box.currentLocationId)?.code,
    }));
  }, [boxes, products, locations]);

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

  async function setLocation(id: string, locationId: string | null) {
    if (locationId) await getBrowserMovementService().place(id, locationId, "MANUAL");
    else await getBrowserMovementService().remove(id, "MANUAL");
    await reload();
    const updated = await getBrowserBoxService().getById(id);
    if (!updated) throw new Error("Caixa não encontrada.");
    return updated;
  }

  return {
    products,
    boxes,
    locations: locations ?? [],
    movements,
    activeProducts,
    brands,
    visible,
    query,
    setQuery,
    error,
    loading: error == null && (boxes == null || products == null || locations == null),
    create,
    update,
    setStatus,
    setLocation,
  };
}

function errorMessage(caught: unknown): string {
  if (caught instanceof Error && caught.message) return caught.message;
  return "Não foi possível carregar as caixas.";
}
