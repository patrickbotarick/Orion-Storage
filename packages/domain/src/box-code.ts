import { BoxCodeCapacityError, BoxValidationError, DuplicateBoxCodeError } from "./errors";

export const BOX_CODE_TIME_ZONE = "America/Sao_Paulo";
export const MAX_BOX_SEQUENCE = 999_999;
export const BOX_CODE_WIDTH = 6;
export const BOX_CODE_PATTERN = /^CX-(\d{8})-(\d{6})$/;

/** Last allocated sequence for each operational day (YYYYMMDD). Numbers are never reused. */
export type BoxCodeLedger = Record<string, number>;

export function canonicalBoxCode(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function boxCodeDateKey(now: Date, timeZone = BOX_CODE_TIME_ZONE): string {
  assertValidInstant(now);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = datePart(parts, "year");
  const month = datePart(parts, "month");
  const day = datePart(parts, "day");
  return `${year}${month}${day}`;
}

/** Calendar date YYYY-MM-DD in the operational timezone. */
export function formatOperationalDate(now: Date, timeZone = BOX_CODE_TIME_ZONE): string {
  const key = boxCodeDateKey(now, timeZone);
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

export function formatBoxCode(dateKey: string, sequence: number): string {
  if (!/^\d{8}$/.test(dateKey)) {
    throw new Error("Data do código da caixa inválida.");
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > MAX_BOX_SEQUENCE) {
    throw new Error("Sequência do código da caixa inválida.");
  }
  return `CX-${dateKey}-${String(sequence).padStart(BOX_CODE_WIDTH, "0")}`;
}

export function parseBoxCode(code: string): { dateKey: string; sequence: number } | null {
  const match = BOX_CODE_PATTERN.exec(canonicalBoxCode(code));
  if (!match) return null;
  const sequence = Number(match[2]);
  if (!Number.isInteger(sequence) || sequence < 1) return null;
  return { dateKey: match[1], sequence };
}

export function sanitizeBoxCodeLedger(value: unknown): BoxCodeLedger {
  if (!value || typeof value !== "object") return {};
  const ledger: BoxCodeLedger = {};
  for (const [key, sequence] of Object.entries(value)) {
    if (!/^\d{8}$/.test(key)) continue;
    if (typeof sequence !== "number" || !Number.isInteger(sequence)) continue;
    if (sequence < 0 || sequence > MAX_BOX_SEQUENCE) continue;
    ledger[key] = sequence;
  }
  return ledger;
}

export function allocateBoxCode(input: {
  existingCodes: readonly string[];
  ledger: BoxCodeLedger;
  now: Date;
  timeZone?: string;
}): { code: string; dateKey: string; sequence: number; ledger: BoxCodeLedger } {
  assertValidInstant(input.now);
  const dateKey = boxCodeDateKey(input.now, input.timeZone ?? BOX_CODE_TIME_ZONE);
  const used = new Set(input.existingCodes.map((code) => canonicalBoxCode(code)));
  let sequence = Math.max(
    highestSequence(input.existingCodes, dateKey),
    ledgerValue(input.ledger, dateKey),
  );
  let code = "";
  do {
    sequence += 1;
    if (sequence > MAX_BOX_SEQUENCE) throw new BoxCodeCapacityError(dateKey);
    code = formatBoxCode(dateKey, sequence);
  } while (used.has(code));
  return {
    code,
    dateKey,
    sequence,
    ledger: { ...input.ledger, [dateKey]: sequence },
  };
}

/** Allocates several codes in order. Does not persist. The caller decides when to keep the ledger. */
export function allocateBoxCodes(input: {
  existingCodes: readonly string[];
  ledger: BoxCodeLedger;
  now: Date;
  count: number;
  timeZone?: string;
}): { codes: string[]; ledger: BoxCodeLedger } {
  if (!Number.isInteger(input.count) || input.count < 1) {
    throw new BoxValidationError([
      { path: "boxesQuantity", message: "A quantidade de caixas deve ser maior que zero." },
    ]);
  }
  const codes: string[] = [];
  let ledger = input.ledger;
  const existing = [...input.existingCodes];
  for (let index = 0; index < input.count; index += 1) {
    const next = allocateBoxCode({
      existingCodes: existing,
      ledger,
      now: input.now,
      timeZone: input.timeZone,
    });
    codes.push(next.code);
    existing.push(next.code);
    ledger = next.ledger;
  }
  return { codes, ledger };
}

export function assertBoxCodeAvailable(code: string, existingCodes: readonly string[]): void {
  const canonical = canonicalBoxCode(code);
  const taken = existingCodes.some((item) => canonicalBoxCode(item) === canonical);
  if (taken) throw new DuplicateBoxCodeError(canonical);
}

function highestSequence(codes: readonly string[], dateKey: string): number {
  let highest = 0;
  for (const code of codes) {
    const parsed = parseBoxCode(code);
    if (parsed?.dateKey === dateKey) highest = Math.max(highest, parsed.sequence);
  }
  return highest;
}

function ledgerValue(ledger: BoxCodeLedger, dateKey: string): number {
  const value = ledger[dateKey];
  if (!Number.isInteger(value) || value < 0) return 0;
  return value;
}

function assertValidInstant(now: Date): void {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new BoxValidationError([
      { path: "code", message: "Data inválida para gerar o código da caixa." },
    ]);
  }
}

function datePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const value = parts.find((item) => item.type === type)?.value;
  if (!value || !/^\d+$/.test(value)) {
    throw new Error("Não foi possível montar a data do código da caixa.");
  }
  return value.padStart(type === "year" ? 4 : 2, "0");
}
