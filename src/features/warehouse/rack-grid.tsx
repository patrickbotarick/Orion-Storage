import { Fragment } from "react";

import { cellKey, type MapCell, type RackView } from "@orion/domain";

import { LocationCell } from "@/features/warehouse/location-cell";

type RackGridProps = {
  rack: RackView;
  highlighted: ReadonlySet<string>;
  divergent: ReadonlySet<string>;
  onOpen: (cell: MapCell) => void;
};

export function RackGrid({ rack, highlighted, divergent, onOpen }: RackGridProps) {
  return (
    <section
      id={`map-rack-${rack.aisle}-${rack.rack}`}
      className="rounded-lg border border-line bg-surface p-3"
      aria-label={`Prateleira ${rack.rack}`}
    >
      <h3 className="text-sm font-semibold text-ink">Prateleira {rack.rack}</h3>
      <div className="mt-3 overflow-x-auto pb-1">
        <div
          className="inline-grid gap-2"
          style={{
            gridTemplateColumns: `minmax(4.5rem, auto) repeat(${rack.positions.length}, minmax(var(--spacing-map-cell), 1fr))`,
          }}
        >
          <span />
          {rack.positions.map((position) => (
            <span
              key={`head-${position}`}
              className="text-center font-mono text-xs font-medium tracking-wide text-muted"
            >
              {/^\d+$/.test(position) ? `P${position}` : position}
            </span>
          ))}
          {rack.levels.map((level) => (
            <Fragment key={level}>
              <span className="flex items-center text-xs font-medium text-muted">
                Nível {level}
              </span>
              {rack.positions.map((position) => {
                const cell = rack.cells.get(cellKey(level, position));
                if (!cell) {
                  return (
                    <span
                      key={`${level}-${position}`}
                      className="orion-map-hole"
                      aria-hidden="true"
                    />
                  );
                }
                return (
                  <LocationCell
                    key={cell.location.id}
                    cell={cell}
                    highlighted={highlighted.has(cell.location.id)}
                    divergent={divergent.has(cell.location.id)}
                    onOpen={onOpen}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
