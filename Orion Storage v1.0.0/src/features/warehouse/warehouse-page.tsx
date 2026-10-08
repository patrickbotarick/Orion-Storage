import { Select } from "@/components/ui/controls";
import { Alert, LoadingState, EmptyState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/surfaces";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LOCATION_STATUSES,
  LOCATION_STATUS_LABEL,
  buildWarehouseMap,
  calculateAreaOccupancy,
  compareNatural,
  filterWarehouseLocations,
  normalizeForComparison,
  inventoryDivergenceLocations,
  searchWarehouse,
  type Box,
  type Location,
  type MapCell,
  type Product,
  type StorageArea,
  type InventorySession,
  type WarehouseFilters,
} from "@orion/domain";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserLocationService } from "@/application/locations/location-service";
import { getBrowserProductService } from "@/application/products/product-service";
import { getBrowserInventoryService } from "@/application/inventories/inventory-service";
import { AppShell } from "@/components/app-shell";
import { AreaSummary } from "@/features/warehouse/area-summary";
import { LocationDetail } from "@/features/warehouse/location-detail";
import { WarehouseMap } from "@/features/warehouse/warehouse-map";
import { WarehouseSearch } from "@/features/warehouse/warehouse-search";

const EMPTY_FILTERS: WarehouseFilters = {
  aisle: "",
  rack: "",
  status: "ALL",
  fill: "ALL",
  productId: "",
  brand: "",
};

export function WarehousePage() {
  const [areas, setAreas] = useState<StorageArea[] | null>(null);
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inventories, setInventories] = useState<InventorySession[]>([]);
  const [areaId, setAreaId] = useState("");
  const [filters, setFilters] = useState<WarehouseFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MapCell | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  const reload = useCallback(async () => {
    const [nextAreas, nextLocations, nextBoxes, nextProducts] = await Promise.all([
      getBrowserLocationService().listAreas(),
      getBrowserLocationService().listLocations(),
      getBrowserBoxService().list(),
      getBrowserProductService().list(),
    ]);
    setAreas(nextAreas);
    setLocations(nextLocations);
    setBoxes(nextBoxes);
    setProducts(nextProducts);
    try {
      setInventories(await getBrowserInventoryService().list());
    } catch {
      // Inventory annotations must not prevent the official occupancy map from loading.
      setInventories([]);
    }
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload().catch((caught: unknown) => {
      if (!cancelled) {
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar o mapa.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (!areas || areas.length === 0) return;
    setAreaId((current) =>
      current && areas.some((area) => area.id === current) ? current : areas[0]!.id,
    );
  }, [areas]);

  const area = areas?.find((item) => item.id === areaId) ?? null;
  const areaLocations = useMemo(
    () => (locations ?? []).filter((location) => location.areaId === areaId),
    [locations, areaId],
  );
  const searchResult = useMemo(
    () =>
      searchWarehouse(query, {
        locations: locations ?? [],
        boxes: boxes ?? [],
        products: products ?? [],
      }),
    [query, locations, boxes, products],
  );
  const highlighted = useMemo(() => new Set(searchResult.locationIds), [searchResult]);
  const divergent = useMemo(() => inventoryDivergenceLocations(inventories), [inventories]);
  const visibleLocations = useMemo(
    () => filterWarehouseLocations(areaLocations, boxes ?? [], products ?? [], filters),
    [areaLocations, boxes, products, filters],
  );
  const view = useMemo(
    () => buildWarehouseMap(visibleLocations, boxes ?? []),
    [visibleLocations, boxes],
  );
  const summary = useMemo(
    () => calculateAreaOccupancy(areaLocations, boxes ?? []),
    [areaLocations, boxes],
  );
  const aisles = useMemo(
    () => uniqueNatural(areaLocations.map((location) => location.aisle)),
    [areaLocations],
  );
  const racks = useMemo(() => {
    const source = filters.aisle
      ? areaLocations.filter((location) => location.aisle === filters.aisle)
      : areaLocations;
    return uniqueNatural(source.map((location) => location.rack));
  }, [areaLocations, filters.aisle]);
  const brands = useMemo(() => {
    const seen = new Map<string, string>();
    for (const product of products ?? []) {
      if (!product.brand) continue;
      const key = normalizeForComparison(product.brand);
      if (key && !seen.has(key)) seen.set(key, product.brand);
    }
    return [...seen.values()].sort((left, right) => left.localeCompare(right, "pt-BR"));
  }, [products]);

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`map-loc-${focusId}`)?.scrollIntoView({
      block: "center",
      inline: "center",
    });
  }, [focusId, focusToken]);

  function reveal(locationId: string) {
    const location = locations?.find((item) => item.id === locationId);
    if (!location) return;
    setAreaId(location.areaId);
    setFilters(EMPTY_FILTERS);
    setFocusId(locationId);
    setFocusToken((value) => value + 1);
  }

  const loading =
    error == null && (areas == null || locations == null || boxes == null || products == null);

  return (
    <>
      <AppShell section="map">
        <PageHeader
          title="Mapa"
          eyebrow="Estoque físico"
          description="Visualização do estoque. A ocupação vem da localização atual da caixa. Nada aqui é arrastado nem editado."
        />

        {error ? (
          <Alert tone="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}

        {loading ? <LoadingState label="Carregando mapa…" className="mt-6" /> : null}

        {!loading && areas && areas.length === 0 ? (
          <EmptyState title="Nenhuma área cadastrada." className="mt-4" />
        ) : null}

        {!loading && areas && areas.length > 0 ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Área</span>
                <Select
                  aria-label="Área"

                  value={areaId}
                  onChange={(event) => {
                    setAreaId(event.target.value);
                    setFilters((current) => ({ ...current, aisle: "", rack: "" }));
                  }}
                >
                  {areas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Corredor</span>
                <Select
                  aria-label="Filtrar por corredor"

                  value={filters.aisle ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, aisle: event.target.value, rack: "" }))
                  }
                >
                  <option value="">Todos</option>
                  {aisles.map((aisle) => (
                    <option key={aisle} value={aisle}>
                      {aisle}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Prateleira</span>
                <Select
                  aria-label="Filtrar por prateleira"

                  value={filters.rack ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, rack: event.target.value }))
                  }
                >
                  <option value="">Todas</option>
                  {racks.map((rack) => (
                    <option key={rack} value={rack}>
                      {rack}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Status</span>
                <Select
                  aria-label="Filtrar por status da posição"

                  value={filters.status ?? "ALL"}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as WarehouseFilters["status"],
                    }))
                  }
                >
                  <option value="ALL">Todos</option>
                  {LOCATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {LOCATION_STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Ocupação</span>
                <Select
                  aria-label="Filtrar por ocupação"

                  value={filters.fill ?? "ALL"}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      fill: event.target.value as WarehouseFilters["fill"],
                    }))
                  }
                >
                  <option value="ALL">Todas</option>
                  <option value="EMPTY">Livre</option>
                  <option value="OCCUPIED">Ocupada</option>
                  <option value="FULL">Lotada</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Produto</span>
                <Select
                  aria-label="Filtrar por produto"

                  value={filters.productId ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, productId: event.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  {(products ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Marca</span>
                <Select
                  aria-label="Filtrar por marca"

                  value={filters.brand ?? ""}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, brand: event.target.value }))
                  }
                >
                  <option value="">Todas</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <WarehouseSearch
              query={query}
              result={searchResult}
              onQuery={setQuery}
              onReveal={reveal}
            />

            {area ? <AreaSummary area={area} summary={summary} /> : null}

            {areaLocations.length === 0 ? (
              <EmptyState title="Esta área ainda não possui endereços." className="mt-4" />
            ) : view.aisles.length === 0 ? (
              <EmptyState title="Nenhuma posição corresponde aos filtros." className="mt-4" />
            ) : (
              <>
                <p className="mb-3 text-xs text-muted">
                  O indicador Inventário sinaliza divergência no último inventário concluído da
                  posição. A ocupação continua sendo a localização oficial das caixas.
                </p>
                <WarehouseMap
                  view={view}
                  highlighted={highlighted}
                  divergent={divergent}
                  onOpen={setSelected}
                />
              </>
            )}
          </>
        ) : null}
      </AppShell>
      <LocationDetail
        cell={selected}
        area={areas?.find((item) => item.id === selected?.location.areaId) ?? null}
        products={products ?? []}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function uniqueNatural(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareNatural);
}
