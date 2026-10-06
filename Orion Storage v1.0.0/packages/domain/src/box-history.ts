import {
  BOX_STATUS_LABEL,
  type BoxContentFields,
  type BoxHistoryEntry,
  type BoxStatus,
} from "./box";

const FIELD_LABEL: Record<keyof BoxContentFields, string> = {
  rollsQuantity: "quantidade de rolos",
  totalLengthM: "metragem total",
  manufacturerBatch: "lote",
  receivedAt: "data de recebimento",
  notes: "observações",
};

export function changedBoxFields(
  before: BoxContentFields,
  after: BoxContentFields,
): Array<keyof BoxContentFields> {
  const fields: Array<keyof BoxContentFields> = [];
  if (before.rollsQuantity !== after.rollsQuantity) fields.push("rollsQuantity");
  if (before.totalLengthM !== after.totalLengthM) fields.push("totalLengthM");
  if ((before.manufacturerBatch ?? "") !== (after.manufacturerBatch ?? "")) {
    fields.push("manufacturerBatch");
  }
  if (before.receivedAt !== after.receivedAt) fields.push("receivedAt");
  if ((before.notes ?? "") !== (after.notes ?? "")) fields.push("notes");
  return fields;
}

export function buildCreatedHistory(input: {
  id: string;
  boxId: string;
  code: string;
  productId: string;
  createdAt: string;
  receiptId?: string;
  receiptCode?: string;
}): BoxHistoryEntry {
  const metadata: Record<string, string> = {
    productId: input.productId,
    status: "RECEIVED",
  };
  if (input.receiptId) metadata.receiptId = input.receiptId;
  if (input.receiptCode) metadata.receiptCode = input.receiptCode;
  const description = input.receiptCode
    ? `Caixa ${input.code} registrada pelo recebimento ${input.receiptCode}.`
    : `Caixa ${input.code} registrada e vinculada ao produto.`;
  return {
    id: input.id,
    boxId: input.boxId,
    type: "CREATED",
    createdAt: input.createdAt,
    description,
    metadata,
  };
}

export function buildUpdatedHistory(input: {
  id: string;
  boxId: string;
  createdAt: string;
  before: BoxContentFields;
  after: BoxContentFields;
}): BoxHistoryEntry | null {
  const fields = changedBoxFields(input.before, input.after);
  if (fields.length === 0) return null;
  return {
    id: input.id,
    boxId: input.boxId,
    type: "UPDATED",
    createdAt: input.createdAt,
    description: `Caixa atualizada: ${fields.map((field) => FIELD_LABEL[field]).join(", ")}.`,
    metadata: { fields: fields.join(",") },
  };
}

export function buildStatusHistory(input: {
  id: string;
  boxId: string;
  createdAt: string;
  previous: BoxStatus;
  next: BoxStatus;
}): BoxHistoryEntry | null {
  if (input.previous === input.next) return null;
  return {
    id: input.id,
    boxId: input.boxId,
    type: "STATUS_CHANGED",
    createdAt: input.createdAt,
    description: `Status alterado de ${BOX_STATUS_LABEL[input.previous]} para ${BOX_STATUS_LABEL[input.next]}.`,
    metadata: { previousStatus: input.previous, nextStatus: input.next },
  };
}

export function buildLocationHistory(input: {
  id: string;
  boxId: string;
  createdAt: string;
  previousId?: string;
  previousCode?: string;
  nextId?: string;
  nextCode?: string;
  movementId?: string;
}): BoxHistoryEntry | null {
  const previousId = input.previousId?.trim() || undefined;
  const nextId = input.nextId?.trim() || undefined;
  if (previousId === nextId) return null;
  const previousCode = input.previousCode?.trim() || previousId || "sem código";
  const nextCode = input.nextCode?.trim() || nextId || "sem código";
  const metadata: Record<string, string> = {};
  if (previousId) metadata.previousLocationId = previousId;
  if (input.previousCode) metadata.previousLocationCode = input.previousCode;
  if (nextId) metadata.nextLocationId = nextId;
  if (input.nextCode) metadata.nextLocationCode = input.nextCode;
  if (input.movementId) metadata.movementId = input.movementId;

  if (!previousId && nextId) {
    return {
      id: input.id,
      boxId: input.boxId,
      type: "LOCATION_ASSIGNED",
      createdAt: input.createdAt,
      description: `Caixa endereçada em ${nextCode}.`,
      metadata,
    };
  }
  if (previousId && nextId) {
    return {
      id: input.id,
      boxId: input.boxId,
      type: "LOCATION_CHANGED",
      createdAt: input.createdAt,
      description: `Localização alterada de ${previousCode} para ${nextCode}.`,
      metadata,
    };
  }
  return {
    id: input.id,
    boxId: input.boxId,
    type: "LOCATION_CLEARED",
    createdAt: input.createdAt,
    description: `Localização ${previousCode} removida. A caixa ficou sem endereço.`,
    metadata,
  };
}
