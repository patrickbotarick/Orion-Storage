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
}): BoxHistoryEntry {
  return {
    id: input.id,
    boxId: input.boxId,
    type: "CREATED",
    createdAt: input.createdAt,
    description: `Caixa ${input.code} registrada e vinculada ao produto.`,
    metadata: { productId: input.productId, status: "RECEIVED" },
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
