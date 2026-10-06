import { Ban, Circle, CircleDot, HelpCircle, Minus, Square } from "lucide-react";

import {
  OCCUPANCY_LABEL,
  spokenLocation,
  formatOccupancyCount,
  type MapCell,
  type OccupancyKind,
} from "@orion/domain";

const KIND_CLASS: Record<OccupancyKind, string> = {
  EMPTY: "orion-cell-empty",
  PARTIAL: "orion-cell-partial",
  FULL: "orion-cell-full",
  UNBOUNDED: "orion-cell-unbounded",
  BLOCKED: "orion-cell-blocked",
  INACTIVE: "orion-cell-inactive",
};

const KIND_ICON = {
  EMPTY: Circle,
  PARTIAL: CircleDot,
  FULL: Square,
  UNBOUNDED: HelpCircle,
  BLOCKED: Ban,
  INACTIVE: Minus,
} as const;

type LocationCellProps = {
  cell: MapCell;
  highlighted: boolean;
  onOpen: (cell: MapCell) => void;
};

export function LocationCell({ cell, highlighted, onOpen }: LocationCellProps) {
  const Icon = KIND_ICON[cell.occupancy.kind];
  return (
    <button
      id={`map-loc-${cell.location.id}`}
      type="button"
      draggable={false}
      title={cell.location.code}
      aria-label={spokenLocation(cell.location, cell.occupancy)}
      onClick={() => onOpen(cell)}
      className={`orion-map-cell ${KIND_CLASS[cell.occupancy.kind]} ${
        highlighted ? "orion-cell-highlight" : ""
      }`}
    >
      <span className="font-mono text-xs font-medium">{shortPosition(cell.location.position)}</span>
      <span className="text-sm font-semibold tabular-nums">
        {formatOccupancyCount(cell.occupancy)}
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
        <Icon className="size-3 shrink-0" aria-hidden="true" />
        {OCCUPANCY_LABEL[cell.occupancy.kind]}
      </span>
    </button>
  );
}

function shortPosition(position: string): string {
  return /^\d+$/.test(position) ? `P${position}` : position;
}
