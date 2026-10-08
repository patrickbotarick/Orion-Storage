import { DuplicateStorageAreaCodeError } from "./errors";
import { toCodeToken } from "./normalize";

export const STORAGE_AREA_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type StorageAreaStatus = (typeof STORAGE_AREA_STATUSES)[number];

export const STORAGE_AREA_STATUS_LABEL: Record<StorageAreaStatus, string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
};

/** A physical zone of the warehouse. Not a company and not a shipping process. */
export type StorageArea = {
  id: string;
  code: string;
  name: string;
  status: StorageAreaStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StorageAreaCreateInput = {
  code: string;
  name: string;
  notes?: string;
};

export type StorageAreaUpdateInput = {
  name: string;
  notes?: string;
};

export function isStorageAreaStatus(value: string): value is StorageAreaStatus {
  return (STORAGE_AREA_STATUSES as readonly string[]).includes(value);
}

export function canonicalAreaCode(value: string | null | undefined): string {
  return toCodeToken(value);
}

export function findAreaByCode(
  areas: readonly StorageArea[],
  code: string,
  ignoreId?: string,
): StorageArea | undefined {
  const key = canonicalAreaCode(code);
  if (!key) return undefined;
  return areas.find((area) => area.id !== ignoreId && canonicalAreaCode(area.code) === key);
}

export function assertUniqueAreaCode(
  areas: readonly StorageArea[],
  code: string,
  ignoreId?: string,
): string {
  const canonical = canonicalAreaCode(code);
  const duplicate = findAreaByCode(areas, canonical, ignoreId);
  if (duplicate) throw new DuplicateStorageAreaCodeError(duplicate.code);
  return canonical;
}
