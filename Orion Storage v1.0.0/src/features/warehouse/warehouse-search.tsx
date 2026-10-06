import type { WarehouseSearchResult } from "@orion/domain";

import { controlClass } from "@/components/ui/field";

type WarehouseSearchProps = {
  query: string;
  result: WarehouseSearchResult;
  onQuery: (value: string) => void;
  onReveal: (locationId: string) => void;
};

export function WarehouseSearch({ query, result, onQuery, onReveal }: WarehouseSearchProps) {
  const active = query.trim().length > 0;
  const lonely = result.places.filter(
    (place) =>
      !result.products.some((hit) =>
        hit.places.some((item) => item.locationId === place.locationId),
      ),
  );
  return (
    <section className="mt-4" aria-label="Busca no mapa">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Caixa, endereço, produto, marca, cor ou largura"
          aria-label="Buscar no mapa"
          className={controlClass}
        />
        {active ? (
          <button
            type="button"
            className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm font-medium"
            onClick={() => onQuery("")}
          >
            Limpar busca
          </button>
        ) : null}
      </div>
      {active ? (
        <div className="mt-3 rounded-lg border border-line bg-surface p-3" aria-live="polite">
          {result.products.length === 0 && lonely.length === 0 && result.looseBoxes.length === 0 ? (
            <p className="text-sm text-muted">Nenhum resultado no mapa.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {result.products.map((hit) => (
                <article key={hit.productId}>
                  <h3 className="text-sm font-semibold text-ink">{hit.label}</h3>
                  <p className="text-xs text-muted">
                    {hit.totalBoxes}{" "}
                    {hit.totalBoxes === 1 ? "caixa encontrada" : "caixas encontradas"}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {hit.places.map((place) => (
                      <li key={place.locationId}>
                        <button
                          type="button"
                          className="min-h-11 w-full rounded-md px-2 text-left text-sm hover:bg-bg"
                          onClick={() => onReveal(place.locationId)}
                        >
                          <span className="font-mono">{place.code}</span>
                          <span className="text-muted">
                            {" "}
                            · {place.aisle}
                            {place.rack} / Nível {place.level} / P{place.position} —{" "}
                            {place.boxCount}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              {lonely.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-ink">Endereços</h3>
                  <ul className="mt-2 flex flex-col gap-1">
                    {lonely.map((place) => (
                      <li key={place.locationId}>
                        <button
                          type="button"
                          className="min-h-11 w-full rounded-md px-2 text-left font-mono text-sm hover:bg-bg"
                          onClick={() => onReveal(place.locationId)}
                        >
                          {place.code}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.looseBoxes.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-ink">Fora do mapa</h3>
                  <ul className="mt-2 flex flex-col gap-1">
                    {result.looseBoxes.map((box) => (
                      <li
                        key={box.boxId}
                        className="flex flex-wrap items-center gap-2 px-2 text-sm"
                      >
                        <span className="font-mono">{box.code}</span>
                        <span className="text-muted">{box.label} · sem localização</span>
                        <a
                          href={`/caixas?caixa=${encodeURIComponent(box.boxId)}`}
                          className="min-h-11 inline-flex items-center font-medium text-accent underline"
                        >
                          Ver caixa
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
