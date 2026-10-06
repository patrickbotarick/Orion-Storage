import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LOCATION_STATUSES,
  LOCATION_STATUS_LABEL,
  buildWarehouseMap,
  calculateAreaOccupancy,
  compareNatural,
  filterWarehouseLocations,
  normalizeForComparison,
  searchWarehouse,
  type Box,
  type Location,
  type MapCell,
  type Product,
  type StorageArea,
  type WarehouseFilters,
} from "@orion/domain";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserLocationService } from "@/application/locations/location-service";
import { getBrowserProductService } from "@/application/products/product-service";
import { AppShell } from "@/components/app-shell";
import { controlClass } from "@/components/ui/field";
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
        <header>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Estoque físico</p>
          <h1 className="text-2xl font-semibold text-ink">Mapa</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Visualização do estoque. A ocupação vem da localização atual da caixa. Nada aqui é
            arrastado nem editado.
          </p>
        </header>

        {error ? (
          <p
            className="mt-4 rounded-md border border-danger px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {loading ? <p className="mt-6 text-sm text-muted">Carregando mapa…</p> : null}

        {!loading && areas && areas.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Nenhuma área cadastrada.</p>
        ) : null}

        {!loading && areas && areas.length > 0 ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Área</span>
                <select
                  aria-label="Área"
                  className={controlClass}
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
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Corredor</span>
                <select
                  aria-label="Filtrar por corredor"
                  className={controlClass}
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
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Prateleira</span>
                <select
                  aria-label="Filtrar por prateleira"
                  className={controlClass}
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
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Status</span>
                <select
                  aria-label="Filtrar por status da posição"
                  className={controlClass}
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
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Ocupação</span>
                <select
                  aria-label="Filtrar por ocupação"
                  className={controlClass}
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
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Produto</span>
                <select
                  aria-label="Filtrar por produto"
                  className={controlClass}
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
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Marca</span>
                <select
                  aria-label="Filtrar por marca"
                  className={controlClass}
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
                </select>
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
              <p className="mt-6 text-sm text-muted">Esta área ainda não possui endereços.</p>
            ) : view.aisles.length === 0 ? (
              <p className="mt-6 text-sm text-muted">Nenhuma posição corresponde aos filtros.</p>
            ) : (
              <WarehouseMap view={view} highlighted={highlighted} onOpen={setSelected} />
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
