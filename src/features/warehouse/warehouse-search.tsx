import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { SearchInput } from "@/components/ui/controls";
import type { WarehouseSearchResult } from "@orion/domain";

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
        <SearchInput
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Caixa, endereço, produto, marca, cor ou largura"
          aria-label="Buscar no mapa"
        />
        {active ? (
          <Button
            variant="ghost"
            type="button"
            className="shrink-0 border border-control-border bg-surface whitespace-nowrap"
            onClick={() => onQuery("")}
          >
            Limpar busca
          </Button>
        ) : null}
      </div>
      {active ? (
        <div className="mt-3 rounded-lg border border-line bg-surface p-3" aria-live="polite">
          {result.products.length === 0 && lonely.length === 0 && result.looseBoxes.length === 0 ? (
            <EmptyState title="Nenhum resultado no mapa." className="mt-4" />
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
                        <Button
                          variant="ghost"
                          type="button"
                          className="min-h-11 w-full rounded-md px-2 justify-start text-left text-sm hover:bg-bg"
                          onClick={() => onReveal(place.locationId)}
                        >
                          <span className="font-mono">{place.code}</span>
                          <span className="text-muted">
                            {" "}
                            · {place.aisle}
                            {place.rack} / Nível {place.level} / P{place.position} —{" "}
                            {place.boxCount}
                          </span>
                        </Button>
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
                        <Button
                          variant="ghost"
                          type="button"
                          className="min-h-11 w-full rounded-md px-2 justify-start text-left font-mono text-sm hover:bg-bg"
                          onClick={() => onReveal(place.locationId)}
                        >
                          {place.code}
                        </Button>
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
