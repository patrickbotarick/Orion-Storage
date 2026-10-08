import type { Location, LocationStatus } from "./location";
import { canonicalAddressPart } from "./location";
import { normalizeForComparison } from "./normalize";
import type { StorageArea } from "./storage-area";

export type LocationStatusFilter = LocationStatus | "ALL";

export type LocationListItem = {
  location: Location;
  area: StorageArea | null;
  boxCount: number;
};

export type LocationQuery = {
  text?: string;
  areaId?: string;
  status?: LocationStatusFilter;
  aisle?: string;
  rack?: string;
};

export function filterLocations(
  items: readonly LocationListItem[],
  query: LocationQuery,
): LocationListItem[] {
  const text = normalizeForComparison(query.text);
  const aisle = canonicalAddressPart(query.aisle);
  const rack = canonicalAddressPart(query.rack);
  const status = query.status ?? "ALL";
  const areaId = query.areaId?.trim() ?? "";

  return items.filter((item) => {
    const { location, area } = item;
    if (status !== "ALL" && location.status !== status) return false;
    if (areaId && location.areaId !== areaId) return false;
    if (aisle && canonicalAddressPart(location.aisle) !== aisle) return false;
    if (rack && canonicalAddressPart(location.rack) !== rack) return false;
    if (!text) return true;
    const haystack = [
      location.code,
      area?.code,
      area?.name,
      location.aisle,
      location.rack,
      location.level,
      location.position,
      location.notes,
    ]
      .map((value) => normalizeForComparison(value))
      .join(" ");
    return haystack.includes(text);
  });
}

export type LocationTree = {
  areaId: string;
  areaName: string;
  areaCode: string;
  aisles: {
    aisle: string;
    racks: {
      rack: string;
      levels: {
        level: string;
        positions: LocationListItem[];
      }[];
    }[];
  }[];
};

export function groupLocations(items: readonly LocationListItem[]): LocationTree[] {
  const areas = new Map<string, LocationTree>();
  const sorted = [...items].sort((a, b) => a.location.code.localeCompare(b.location.code));
  for (const item of sorted) {
    const areaKey = item.location.areaId;
    let area = areas.get(areaKey);
    if (!area) {
      area = {
        areaId: areaKey,
        areaName: item.area?.name ?? "Área não encontrada",
        areaCode: item.area?.code ?? "—",
        aisles: [],
      };
      areas.set(areaKey, area);
    }
    let aisle = area.aisles.find((entry) => entry.aisle === item.location.aisle);
    if (!aisle) {
      aisle = { aisle: item.location.aisle, racks: [] };
      area.aisles.push(aisle);
    }
    let rack = aisle.racks.find((entry) => entry.rack === item.location.rack);
    if (!rack) {
      rack = { rack: item.location.rack, levels: [] };
      aisle.racks.push(rack);
    }
    let level = rack.levels.find((entry) => entry.level === item.location.level);
    if (!level) {
      level = { level: item.location.level, positions: [] };
      rack.levels.push(level);
    }
    level.positions.push(item);
  }
  return [...areas.values()];
}
