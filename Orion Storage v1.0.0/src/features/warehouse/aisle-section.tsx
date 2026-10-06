import type { MapCell, WarehouseView } from "@orion/domain";

import { RackGrid } from "@/features/warehouse/rack-grid";

type AisleSectionProps = {
  aisle: WarehouseView["aisles"][number];
  highlighted: ReadonlySet<string>;
  onOpen: (cell: MapCell) => void;
};

export function AisleSection({ aisle, highlighted, onOpen }: AisleSectionProps) {
  const headingId = `map-aisle-${aisle.aisle}`;
  return (
    <section className="mt-8" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold tracking-wide text-ink uppercase">
        Corredor {aisle.aisle}
      </h2>
      <div className="mt-3 flex flex-col gap-4">
        {aisle.racks.map((rack) => (
          <RackGrid
            key={`${aisle.aisle}-${rack.rack}`}
            rack={rack}
            highlighted={highlighted}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
