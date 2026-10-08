import { z } from "zod";

import type { Box, BoxCreateInput, BoxUpdateInput } from "./box";
import { formatOperationalDate } from "./box-code";
import { BoxValidationError } from "./errors";
import { roundLengthM } from "./length";
import { normalizeDisplay } from "./normalize";
import { parseOptionalDecimal, parseOptionalInteger } from "./schema";

const BATCH_MAX = 120;

const rollsQuantitySchema = z
  .number({ error: "Quantidade de rolos: informe um número válido." })
  .positive("Quantidade de rolos: deve ser maior que zero.")
  .refine((value) => Number.isInteger(value), {
    message: "Quantidade de rolos: informe um número inteiro.",
  });

const totalLengthSchema = z
  .number({ error: "Metragem total: informe um número válido." })
  .positive("Metragem total: deve ser maior que zero.");

const receivedAtSchema = z
  .string()
  .trim()
  .min(1, "Informe a data de recebimento.")
  .refine(isIsoDate, { message: "Data de recebimento inválida." });

const batchSchema = z
  .string()
  .trim()
  .min(1)
  .max(BATCH_MAX, "O lote deve ter no máximo 120 caracteres.")
  .optional();

const notesSchema = z.string().trim().min(1).optional();

export const boxCreateSchema = z.object({
  productId: z.string().trim().min(1, "Selecione o produto."),
  rollsQuantity: rollsQuantitySchema,
  totalLengthM: totalLengthSchema,
  manufacturerBatch: batchSchema,
  receivedAt: receivedAtSchema,
  notes: notesSchema,
});

export const boxUpdateSchema = z.object({
  rollsQuantity: rollsQuantitySchema,
  totalLengthM: totalLengthSchema,
  manufacturerBatch: batchSchema,
  receivedAt: receivedAtSchema,
  notes: notesSchema,
});

export type BoxFormValues = {
  productId: string;
  rollsQuantity: string;
  totalLengthM: string;
  manufacturerBatch: string;
  receivedAt: string;
  notes: string;
};

export type BoxEditFormValues = {
  rollsQuantity: string;
  totalLengthM: string;
  manufacturerBatch: string;
  receivedAt: string;
  notes: string;
};

type ContentForm = {
  rollsQuantity: string;
  totalLengthM: string;
  manufacturerBatch: string;
  receivedAt: string;
  notes: string;
};

export type BoxFormValidation<T> =
  { ok: true; input: T } | { ok: false; fieldErrors: Record<string, string> };

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function assertValidBoxCreate(input: BoxCreateInput): BoxCreateInput {
  const parsed = boxCreateSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error.issues);
  return finalizeCreate(parsed.data);
}

export function assertValidBoxUpdate(input: BoxUpdateInput): BoxUpdateInput {
  const parsed = boxUpdateSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error.issues);
  return finalizeUpdate(parsed.data);
}

export function validateBoxCreateForm(values: BoxFormValues): BoxFormValidation<BoxCreateInput> {
  const fieldErrors: Record<string, string> = {};
  const productId = values.productId.trim();
  if (!productId) fieldErrors.productId = "Selecione o produto.";
  const content = readContent(values, fieldErrors);
  if (!content || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors: ensureFieldError(fieldErrors) };
  }
  const parsed = boxCreateSchema.safeParse({ productId, ...content });
  if (!parsed.success) return { ok: false, fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  return accept(() => finalizeCreate(parsed.data));
}

export function validateBoxEditForm(values: BoxEditFormValues): BoxFormValidation<BoxUpdateInput> {
  const fieldErrors: Record<string, string> = {};
  const content = readContent(values, fieldErrors);
  if (!content || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors: ensureFieldError(fieldErrors) };
  }
  const parsed = boxUpdateSchema.safeParse(content);
  if (!parsed.success) return { ok: false, fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  return accept(() => finalizeUpdate(parsed.data));
}

export function emptyBoxForm(now = new Date()): BoxFormValues {
  return {
    productId: "",
    rollsQuantity: "",
    totalLengthM: "",
    manufacturerBatch: "",
    receivedAt: formatOperationalDate(now),
    notes: "",
  };
}

export function formatBoxFormNumber(value: number): string {
  return String(value).replace(".", ",");
}

export function boxToEditFormValues(box: Box): BoxEditFormValues {
  return {
    rollsQuantity: formatBoxFormNumber(box.rollsQuantity),
    totalLengthM: formatBoxFormNumber(box.totalLengthM),
    manufacturerBatch: box.manufacturerBatch ?? "",
    receivedAt: box.receivedAt,
    notes: box.notes ?? "",
  };
}

function readContent(
  values: ContentForm,
  fieldErrors: Record<string, string>,
): BoxUpdateInput | null {
  const rolls = parseOptionalInteger(values.rollsQuantity, "Quantidade de rolos");
  const length = parseOptionalDecimal(values.totalLengthM, "Metragem total");
  let rollsQuantity: number | undefined;
  let totalLengthM: number | undefined;

  if (!rolls.ok) fieldErrors.rollsQuantity = rolls.message;
  else if (rolls.value == null) fieldErrors.rollsQuantity = "Informe a quantidade de rolos.";
  else rollsQuantity = rolls.value;

  if (!length.ok) fieldErrors.totalLengthM = length.message;
  else if (length.value == null) fieldErrors.totalLengthM = "Informe a metragem total.";
  else totalLengthM = length.value;

  const receivedAt = values.receivedAt.trim();
  if (!receivedAt) fieldErrors.receivedAt = "Informe a data de recebimento.";
  else if (!isIsoDate(receivedAt)) fieldErrors.receivedAt = "Data de recebimento inválida.";

  const batch = normalizeDisplay(values.manufacturerBatch);
  if (batch && batch.length > BATCH_MAX) {
    fieldErrors.manufacturerBatch = "O lote deve ter no máximo 120 caracteres.";
  }

  if (
    rollsQuantity == null ||
    totalLengthM == null ||
    !isIsoDate(receivedAt) ||
    fieldErrors.manufacturerBatch
  ) {
    return null;
  }

  const content: BoxUpdateInput = { rollsQuantity, totalLengthM, receivedAt };
  if (batch) content.manufacturerBatch = batch;
  const notes = normalizeDisplay(values.notes);
  if (notes) content.notes = notes;
  return content;
}

function finalizeCreate(input: BoxCreateInput): BoxCreateInput {
  return { productId: input.productId, ...finalizeUpdate(input) };
}

function finalizeUpdate(input: BoxUpdateInput): BoxUpdateInput {
  const totalLengthM = roundLengthM(input.totalLengthM);
  if (!(totalLengthM > 0)) {
    throw new BoxValidationError([
      { path: "totalLengthM", message: "Metragem total: deve ser maior que zero." },
    ]);
  }
  const content: BoxUpdateInput = {
    rollsQuantity: input.rollsQuantity,
    totalLengthM,
    receivedAt: input.receivedAt,
  };
  const batch = normalizeDisplay(input.manufacturerBatch);
  if (batch) content.manufacturerBatch = batch;
  const notes = normalizeDisplay(input.notes);
  if (notes) content.notes = notes;
  return content;
}

function accept<T>(produce: () => T): BoxFormValidation<T> {
  try {
    return { ok: true, input: produce() };
  } catch (caught) {
    if (caught instanceof BoxValidationError) {
      return {
        ok: false,
        fieldErrors: Object.fromEntries(caught.issues.map((issue) => [issue.path, issue.message])),
      };
    }
    throw caught;
  }
}

function validationError(issues: { path: PropertyKey[]; message: string }[]): BoxValidationError {
  return new BoxValidationError(
    issues.map((issue) => ({
      path: issue.path.map(String).join(".") || "form",
      message: issue.message,
    })),
  );
}

function issuesToFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".") || "form";
    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

function ensureFieldError(fieldErrors: Record<string, string>): Record<string, string> {
  if (Object.keys(fieldErrors).length > 0) return fieldErrors;
  return { form: "Não foi possível validar a caixa." };
}
