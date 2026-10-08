import { DuplicateMovementError, MovementNotNeededError, SameLocationMovementError } from "./errors";

export const MOVEMENT_TYPES = ["STORED", "MOVED", "REMOVED"] as const;
export const MOVEMENT_SOURCES = ["SCAN", "MANUAL"] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];
export type MovementSource = (typeof MOVEMENT_SOURCES)[number];

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  STORED: "Armazenada",
  MOVED: "Movida",
  REMOVED: "Removida",
};

export const MOVEMENT_SOURCE_LABEL: Record<MovementSource, string> = {
  SCAN: "Leitura",
  MANUAL: "Manual",
};

/** Official logistics record. Append-only. A correction is a new movement. */
export type Movement = {
  id: string;
  type: MovementType;
  boxId: string;
  fromLocationId?: string;
  toLocationId?: string;
  createdAt: string;
  notes?: string;
  source: MovementSource;
  metadata?: Record<string, string>;
};

export type MovementPlan = {
  type: MovementType;
  fromLocationId?: string;
  toLocationId?: string;
};

export function planMovement(
  currentLocationId: string | undefined,
  nextLocationId: string | undefined,
): MovementPlan {
  const current = currentLocationId?.trim() || undefined;
  const next = nextLocationId?.trim() || undefined;
  if (current && next && current === next) throw new SameLocationMovementError();
  if (!current && !next) throw new MovementNotNeededError();
  if (!current && next) return { type: "STORED", toLocationId: next };
  if (current && next) return { type: "MOVED", fromLocationId: current, toLocationId: next };
  return { type: "REMOVED", fromLocationId: current };
}

export function assertAppendOnly(existing: readonly { id: string }[], movement: { id: string }): void {
  if (existing.some((item) => item.id === movement.id)) throw new DuplicateMovementError(movement.id);
}
