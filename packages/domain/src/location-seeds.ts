import type { Location, LocationStatus } from "./location";
import type { StorageArea } from "./storage-area";

export const DEMO_AREA_ID = "seed-area-sup";

export const DEMO_LOCATION_IDS = {
  a010101: "seed-loc-sup-a-01-01-01",
  a010102: "seed-loc-sup-a-01-01-02",
  a010201: "seed-loc-sup-a-01-02-01",
  a010202: "seed-loc-sup-a-01-02-02",
  a020101: "seed-loc-sup-a-02-01-01",
  a020102: "seed-loc-sup-a-02-01-02",
} as const;

const SEEDED_AT = "2026-10-06T14:00:00.000Z";

const BLOCKED = new Set(["01-04-04"]);
const INACTIVE = new Set(["02-03-04"]);
const WITHOUT_CAPACITY = new Set(["02-03-03"]);

/**
 * Small demonstration grid. The original six addresses keep their ids.
 * Extra cells exist only so a first visit can show a shelf. Existing browsers
 * keep whatever is already stored.
 */
const RACKS: Array<{ rack: string; levels: number; positions: number }> = [
  { rack: "01", levels: 4, positions: 4 },
  { rack: "02", levels: 3, positions: 4 },
];

export function demoStorageAreas(): StorageArea[] {
  return [
    {
      id: DEMO_AREA_ID,
      code: "SUP",
      name: "Estoque Superior",
      status: "ACTIVE",
      notes: "Área de demonstração. Não representa uma empresa.",
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
  ];
}

export function demoLocations(): Location[] {
  return RACKS.flatMap((rack) =>
    range(rack.levels).flatMap((level) =>
      range(rack.positions).map((position) => demoLocation(rack.rack, level, position)),
    ),
  );
}

function demoLocation(rack: string, level: string, position: string): Location {
  const key = `${rack}-${level}-${position}`;
  const location: Location = {
    id: `seed-loc-sup-a-${key}`,
    code: `SUP-A-${key}`,
    areaId: DEMO_AREA_ID,
    aisle: "A",
    rack,
    level,
    position,
    status: statusOf(key),
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
  if (!WITHOUT_CAPACITY.has(key)) location.capacityBoxes = 4;
  return location;
}

function statusOf(key: string): LocationStatus {
  if (BLOCKED.has(key)) return "BLOCKED";
  if (INACTIVE.has(key)) return "INACTIVE";
  return "ACTIVE";
}

function range(size: number): string[] {
  return Array.from({ length: size }, (_, index) => String(index + 1).padStart(2, "0"));
}
