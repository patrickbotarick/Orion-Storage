import type { Box } from "./box";
import type { Location } from "./location";
import { normalizeForComparison } from "./normalize";

export const INVENTORY_STATUSES = ["IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const INVENTORY_SCOPES = ["AREA", "AISLE", "RACK", "LEVEL", "LOCATION"] as const;
export const INVENTORY_CLASSIFICATIONS = [
  "MATCH",
  "MISSING",
  "UNEXPECTED",
  "WRONG_LOCATION",
] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];
export type InventoryScopeKind = (typeof INVENTORY_SCOPES)[number];
export type InventoryClassification = (typeof INVENTORY_CLASSIFICATIONS)[number];
export const INVENTORY_STATUS_LABEL: Record<InventoryStatus, string> = {
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};
export const INVENTORY_SCOPE_LABEL: Record<InventoryScopeKind, string> = {
  AREA: "Área",
  AISLE: "Corredor",
  RACK: "Prateleira",
  LEVEL: "Nível",
  LOCATION: "Posição",
};
export const INVENTORY_CLASSIFICATION_LABEL: Record<InventoryClassification, string> = {
  MATCH: "Corretas",
  MISSING: "Faltando",
  UNEXPECTED: "Inesperadas",
  WRONG_LOCATION: "Localização incorreta",
};
export type InventoryScope = {
  scope: InventoryScopeKind;
  areaId: string;
  aisle?: string;
  rack?: string;
  level?: string;
  locationId?: string;
};
export type InventoryBoxSnapshot = {
  boxId: string;
  code: string;
  productId: string;
  expectedLocationId?: string;
  expectedLocationCode?: string;
};
export type InventoryItem = InventoryBoxSnapshot & {
  foundLocationId?: string;
  foundAt?: string;
  expected: boolean;
  found: boolean;
  classification: InventoryClassification;
};
export type InventorySession = InventoryScope & {
  id: string;
  code: string;
  status: InventoryStatus;
  scopeLabel: string;
  locations: Location[];
  /** All known boxes at start, including boxes outside the selected scope. */
  catalogSnapshot: InventoryBoxSnapshot[];
  items: InventoryItem[];
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};
export class InventoryError extends Error {}

export function inventoryScopeLocations(
  scope: InventoryScope,
  locations: readonly Location[],
): Location[] {
  if (!INVENTORY_SCOPES.includes(scope.scope) || !scope.areaId?.trim()) {
    throw new InventoryError("Selecione um escopo e uma área válidos.");
  }
  const required =
    scope.scope === "LOCATION"
      ? ["locationId"]
      : scope.scope === "LEVEL"
        ? ["aisle", "rack", "level"]
        : scope.scope === "RACK"
          ? ["aisle", "rack"]
          : scope.scope === "AISLE"
            ? ["aisle"]
            : [];
  if (required.some((key) => !scope[key as keyof InventoryScope]?.trim())) {
    throw new InventoryError("Complete a seleção do escopo.");
  }
  const selected = locations.filter((location) => {
    if (location.areaId !== scope.areaId) return false;
    if (scope.scope === "LOCATION") return location.id === scope.locationId;
    if (scope.scope === "AREA") return true;
    if (location.aisle !== scope.aisle) return false;
    if (scope.scope === "AISLE") return true;
    if (location.rack !== scope.rack) return false;
    return scope.scope === "RACK" || location.level === scope.level;
  });
  if (!selected.length) throw new InventoryError("O escopo não contém posições cadastradas.");
  return selected.map((location) => ({ ...location }));
}

export function inventoryBoxSnapshot(
  box: Box,
  locations: readonly Location[] = [],
): InventoryBoxSnapshot {
  return {
    boxId: box.id,
    code: box.code,
    productId: box.productId,
    expectedLocationId: box.currentLocationId,
    expectedLocationCode: locations.find((location) => location.id === box.currentLocationId)?.code,
  };
}

export function snapshotInventoryItems(
  catalog: readonly InventoryBoxSnapshot[],
  locations: readonly Location[],
): InventoryItem[] {
  const selected = new Set(locations.map((location) => location.id));
  return catalog
    .filter((box) => box.expectedLocationId && selected.has(box.expectedLocationId))
    .map((box) => ({ ...box, expected: true, found: false, classification: "MISSING" }));
}

export function assertInventoryOpen(session: InventorySession): void {
  if (session.status !== "IN_PROGRESS")
    throw new InventoryError("Esta sessão está encerrada e não aceita alterações.");
}

/** Pure observation: neither a box nor a movement is changed here. */
export function observeInventoryBox(
  session: InventorySession,
  box: InventoryBoxSnapshot,
  locationId: string,
  at: string,
): InventorySession {
  assertInventoryOpen(session);
  if (!session.locations.some((location) => location.id === locationId)) {
    throw new InventoryError("A posição encontrada precisa pertencer ao escopo deste inventário.");
  }
  const existing = session.items.find((item) => item.boxId === box.boxId);
  if (existing?.found) throw new InventoryError("Esta caixa já foi contabilizada.");
  const frozen =
    existing ?? session.catalogSnapshot.find((item) => item.boxId === box.boxId) ?? box;
  const expected = existing?.expected ?? false;
  const classification: InventoryClassification = frozen.expectedLocationId
    ? frozen.expectedLocationId === locationId && expected
      ? "MATCH"
      : "WRONG_LOCATION"
    : "UNEXPECTED";
  const found: InventoryItem = {
    ...frozen,
    expected,
    found: true,
    foundLocationId: locationId,
    foundAt: at,
    classification,
  };
  return {
    ...session,
    items: existing
      ? session.items.map((item) => (item.boxId === box.boxId ? found : item))
      : [...session.items, found],
    updatedAt: at,
    revision: session.revision + 1,
  };
}

export function finishInventory(
  session: InventorySession,
  status: "COMPLETED" | "CANCELLED",
  at: string,
): InventorySession {
  assertInventoryOpen(session);
  return {
    ...session,
    status,
    updatedAt: at,
    revision: session.revision + 1,
    ...(status === "COMPLETED" ? { completedAt: at } : { cancelledAt: at }),
  };
}

export function summarizeInventory(session: Pick<InventorySession, "items">) {
  const summary = {
    expected: 0,
    found: 0,
    match: 0,
    missing: 0,
    unexpected: 0,
    wrongLocation: 0,
    divergences: 0,
  };
  for (const item of session.items) {
    if (item.expected) summary.expected++;
    if (item.found) summary.found++;
    if (item.classification === "MATCH") summary.match++;
    if (item.classification === "MISSING") summary.missing++;
    if (item.classification === "UNEXPECTED") summary.unexpected++;
    if (item.classification === "WRONG_LOCATION") summary.wrongLocation++;
  }
  summary.divergences = summary.missing + summary.unexpected + summary.wrongLocation;
  return summary;
}

export type InventoryQuery = { text?: string; status?: InventoryStatus | "ALL" };
export function filterInventories(
  sessions: readonly InventorySession[],
  query: InventoryQuery,
): InventorySession[] {
  const tokens = normalizeForComparison(query.text).split(" ").filter(Boolean);
  return sessions
    .filter((session) => {
      if (query.status && query.status !== "ALL" && session.status !== query.status) return false;
      const haystack = normalizeForComparison(
        [
          session.code,
          session.scopeLabel,
          session.notes,
          ...session.items.map((item) => item.code),
        ].join(" "),
      );
      return tokens.every((token) => haystack.includes(token));
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.code.localeCompare(a.code));
}

/** Most recently completed session covering each position wins; cancelled/open sessions do not count. */
export function inventoryDivergenceLocations(sessions: readonly InventorySession[]): Set<string> {
  const latest = new Map<string, InventorySession>();
  for (const session of sessions
    .filter((item) => item.status === "COMPLETED")
    .sort(
      (a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "") || b.code.localeCompare(a.code),
    )) {
    for (const location of session.locations)
      if (!latest.has(location.id)) latest.set(location.id, session);
  }
  const result = new Set<string>();
  for (const [locationId, session] of latest) {
    if (
      session.items.some(
        (item) =>
          item.classification !== "MATCH" &&
          (item.expectedLocationId === locationId || item.foundLocationId === locationId),
      )
    )
      result.add(locationId);
  }
  return result;
}
