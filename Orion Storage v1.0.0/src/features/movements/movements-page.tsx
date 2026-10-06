import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MOVEMENT_SOURCES,
  MOVEMENT_SOURCE_LABEL,
  MOVEMENT_TYPES,
  MOVEMENT_TYPE_LABEL,
  filterMovements,
  type Box,
  type Location,
  type Movement,
  type MovementQuery,
  type Product,
} from "@orion/domain";
import { formatDateTimePt } from "@orion/shared";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserLocationService } from "@/application/locations/location-service";
import { getBrowserMovementService } from "@/application/movements/movement-service";
import { getBrowserProductService } from "@/application/products/product-service";
import { AppShell } from "@/components/app-shell";
import { controlClass } from "@/components/ui/field";

const INITIAL_QUERY: MovementQuery = { text: "", type: "ALL", source: "ALL", date: "", boxId: "" };

export function MovementsPage() {
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState<MovementQuery>(INITIAL_QUERY);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [nextMovements, nextBoxes, nextLocations, nextProducts] = await Promise.all([
      getBrowserMovementService().list(),
      getBrowserBoxService().list(),
      getBrowserLocationService().listLocations(),
      getBrowserProductService().list(),
    ]);
    setMovements(nextMovements);
    setBoxes(nextBoxes);
    setLocations(nextLocations);
    setProducts(nextProducts);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload().catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Não foi possível carregar.");
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const items = useMemo(() => {
    return (movements ?? []).map((movement) => {
      const box = boxes.find((item) => item.id === movement.boxId) ?? null;
      const product = products.find((item) => item.id === box?.productId) ?? null;
      return {
        movement,
        boxCode: box?.code ?? movement.metadata?.boxCode ?? "Caixa removida",
        productLabel: product ? [product.brand, product.colorName ?? product.name].filter(Boolean).join(" ") : "Sem produto",
        fromCode: codeOf(locations, movement.fromLocationId, movement.metadata?.fromLocationCode),
        toCode: codeOf(locations, movement.toLocationId, movement.metadata?.toLocationCode),
      };
    });
  }, [boxes, locations, movements, products]);
  const visible = useMemo(() => filterMovements(items, query), [items, query]);

  return (
    <AppShell section="movements">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Rastreabilidade</p>
        <h1 className="text-2xl font-semibold text-ink">Movimentações</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Registro oficial de armazenamento, troca e saída. Caixas que já estavam endereçadas antes desta fase não ganham movimento retroativo.
        </p>
      </header>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          value={query.text ?? ""}
          onChange={(event) => setQuery({ ...query, text: event.target.value })}
          placeholder="Caixa, produto, origem ou destino"
          aria-label="Buscar movimentações"
          className={controlClass}
        />
        <select
          aria-label="Filtrar por tipo"
          value={query.type ?? "ALL"}
          onChange={(event) => setQuery({ ...query, type: event.target.value as MovementQuery["type"] })}
          className={controlClass}
        >
          <option value="ALL">Todos os tipos</option>
          {MOVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {MOVEMENT_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por origem"
          value={query.source ?? "ALL"}
          onChange={(event) => setQuery({ ...query, source: event.target.value as MovementQuery["source"] })}
          className={controlClass}
        >
          <option value="ALL">Todas as origens</option>
          {MOVEMENT_SOURCES.map((source) => (
            <option key={source} value={source}>
              {MOVEMENT_SOURCE_LABEL[source]}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Filtrar por data"
          value={query.date ?? ""}
          onChange={(event) => setQuery({ ...query, date: event.target.value })}
          className={controlClass}
        />
        <select
          aria-label="Filtrar por caixa"
          value={query.boxId ?? ""}
          onChange={(event) => setQuery({ ...query, boxId: event.target.value })}
          className={controlClass}
        >
          <option value="">Todas as caixas</option>
          {boxes.map((box) => (
            <option key={box.id} value={box.id}>
              {box.code}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-4 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="mt-4">
        {movements == null ? (
          <p className="text-sm text-muted">Carregando movimentações…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center text-sm text-muted">
            Nenhuma movimentação encontrada.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((item) => (
              <li key={item.movement.id} className="rounded-lg border border-line bg-surface p-4 text-sm">
                <p className="text-xs text-muted">{formatDateTimePt(item.movement.createdAt)}</p>
                <p className="mt-1 font-mono">{item.boxCode}</p>
                <p>{item.productLabel}</p>
                <p className="mt-2">
                  {MOVEMENT_TYPE_LABEL[item.movement.type]} · {item.fromCode ?? "Sem localização"} → {item.toCode ?? "Sem localização"}
                </p>
                <p className="text-xs text-muted">{MOVEMENT_SOURCE_LABEL[item.movement.source]}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function codeOf(locations: Location[], id?: string, fallback?: string): string | undefined {
  if (!id) return undefined;
  return locations.find((location) => location.id === id)?.code ?? fallback ?? id;
}
