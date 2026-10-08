import { z } from "zod";

import { ProductValidationError, type FieldIssue } from "./errors";
import { suggestInternalCode } from "./internal-code";
import { normalizeDisplay, normalizeInternalCode } from "./normalize";
import {
  PRODUCT_STATUSES,
  type Product,
  type ProductFormValues,
  type ProductInput,
  type ProductStatus,
} from "./product";

const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalText = z.string().trim().min(1).optional();

const optionalPositive = (label: string) =>
  z
    .number({ error: `${label}: informe um número válido.` })
    .positive(`${label}: deve ser maior que zero.`)
    .optional();

const optionalPositiveInt = (label: string) =>
  optionalPositive(label).refine((value) => value == null || Number.isInteger(value), {
    message: `${label}: informe um número inteiro.`,
  });

export const productInputSchema = z.object({
  internalCode: requiredText("Informe o código interno.").max(
    80,
    "O código interno deve ter no máximo 80 caracteres.",
  ),
  name: requiredText("Informe o nome do produto."),
  category: requiredText("Informe a categoria."),
  brand: optionalText,
  line: optionalText,
  manufacturer: optionalText,
  supplier: optionalText,
  status: z.enum(PRODUCT_STATUSES, { error: "Status inválido." }),
  notes: optionalText,
  manufacturerCode: optionalText,
  originalBarcode: optionalText,
  colorName: optionalText,
  colorCode: optionalText,
  widthMm: optionalPositive("Largura"),
  thicknessMm: optionalPositive("Espessura"),
  rollLengthM: optionalPositive("Comprimento do rolo"),
  rollsPerBox: optionalPositiveInt("Rolos por caixa"),
  totalLengthPerBoxM: optionalPositive("Metragem total informada"),
});

const SAFE_CODE = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export type ParsedMeasure = { ok: true; value?: number } | { ok: false; message: string };

export function parseOptionalDecimal(raw: string, label: string): ParsedMeasure {
  return parseMeasure(raw, label, false);
}

export function parseOptionalInteger(raw: string, label: string): ParsedMeasure {
  return parseMeasure(raw, label, true);
}

function parseMeasure(raw: string, label: string, integer: boolean): ParsedMeasure {
  const trimmed = raw.replace(/[\u00a0\s]+/g, "").trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (/[a-zA-Z]/.test(trimmed)) {
    return { ok: false, message: `${label}: informe apenas o número, sem unidade.` };
  }
  const normalized = trimmed.replace(",", ".");
  const pattern = integer ? /^-?\d+$/ : /^-?\d+(?:\.\d+)?$/;
  if (!pattern.test(normalized)) {
    return {
      ok: false,
      message: integer
        ? `${label}: informe um número inteiro.`
        : `${label}: informe um número válido.`,
    };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label}: informe um número válido.` };
  }
  if (value < 0) {
    return { ok: false, message: `${label}: não pode ser negativa.` };
  }
  if (value === 0) {
    return { ok: false, message: `${label}: deve ser maior que zero.` };
  }
  return { ok: true, value };
}

export type FormValidation =
  { ok: true; input: ProductInput } | { ok: false; fieldErrors: Record<string, string> };

export function validateProductForm(values: ProductFormValues): FormValidation {
  const fieldErrors: Record<string, string> = {};
  const width = parseOptionalDecimal(values.widthMm, "Largura");
  const thickness = parseOptionalDecimal(values.thicknessMm, "Espessura");
  const rollLength = parseOptionalDecimal(values.rollLengthM, "Comprimento do rolo");
  const rolls = parseOptionalInteger(values.rollsPerBox, "Rolos por caixa");
  const total = parseOptionalDecimal(values.totalLengthPerBoxM, "Metragem total informada");

  if (!width.ok) fieldErrors.widthMm = width.message;
  if (!thickness.ok) fieldErrors.thicknessMm = thickness.message;
  if (!rollLength.ok) fieldErrors.rollLengthM = rollLength.message;
  if (!rolls.ok) fieldErrors.rollsPerBox = rolls.message;
  if (!total.ok) fieldErrors.totalLengthPerBoxM = total.message;

  const textSource = {
    name: normalizeDisplay(values.name),
    brand: normalizeDisplay(values.brand),
    colorName: normalizeDisplay(values.colorName),
    colorCode: normalizeDisplay(values.colorCode),
    widthMm: width.ok ? width.value : undefined,
    thicknessMm: thickness.ok ? thickness.value : undefined,
    rollLengthM: rollLength.ok ? rollLength.value : undefined,
  };

  let internalCode = normalizeInternalCode(values.internalCode);
  if (!internalCode) internalCode = suggestInternalCode(textSource);
  if (internalCode && !SAFE_CODE.test(internalCode)) {
    fieldErrors.internalCode = "Use apenas letras, números e hífens, sem espaços ou acentos.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const candidate: ProductInput = {
    internalCode,
    name: normalizeDisplay(values.name) ?? "",
    category: normalizeDisplay(values.category) ?? "",
    status: values.status,
  };
  assignText(candidate, "brand", values.brand);
  assignText(candidate, "line", values.line);
  assignText(candidate, "manufacturer", values.manufacturer);
  assignText(candidate, "supplier", values.supplier);
  assignText(candidate, "notes", values.notes);
  assignText(candidate, "manufacturerCode", values.manufacturerCode);
  assignText(candidate, "originalBarcode", values.originalBarcode);
  assignText(candidate, "colorName", values.colorName);
  assignText(candidate, "colorCode", values.colorCode);
  if (width.ok && width.value != null) candidate.widthMm = width.value;
  if (thickness.ok && thickness.value != null) candidate.thicknessMm = thickness.value;
  if (rollLength.ok && rollLength.value != null) candidate.rollLengthM = rollLength.value;
  if (rolls.ok && rolls.value != null) candidate.rollsPerBox = rolls.value;
  if (total.ok && total.value != null) candidate.totalLengthPerBoxM = total.value;

  const parsed = productInputSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  if (!SAFE_CODE.test(parsed.data.internalCode)) {
    return {
      ok: false,
      fieldErrors: {
        internalCode: "Use apenas letras, números e hífens, sem espaços ou acentos.",
      },
    };
  }
  return { ok: true, input: parsed.data };
}

export function assertValidProductInput(input: ProductInput): ProductInput {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ProductValidationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.join(".") || "form",
        message: issue.message,
      })),
    );
  }
  const code = normalizeInternalCode(parsed.data.internalCode);
  if (!SAFE_CODE.test(code)) {
    throw new ProductValidationError([
      {
        path: "internalCode",
        message: "Use apenas letras, números e hífens, sem espaços ou acentos.",
      },
    ]);
  }
  return { ...parsed.data, internalCode: code };
}

export function suggestInternalCodeFromForm(values: ProductFormValues): string {
  const width = parseOptionalDecimal(values.widthMm, "Largura");
  const thickness = parseOptionalDecimal(values.thicknessMm, "Espessura");
  const rollLength = parseOptionalDecimal(values.rollLengthM, "Comprimento do rolo");
  return suggestInternalCode({
    name: values.name,
    brand: values.brand,
    colorName: values.colorName,
    colorCode: values.colorCode,
    widthMm: width.ok ? width.value : undefined,
    thicknessMm: thickness.ok ? thickness.value : undefined,
    rollLengthM: rollLength.ok ? rollLength.value : undefined,
  });
}

export function productToFormValues(product: Product): ProductFormValues {
  return {
    internalCode: product.internalCode,
    name: product.name,
    category: product.category,
    brand: product.brand ?? "",
    line: product.line ?? "",
    manufacturer: product.manufacturer ?? "",
    supplier: product.supplier ?? "",
    status: product.status,
    notes: product.notes ?? "",
    manufacturerCode: product.manufacturerCode ?? "",
    originalBarcode: product.originalBarcode ?? "",
    colorName: product.colorName ?? "",
    colorCode: product.colorCode ?? "",
    widthMm: formatFormNumber(product.widthMm),
    thicknessMm: formatFormNumber(product.thicknessMm),
    rollLengthM: formatFormNumber(product.rollLengthM),
    rollsPerBox: formatFormNumber(product.rollsPerBox),
    totalLengthPerBoxM: formatFormNumber(product.totalLengthPerBoxM),
  };
}

export function isProductStatus(value: string): value is ProductStatus {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

function formatFormNumber(value: number | undefined): string {
  if (value == null) return "";
  return String(value).replace(".", ",");
}

function assignText(
  target: ProductInput,
  key:
    | "brand"
    | "line"
    | "manufacturer"
    | "supplier"
    | "notes"
    | "manufacturerCode"
    | "originalBarcode"
    | "colorName"
    | "colorCode",
  raw: string,
) {
  const value = normalizeDisplay(raw);
  if (value) target[key] = value;
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

export function fieldIssues(fieldErrors: Record<string, string>): FieldIssue[] {
  return Object.entries(fieldErrors).map(([path, message]) => ({ path, message }));
}
