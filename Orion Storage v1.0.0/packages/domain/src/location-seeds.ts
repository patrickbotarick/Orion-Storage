import type { Location } from "./location";
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

const POSITIONS: Array<{ id: string; rack: string; level: string; position: string }> = [
  { id: DEMO_LOCATION_IDS.a010101, rack: "01", level: "01", position: "01" },
  { id: DEMO_LOCATION_IDS.a010102, rack: "01", level: "01", position: "02" },
  { id: DEMO_LOCATION_IDS.a010201, rack: "01", level: "02", position: "01" },
  { id: DEMO_LOCATION_IDS.a010202, rack: "01", level: "02", position: "02" },
  { id: DEMO_LOCATION_IDS.a020101, rack: "02", level: "01", position: "01" },
  { id: DEMO_LOCATION_IDS.a020102, rack: "02", level: "01", position: "02" },
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
  return POSITIONS.map((item) => ({
    id: item.id,
    code: `SUP-A-${item.rack}-${item.level}-${item.position}`,
    areaId: DEMO_AREA_ID,
    aisle: "A",
    rack: item.rack,
    level: item.level,
    position: item.position,
    status: "ACTIVE",
    capacityBoxes: 4,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  }));
}
