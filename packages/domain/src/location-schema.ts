import { z } from "zod";

import { LocationValidationError, StorageAreaValidationError, type FieldIssue } from "./errors";
import { normalizeDisplay } from "./normalize";
import { parseOptionalInteger } from "./schema";
import { canonicalAreaCode } from "./storage-area";

const NAME_MAX = 80;
const NOTES_MAX = 500;
const PART_MAX = 24;

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);
}

export const storageAreaCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Informe o código da área.")
    .refine((value) => canonicalAreaCode(value).length > 0, {
      message: "O código da área precisa ter letras ou números.",
    })
    .refine((value) => canonicalAreaCode(value).length <= 16, {
      message: "O código da área deve ter no máximo 16 caracteres.",
    }),
  name: requiredText("o nome da área", NAME_MAX),
  notes: z.string().trim().max(NOTES_MAX, "A observação deve ter no máximo 500 caracteres.").optional(),
});

export const storageAreaUpdateSchema = z.object({
  name: requiredText("o nome da área", NAME_MAX),
  notes: z.string().trim().max(NOTES_MAX, "A observação deve ter no máximo 500 caracteres.").optional(),
});

const partField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .max(PART_MAX, `${label} deve ter no máximo ${PART_MAX} caracteres.`);

export const locationFormSchema = z.object({
  areaId: z.string().trim().min(1, "Selecione a área."),
  aisle: partField("o corredor"),
  rack: partField("a prateleira"),
  level: partField("o nível"),
  position: partField("a posição"),
  capacityBoxes: z
    .number({ error: "Capacidade: informe um número válido." })
    .int("Capacidade: informe um número inteiro.")
    .positive("Capacidade: deve ser maior que zero.")
    .optional(),
  notes: z.string().trim().max(NOTES_MAX, "A observação deve ter no máximo 500 caracteres.").optional(),
});

export type StorageAreaFormValues = {
  code: string;
  name: string;
  notes: string;
};

export type LocationFormValues = {
  areaId: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  capacityBoxes: string;
  notes: string;
};

export type StorageAreaFormValidation = {
  value?: { code: string; name: string; notes?: string };
  issues: FieldIssue[];
};

export type LocationFormValidation = {
  value?: {
    areaId: string;
    aisle: string;
    rack: string;
    level: string;
    position: string;
    capacityBoxes?: number;
    notes?: string;
  };
  issues: FieldIssue[];
};

export function emptyAreaForm(): StorageAreaFormValues {
  return { code: "", name: "", notes: "" };
}

export function emptyLocationForm(areaId = ""): LocationFormValues {
  return { areaId, aisle: "", rack: "", level: "", position: "", capacityBoxes: "", notes: "" };
}

export function validateAreaCreateForm(values: StorageAreaFormValues): StorageAreaFormValidation {
  const parsed = storageAreaCreateSchema.safeParse({
    code: values.code,
    name: normalizeDisplay(values.name) ?? "",
    notes: normalizeDisplay(values.notes),
  });
  if (!parsed.success) return { issues: zodIssues(parsed.error.issues) };
  return {
    value: {
      code: canonicalAreaCode(parsed.data.code),
      name: parsed.data.name,
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    },
    issues: [],
  };
}

export function validateAreaUpdateForm(values: StorageAreaFormValues): StorageAreaFormValidation {
  const parsed = storageAreaUpdateSchema.safeParse({
    name: normalizeDisplay(values.name) ?? "",
    notes: normalizeDisplay(values.notes),
  });
  if (!parsed.success) return { issues: zodIssues(parsed.error.issues) };
  return {
    value: {
      code: canonicalAreaCode(values.code),
      name: parsed.data.name,
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    },
    issues: [],
  };
}

export function validateLocationForm(values: LocationFormValues): LocationFormValidation {
  const capacity = parseOptionalInteger(values.capacityBoxes, "Capacidade");
  if (!capacity.ok) return { issues: [{ path: "capacityBoxes", message: capacity.message }] };
  const parsed = locationFormSchema.safeParse({
    areaId: values.areaId,
    aisle: values.aisle,
    rack: values.rack,
    level: values.level,
    position: values.position,
    capacityBoxes: capacity.value,
    notes: normalizeDisplay(values.notes),
  });
  if (!parsed.success) return { issues: zodIssues(parsed.error.issues) };
  return {
    value: {
      areaId: parsed.data.areaId,
      aisle: parsed.data.aisle,
      rack: parsed.data.rack,
      level: parsed.data.level,
      position: parsed.data.position,
      ...(parsed.data.capacityBoxes != null ? { capacityBoxes: parsed.data.capacityBoxes } : {}),
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    },
    issues: [],
  };
}

export function assertValidAreaCreate(input: { code: string; name: string; notes?: string }) {
  const result = validateAreaCreateForm({
    code: input.code,
    name: input.name,
    notes: input.notes ?? "",
  });
  if (!result.value) throw new StorageAreaValidationError(result.issues);
  return result.value;
}

export function assertValidAreaUpdate(input: { name: string; notes?: string }) {
  const result = validateAreaUpdateForm({
    code: "",
    name: input.name,
    notes: input.notes ?? "",
  });
  if (!result.value) throw new StorageAreaValidationError(result.issues);
  return result.value;
}

export function assertValidLocationForm(input: {
  areaId: string;
  aisle: string;
  rack: string;
  level: string;
  position: string;
  capacityBoxes?: number;
  notes?: string;
}) {
  const result = validateLocationForm({
    areaId: input.areaId,
    aisle: input.aisle,
    rack: input.rack,
    level: input.level,
    position: input.position,
    capacityBoxes: input.capacityBoxes == null ? "" : String(input.capacityBoxes),
    notes: input.notes ?? "",
  });
  if (!result.value) throw new LocationValidationError(result.issues);
  return result.value;
}

function zodIssues(issues: readonly { path: PropertyKey[]; message: string }[]): FieldIssue[] {
  return issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "form",
    message: issue.message,
  }));
}
