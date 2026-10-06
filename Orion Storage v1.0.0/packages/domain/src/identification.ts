import { IdentificationNotFoundError, IdentificationPayloadError } from "./errors";
import { canonicalBoxCode, parseBoxCode } from "./box-code";
import { toCodeToken } from "./normalize";

/** Printed labels use this version. A future reader can reject anything else. */
export const QR_PROTOCOL = "orion";
export const QR_VERSION = "v1";
export const QR_TYPES = ["box", "location"] as const;

export type QrType = (typeof QR_TYPES)[number];

export type QrIdentity = {
  version: typeof QR_VERSION;
  type: QrType;
  code: string;
};

export type IdentificationCatalog = {
  boxes: readonly { id: string; code: string }[];
  locations: readonly { id: string; code: string }[];
};

export type IdentificationHit = {
  type: QrType;
  entityId: string;
  code: string;
};

const SCHEME = /^orion:\/\//i;
const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * Stable identifier for a physical box.
 * The payload is not a server URL and does not contain the box contents.
 */
export function createBoxQrPayload(code: string): string {
  const canonical = canonicalBoxCode(code);
  if (!parseBoxCode(canonical)) {
    throw new IdentificationPayloadError("Código de caixa inválido.");
  }
  return payload("box", canonical);
}

/** Stable identifier for a physical address. Not a map coordinate and not a URL. */
export function createLocationQrPayload(code: string): string {
  const canonical = canonicalLocationCode(code);
  if (!canonical) throw new IdentificationPayloadError("O identificador não tem código.");
  if (!isLocationCode(canonical)) {
    throw new IdentificationPayloadError("Código de localização inválido.");
  }
  return payload("location", canonical);
}

export function parseQrPayload(payload: string): QrIdentity {
  const value = payload.trim();
  if (!value) throw new IdentificationPayloadError("O identificador está vazio.");
  if (/^https?:\/\//i.test(value)) {
    throw new IdentificationPayloadError("O QR não pode depender de um endereço de servidor.");
  }
  if (!SCHEME.test(value)) {
    throw new IdentificationPayloadError("O QR não é um identificador do Orion Storage.");
  }
  const rest = value.replace(SCHEME, "");
  if (/[?#\s]/.test(rest)) {
    throw new IdentificationPayloadError("O identificador tem um formato inválido.");
  }
  const parts = rest.split("/");
  if (parts.length !== 3) {
    throw new IdentificationPayloadError("O identificador tem um formato inválido.");
  }
  const [versionRaw, typeRaw, codeRaw] = parts;
  if (!versionRaw || !typeRaw || codeRaw == null) {
    throw new IdentificationPayloadError("O identificador tem um formato inválido.");
  }
  if (versionRaw.toLowerCase() !== QR_VERSION) {
    throw new IdentificationPayloadError(`Versão de identificador não suportada: ${versionRaw}.`);
  }
  const type = typeRaw.toLowerCase();
  if (type !== "box" && type !== "location") {
    throw new IdentificationPayloadError("Tipo de identificador desconhecido.");
  }
  const code = decodeCode(codeRaw);
  if (!code) throw new IdentificationPayloadError("O identificador não tem código.");
  if (type === "box" && !parseBoxCode(code)) {
    throw new IdentificationPayloadError("Código de caixa inválido.");
  }
  if (type === "location" && !isLocationCode(code)) {
    throw new IdentificationPayloadError("Código de localização inválido.");
  }
  return { version: QR_VERSION, type, code };
}

export function validateQrPayload(
  payload: string,
): { ok: true; identity: QrIdentity } | { ok: false; message: string } {
  try {
    return { ok: true, identity: parseQrPayload(payload) };
  } catch (caught) {
    if (caught instanceof IdentificationPayloadError) return { ok: false, message: caught.message };
    throw caught;
  }
}

/** Finds the current record for a payload. Prepared for a future scanner, without camera UI. */
export function resolveIdentification(
  payload: string,
  catalog: IdentificationCatalog,
): IdentificationHit {
  const identity = parseQrPayload(payload);
  if (identity.type === "box") {
    const box = catalog.boxes.find((item) => canonicalBoxCode(item.code) === identity.code);
    if (!box) throw new IdentificationNotFoundError("box", identity.code);
    return { type: "box", entityId: box.id, code: canonicalBoxCode(box.code) };
  }
  const location = catalog.locations.find(
    (item) => canonicalLocationCode(item.code) === identity.code,
  );
  if (!location) throw new IdentificationNotFoundError("location", identity.code);
  return { type: "location", entityId: location.id, code: canonicalLocationCode(location.code) };
}

function payload(type: QrType, code: string): string {
  return `${QR_PROTOCOL}://${QR_VERSION}/${type}/${encodeURIComponent(code)}`;
}

function canonicalLocationCode(code: string): string {
  return toCodeToken(code);
}

function isLocationCode(code: string): boolean {
  return CODE_PATTERN.test(code) && code.length <= 80;
}

function decodeCode(value: string): string {
  try {
    return decodeURIComponent(value).trim().toUpperCase();
  } catch {
    throw new IdentificationPayloadError("O código do identificador é inválido.");
  }
}
