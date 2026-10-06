import type { BoxStatus } from "./box";
import type { Location, LocationStatus } from "./location";
import { canonicalAddressPart } from "./location";
import { normalizeForComparison } from "./normalize";
import type { Product } from "./product";
import type { StorageAreaStatus } from "./storage-area";

export const OCCUPANCY_KINDS = [
  "EMPTY",
  "PARTIAL",
  "FULL",
  "UNBOUNDED",
  "BLOCKED",
  "INACTIVE",
] as const;

export type OccupancyKind = (typeof OCCUPANCY_KINDS)[number];

export const OCCUPANCY_LABEL: Record<OccupancyKind, string> = {
  EMPTY: "Livre",
  PARTIAL: "Parcial",
  FULL: "Lotada",
  UNBOUNDED: "Sem capacidade",
  BLOCKED: "Bloqueada",
  INACTIVE: "Inativa",
};

export type MapBox = {
  id: string;
  code: string;
  productId: string;
  status: BoxStatus;
  currentLocationId?: string;
};

export type LocationOccupancy = {
  boxCount: number;
  capacityBoxes?: number;
  kind: OccupancyKind;
};

export type WarehouseFilters = {
  aisle?: string;
  rack?: string;
  status?: LocationStatus | "ALL";
  fill?: "ALL" | "EMPTY" | "OCCUPIED" | "FULL";
  productId?: string;
  brand?: string;
};

export type AreaOccupancy = {
  locations: number;
  occupied: number;
  free: number;
  blocked: number;
  inactive: number;
  storedBoxes: number;
  knownCapacity: number | null;
  boxesInKnownCapacity: number;
  /** Boxes in locations that declare capacity, divided by that capacity. Null when none do. */
  occupancyRatio: number | null;
};

export type MapCell = {
  location: Location;
  occupancy: LocationOccupancy;
  boxes: MapBox[];
};

export type RackView = {
  aisle: string;
  rack: string;
  /** Higher levels first, like the top of a shelf. */
  levels: string[];
  positions: string[];
  cells: ReadonlyMap<string, MapCell>;
};

export type WarehouseView = {
  aisles: Array<{ aisle: string; racks: RackView[] }>;
};

export type WarehousePlace = {
  locationId: string;
  code: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  boxCount: number;
};

export type WarehouseProductHit = {
  productId: string;
  label: string;
  brand?: string;
  colorName?: string;
  widthMm?: number;
  totalBoxes: number;
  places: WarehousePlace[];
};

export type WarehouseLooseBox = {
  boxId: string;
  code: string;
  productId: string;
  label: string;
};

export type WarehouseSearchResult = {
  locationIds: string[];
  places: WarehousePlace[];
  products: WarehouseProductHit[];
  looseBoxes: WarehouseLooseBox[];
};

const EMPTY_SEARCH: WarehouseSearchResult = {
  locationIds: [],
  places: [],
  products: [],
  looseBoxes: [],
};

export function compareNatural(left: string, right: string): number {
  return left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });
}

export function cellKey(level: string, position: string): string {
  return `${level}\u0000${position}`;
}

export function groupLocationsByArea(locations: readonly Location[]): Map<string, Location[]> {
  const grouped = new Map<string, Location[]>();
  for (const location of locations) {
    const current = grouped.get(location.areaId);
    if (current) current.push(location);
    else grouped.set(location.areaId, [location]);
  }
  return grouped;
}

export function areaInactiveBadge(status: StorageAreaStatus): string | null {
  return status === "INACTIVE" ? "INATIVA" : null;
}

export function boxesByLocation(boxes: readonly MapBox[]): Map<string, MapBox[]> {
  const grouped = new Map<string, MapBox[]>();
  for (const box of boxes) {
    if (!box.currentLocationId) continue;
    const current = grouped.get(box.currentLocationId);
    if (current) current.push(box);
    else grouped.set(box.currentLocationId, [box]);
  }
  for (const list of grouped.values()) list.sort((a, b) => a.code.localeCompare(b.code));
  return grouped;
}

export function classifyOccupancy(input: {
  status: LocationStatus;
  boxCount: number;
  capacityBoxes?: number;
}): OccupancyKind {
  if (input.status === "BLOCKED") return "BLOCKED";
  if (input.status === "INACTIVE") return "INACTIVE";
  if (input.capacityBoxes == null) return input.boxCount > 0 ? "UNBOUNDED" : "EMPTY";
  if (input.boxCount <= 0) return "EMPTY";
  if (input.boxCount >= input.capacityBoxes) return "FULL";
  return "PARTIAL";
}

export function occupancyOf(location: Location, boxCount: number): LocationOccupancy {
  const occupancy: LocationOccupancy = {
    boxCount,
    kind: classifyOccupancy({
      status: location.status,
      boxCount,
      capacityBoxes: location.capacityBoxes,
    }),
  };
  if (location.capacityBoxes != null) occupancy.capacityBoxes = location.capacityBoxes;
  return occupancy;
}

export function formatOccupancyCount(occupancy: LocationOccupancy): string {
  if (occupancy.capacityBoxes == null) return String(occupancy.boxCount);
  return `${occupancy.boxCount} / ${occupancy.capacityBoxes}`;
}

export function formatOccupancyPercent(ratio: number | null): string | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  const text = (Math.round(ratio * 1000) / 10).toFixed(1).replace(".", ",");
  return `${text}%`;
}

const SPOKEN_KIND: Record<OccupancyKind, string> = {
  EMPTY: "livre",
  PARTIAL: "parcialmente ocupada",
  FULL: "lotada",
  UNBOUNDED: "sem capacidade",
  BLOCKED: "bloqueada",
  INACTIVE: "inativa",
};

export function spokenLocation(location: Location, occupancy: LocationOccupancy): string {
  const count =
    occupancy.capacityBoxes == null
      ? `${occupancy.boxCount} caixas, capacidade não definida`
      : `${occupancy.boxCount} de ${occupancy.capacityBoxes} caixas`;
  return `${location.code}, ${count}, ${SPOKEN_KIND[occupancy.kind]}.`;
}

export function calculateAreaOccupancy(
  locations: readonly Location[],
  boxes: readonly { currentLocationId?: string }[],
): AreaOccupancy {
  const counts = new Map<string, number>();
  for (const box of boxes) {
    if (!box.currentLocationId) continue;
    counts.set(box.currentLocationId, (counts.get(box.currentLocationId) ?? 0) + 1);
  }
  let occupied = 0;
  let free = 0;
  let blocked = 0;
  let inactive = 0;
  let storedBoxes = 0;
  let knownCapacity = 0;
  let boxesInKnownCapacity = 0;
  let knownLocations = 0;
  for (const location of locations) {
    const count = counts.get(location.id) ?? 0;
    storedBoxes += count;
    if (count > 0) occupied += 1;
    else free += 1;
    if (location.status === "BLOCKED") blocked += 1;
    if (location.status === "INACTIVE") inactive += 1;
    if (location.capacityBoxes != null) {
      knownLocations += 1;
      knownCapacity += location.capacityBoxes;
      boxesInKnownCapacity += count;
    }
  }
  const ratio =
    knownLocations > 0 && knownCapacity > 0 ? boxesInKnownCapacity / knownCapacity : null;
  return {
    locations: locations.length,
    occupied,
    free,
    blocked,
    inactive,
    storedBoxes,
    knownCapacity: knownLocations > 0 ? knownCapacity : null,
    boxesInKnownCapacity,
    occupancyRatio: ratio,
  };
}

export function filterWarehouseLocations(
  locations: readonly Location[],
  boxes: readonly MapBox[],
  products: readonly Product[],
  filters: WarehouseFilters,
): Location[] {
  const grouped = boxesByLocation(boxes);
  const productById = new Map(products.map((product) => [product.id, product]));
  const aisle = canonicalAddressPart(filters.aisle);
  const rack = canonicalAddressPart(filters.rack);
  const status = filters.status ?? "ALL";
  const fill = filters.fill ?? "ALL";
  const productId = filters.productId?.trim() ?? "";
  const brand = normalizeForComparison(filters.brand);
  return locations.filter((location) => {
    if (aisle && canonicalAddressPart(location.aisle) !== aisle) return false;
    if (rack && canonicalAddressPart(location.rack) !== rack) return false;
    if (status !== "ALL" && location.status !== status) return false;
    const own = grouped.get(location.id) ?? [];
    const count = own.length;
    if (fill === "EMPTY" && count !== 0) return false;
    if (fill === "OCCUPIED" && count === 0) return false;
    if (fill === "FULL" && (location.capacityBoxes == null || count < location.capacityBoxes)) {
      return false;
    }
    if (productId && !own.some((box) => box.productId === productId)) return false;
    if (brand) {
      const matchesBrand = own.some((box) => {
        const product = productById.get(box.productId);
        return normalizeForComparison(product?.brand) === brand;
      });
      if (!matchesBrand) return false;
    }
    return true;
  });
}

export function buildWarehouseMap(
  locations: readonly Location[],
  boxes: readonly MapBox[],
): WarehouseView {
  const grouped = boxesByLocation(boxes);
  const aisles = new Map<string, Map<string, Location[]>>();
  for (const location of locations) {
    let racks = aisles.get(location.aisle);
    if (!racks) {
      racks = new Map();
      aisles.set(location.aisle, racks);
    }
    const list = racks.get(location.rack);
    if (list) list.push(location);
    else racks.set(location.rack, [location]);
  }
  return {
    aisles: [...aisles.keys()].sort(compareNatural).map((aisle) => {
      const racks = aisles.get(aisle)!;
      return {
        aisle,
        racks: [...racks.keys()].sort(compareNatural).map((rack) => {
          const rackLocations = racks.get(rack)!;
          const levels = uniqueSorted(rackLocations.map((item) => item.level)).reverse();
          const positions = uniqueSorted(rackLocations.map((item) => item.position));
          const cells = new Map<string, MapCell>();
          for (const location of rackLocations) {
            const own = grouped.get(location.id) ?? [];
            cells.set(cellKey(location.level, location.position), {
              location,
              occupancy: occupancyOf(location, own.length),
              boxes: own,
            });
          }
          return { aisle, rack, levels, positions, cells };
        }),
      };
    }),
  };
}

export function searchWarehouse(
  query: string,
  input: {
    locations: readonly Location[];
    boxes: readonly MapBox[];
    products: readonly Product[];
  },
): WarehouseSearchResult {
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !isUnitToken(token));
  if (tokens.length === 0) return EMPTY_SEARCH;
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const grouped = boxesByLocation(input.boxes);
  const places: WarehousePlace[] = [];
  const productPlaces = new Map<string, Map<string, WarehousePlace>>();

  for (const location of input.locations) {
    const own = grouped.get(location.id) ?? [];
    const locationHit = tokens.every((token) => locationMatches(token, location));
    const matching = own.filter((box) =>
      boxMatches(tokens, box, productsById.get(box.productId), location),
    );
    if (!locationHit && matching.length === 0) continue;
    const shown = locationHit ? own : matching;
    places.push(placeOf(location, shown.length));
    for (const box of shown) addProductPlace(productPlaces, box, location);
  }

  const looseBoxes: WarehouseLooseBox[] = [];
  for (const box of input.boxes) {
    if (box.currentLocationId) continue;
    const product = productsById.get(box.productId);
    if (!boxMatches(tokens, box, product)) continue;
    looseBoxes.push({
      boxId: box.id,
      code: box.code,
      productId: box.productId,
      label: productLabel(product),
    });
  }
  looseBoxes.sort((left, right) => left.code.localeCompare(right.code));

  const products = [...productPlaces.entries()]
    .map(([productId, byLocation]) => {
      const product = productsById.get(productId);
      const productPlaceList = [...byLocation.values()].sort((left, right) =>
        left.code.localeCompare(right.code),
      );
      const hit: WarehouseProductHit = {
        productId,
        label: productLabel(product),
        totalBoxes: productPlaceList.reduce((sum, place) => sum + place.boxCount, 0),
        places: productPlaceList,
      };
      if (product?.brand) hit.brand = product.brand;
      if (product?.colorName) hit.colorName = product.colorName;
      if (product?.widthMm != null) hit.widthMm = product.widthMm;
      return hit;
    })
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    locationIds: places.map((place) => place.locationId),
    places: places.sort((left, right) => left.code.localeCompare(right.code)),
    products,
    looseBoxes,
  };
}

export function isSearchHighlight(locationId: string, result: WarehouseSearchResult): boolean {
  return result.locationIds.includes(locationId);
}

function addProductPlace(
  productPlaces: Map<string, Map<string, WarehousePlace>>,
  box: MapBox,
  location: Location,
): void {
  let byLocation = productPlaces.get(box.productId);
  if (!byLocation) {
    byLocation = new Map();
    productPlaces.set(box.productId, byLocation);
  }
  const current = byLocation.get(location.id);
  if (current) current.boxCount += 1;
  else byLocation.set(location.id, placeOf(location, 1));
}

function placeOf(location: Location, boxCount: number): WarehousePlace {
  return {
    locationId: location.id,
    code: location.code,
    aisle: location.aisle,
    rack: location.rack,
    level: location.level,
    position: location.position,
    boxCount,
  };
}

function productLabel(product: Product | undefined): string {
  if (!product) return "Produto não encontrado";
  return [product.brand, product.name, product.colorName].filter(Boolean).join(" · ");
}

function boxMatches(
  tokens: readonly string[],
  box: MapBox,
  product: Product | undefined,
  location?: Location,
): boolean {
  const text = [
    box.code,
    product?.internalCode,
    product?.name,
    product?.brand,
    product?.colorName,
    product?.colorCode,
    location?.code,
  ]
    .map((value) => normalizeForComparison(value))
    .join(" ");
  const numbers = [product?.widthMm, product?.thicknessMm].filter(
    (value): value is number => value != null,
  );
  return tokens.every((token) => tokenHits(token, text, numbers));
}

function locationMatches(token: string, location: Location): boolean {
  const text = [location.code, location.aisle, location.rack, location.level, location.position]
    .map((value) => normalizeForComparison(value))
    .join(" ");
  return tokenHits(token, text, []);
}

function tokenHits(token: string, text: string, numbers: readonly number[]): boolean {
  if (/^\d+$/.test(token) && numbers.some((value) => String(value) === token)) return true;
  const normalized = normalizeForComparison(token);
  if (!normalized) return true;
  return text.split(" ").some((part) => part.includes(normalized));
}

function isUnitToken(token: string): boolean {
  return /^(mm|cm|m)$/i.test(token);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareNatural);
}
