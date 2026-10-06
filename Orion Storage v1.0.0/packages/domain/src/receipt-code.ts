import { BOX_CODE_TIME_ZONE, boxCodeDateKey } from "./box-code";
import { BoxValidationError, DuplicateReceiptCodeError, ReceiptCodeCapacityError } from "./errors";

export const RECEIPT_CODE_PATTERN = /^REC-(\d{8})-(\d{6})$/;
export const MAX_RECEIPT_SEQUENCE = 999_999;
export const RECEIPT_CODE_WIDTH = 6;

/** Last allocated receipt sequence for each operational day. Numbers are never reused. */
export type ReceiptCodeLedger = Record<string, number>;

export function canonicalReceiptCode(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function formatReceiptCode(dateKey: string, sequence: number): string {
  if (!/^\d{8}$/.test(dateKey)) {
    throw new Error("Data do código do recebimento inválida.");
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > MAX_RECEIPT_SEQUENCE) {
    throw new Error("Sequência do código do recebimento inválida.");
  }
  return `REC-${dateKey}-${String(sequence).padStart(RECEIPT_CODE_WIDTH, "0")}`;
}

export function parseReceiptCode(code: string): { dateKey: string; sequence: number } | null {
  const match = RECEIPT_CODE_PATTERN.exec(canonicalReceiptCode(code));
  if (!match) return null;
  const sequence = Number(match[2]);
  if (!Number.isInteger(sequence) || sequence < 1) return null;
  return { dateKey: match[1], sequence };
}

export function sanitizeReceiptCodeLedger(value: unknown): ReceiptCodeLedger {
  if (!value || typeof value !== "object") return {};
  const ledger: ReceiptCodeLedger = {};
  for (const [key, sequence] of Object.entries(value)) {
    if (!/^\d{8}$/.test(key)) continue;
    if (typeof sequence !== "number" || !Number.isInteger(sequence)) continue;
    if (sequence < 0 || sequence > MAX_RECEIPT_SEQUENCE) continue;
    ledger[key] = sequence;
  }
  return ledger;
}

export function allocateReceiptCode(input: {
  existingCodes: readonly string[];
  ledger: ReceiptCodeLedger;
  now: Date;
  timeZone?: string;
}): { code: string; dateKey: string; sequence: number; ledger: ReceiptCodeLedger } {
  if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
    throw new BoxValidationError([
      { path: "code", message: "Data inválida para gerar o código do recebimento." },
    ]);
  }
  const dateKey = boxCodeDateKey(input.now, input.timeZone ?? BOX_CODE_TIME_ZONE);
  const used = new Set(input.existingCodes.map((code) => canonicalReceiptCode(code)));
  let sequence = Math.max(
    highestSequence(input.existingCodes, dateKey),
    input.ledger[dateKey] ?? 0,
  );
  let code = "";
  do {
    sequence += 1;
    if (sequence > MAX_RECEIPT_SEQUENCE) throw new ReceiptCodeCapacityError(dateKey);
    code = formatReceiptCode(dateKey, sequence);
  } while (used.has(code));
  return { code, dateKey, sequence, ledger: { ...input.ledger, [dateKey]: sequence } };
}

export function assertReceiptCodeAvailable(code: string, existingCodes: readonly string[]): void {
  const canonical = canonicalReceiptCode(code);
  if (existingCodes.some((item) => canonicalReceiptCode(item) === canonical)) {
    throw new DuplicateReceiptCodeError(canonical);
  }
}

function highestSequence(codes: readonly string[], dateKey: string): number {
  let highest = 0;
  for (const code of codes) {
    const parsed = parseReceiptCode(code);
    if (parsed?.dateKey === dateKey) highest = Math.max(highest, parsed.sequence);
  }
  return highest;
}
