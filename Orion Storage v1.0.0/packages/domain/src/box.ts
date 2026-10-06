import { BoxProductImmutableError } from "./errors";

export const BOX_STATUSES = ["RECEIVED", "AVAILABLE", "OPENED", "EMPTY", "BLOCKED"] as const;

export type BoxStatus = (typeof BOX_STATUSES)[number];

/** Condition of the physical box. Not a shelf, aisle or shipping state. */
export const BOX_STATUS_LABEL: Record<BoxStatus, string> = {
  RECEIVED: "Recebida",
  AVAILABLE: "Disponível",
  OPENED: "Aberta",
  EMPTY: "Vazia",
  BLOCKED: "Bloqueada",
};

export const BOX_HISTORY_TYPES = [
  "CREATED",
  "UPDATED",
  "STATUS_CHANGED",
  "LOCATION_ASSIGNED",
  "LOCATION_CHANGED",
  "LOCATION_CLEARED",
] as const;

export type BoxHistoryType = (typeof BOX_HISTORY_TYPES)[number];

export type BoxHistoryMetadata = Record<string, string>;

export type BoxHistoryEntry = {
  id: string;
  boxId: string;
  type: BoxHistoryType;
  createdAt: string;
  description: string;
  metadata?: BoxHistoryMetadata;
};

export type BoxContentFields = {
  rollsQuantity: number;
  totalLengthM: number;
  manufacturerBatch?: string;
  receivedAt: string;
  notes?: string;
};

export type BoxCreateInput = BoxContentFields & {
  productId: string;
};

export type BoxUpdateInput = BoxContentFields;

export type Box = BoxContentFields & {
  id: string;
  code: string;
  productId: string;
  status: BoxStatus;
  /** Current physical address. Absent means the box is not on a position yet. */
  currentLocationId?: string;
  createdAt: string;
  updatedAt: string;
  history: BoxHistoryEntry[];
};

export function isBoxStatus(value: string): value is BoxStatus {
  return (BOX_STATUSES as readonly string[]).includes(value);
}

/** A physical box keeps the product it was created with. */
export function assertProductLinkUnchanged(
  currentProductId: string,
  requestedProductId: string | undefined,
): void {
  if (requestedProductId != null && requestedProductId !== currentProductId) {
    throw new BoxProductImmutableError();
  }
}
