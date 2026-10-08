import { OCCUPANCY_KINDS, OCCUPANCY_LABEL, type MapCell, type WarehouseView } from "@orion/domain";

import { AisleSection } from "@/features/warehouse/aisle-section";

type WarehouseMapProps = {
  view: WarehouseView;
  highlighted: ReadonlySet<string>;
  onOpen: (cell: MapCell) => void;
};

export function WarehouseMap({ view, highlighted, onOpen }: WarehouseMapProps) {
  return (
    <div>
      {view.aisles.map((aisle) => (
        <AisleSection key={aisle.aisle} aisle={aisle} highlighted={highlighted} onOpen={onOpen} />
      ))}
      <ul className="mt-6 flex flex-wrap gap-2" aria-label="Legenda do mapa">
        {OCCUPANCY_KINDS.map((kind) => (
          <li
            key={kind}
            className={`rounded-control border border-control-border bg-surface px-3 py-2 text-metadata text-ink orion-cell-${kind.toLowerCase()}`}
          >
            {OCCUPANCY_LABEL[kind]}
          </li>
        ))}
      </ul>
    </div>
  );
}
