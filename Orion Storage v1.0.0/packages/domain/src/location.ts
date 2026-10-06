import {
  DuplicateLocationError,
  LocationCapacityError,
  LocationCapacityTooSmallError,
  LocationNotAssignableError,
  LocationStructureLockedError,
  LocationValidationError,
  type FieldIssue,
} from "./errors";
import { canonicalAreaCode } from "./storage-area";
import { toCodeToken } from "./normalize";

export const LOCATION_STATUSES = ["ACTIVE", "BLOCKED", "INACTIVE"] as const;

export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const LOCATION_STATUS_LABEL: Record<LocationStatus, string> = {
  ACTIVE: "Ativa",
  BLOCKED: "Bloqueada",
  INACTIVE: "Inativa",
};

/** A usable physical address. One box is in at most one location. */
export type Location = {
  id: string;
  code: string;
  areaId: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  status: LocationStatus;
  capacityBoxes?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocationStructure = {
  areaId: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
};

export type LocationDraft = LocationStructure & {
  code: string;
  capacityBoxes?: number;
  notes?: string;
};

export function isLocationStatus(value: string): value is LocationStatus {
  return (LOCATION_STATUSES as readonly string[]).includes(value);
}

export function canonicalAddressPart(value: string | null | undefined): string {
  return toCodeToken(value);
}

export function canonicalStructure(input: LocationStructure): LocationStructure {
  return {
    areaId: input.areaId.trim(),
    aisle: canonicalAddressPart(input.aisle),
    rack: canonicalAddressPart(input.rack),
    level: canonicalAddressPart(input.level),
    position: canonicalAddressPart(input.position),
  };
}

export function buildLocationCode(areaCode: string, structure: LocationStructure): string {
  const parts = canonicalStructure(structure);
  const segments = [
    canonicalAreaCode(areaCode),
    parts.aisle,
    parts.rack,
    parts.level,
    parts.position,
  ];
  const issues: FieldIssue[] = [];
  if (!segments[0]) issues.push({ path: "areaId", message: "Selecione a área." });
  if (!parts.aisle) issues.push({ path: "aisle", message: "Informe o corredor." });
  if (!parts.rack) issues.push({ path: "rack", message: "Informe a prateleira." });
  if (!parts.level) issues.push({ path: "level", message: "Informe o nível." });
  if (!parts.position) issues.push({ path: "position", message: "Informe a posição." });
  if (issues.length > 0) throw new LocationValidationError(issues);
  return segments.join("-");
}

export function addressIdentity(structure: LocationStructure): string {
  const parts = canonicalStructure(structure);
  return [parts.areaId, parts.aisle, parts.rack, parts.level, parts.position].join("\u0000");
}

export function sameLocationStructure(current: LocationStructure, next: LocationStructure): boolean {
  return addressIdentity(current) === addressIdentity(next);
}

export function findLocationConflict(
  locations: readonly Location[],
  candidate: LocationStructure & { code: string },
  ignoreId?: string,
): Location | undefined {
  const identity = addressIdentity(candidate);
  const code = candidate.code.toUpperCase();
  return locations.find((location) => {
    if (location.id === ignoreId) return false;
    return location.code.toUpperCase() === code || addressIdentity(location) === identity;
  });
}

export function assertUniqueLocation(
  locations: readonly Location[],
  candidate: LocationStructure & { code: string },
  ignoreId?: string,
): void {
  const conflict = findLocationConflict(locations, candidate, ignoreId);
  if (conflict) throw new DuplicateLocationError(conflict.code);
}

export function assertLocationAssignable(status: LocationStatus): void {
  if (status === "ACTIVE") return;
  throw new LocationNotAssignableError(status);
}

export function countBoxesAtLocation(
  boxes: readonly { id: string; currentLocationId?: string }[],
  locationId: string,
  ignoreBoxId?: string,
): number {
  return boxes.filter(
    (box) => box.currentLocationId === locationId && box.id !== ignoreBoxId,
  ).length;
}

export function assertLocationHasRoom(input: {
  capacityBoxes?: number;
  boxes: readonly { id: string; currentLocationId?: string }[];
  locationId: string;
  movingBoxId: string;
}): void {
  if (input.capacityBoxes == null) return;
  const occupied = countBoxesAtLocation(input.boxes, input.locationId, input.movingBoxId);
  if (occupied >= input.capacityBoxes) throw new LocationCapacityError(input.capacityBoxes);
}

export function assertCapacityCoversOccupancy(capacityBoxes: number | undefined, occupied: number): void {
  if (capacityBoxes == null) return;
  if (capacityBoxes < occupied) throw new LocationCapacityTooSmallError(occupied);
}

export function assertStructureEditable(occupied: number, changed: boolean): void {
  if (occupied > 0 && changed) throw new LocationStructureLockedError();
}
