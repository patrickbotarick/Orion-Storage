/** Collapses whitespace and returns undefined for blank values. Preserves display casing. */
export function normalizeDisplay(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const collapsed = value.replace(/[\u00a0\s]+/g, " ").trim();
  return collapsed.length === 0 ? undefined : collapsed;
}

/**
 * Comparison key: trim, collapse spaces, drop accents, lowercase.
 * Spaces around separators like "/" are removed so "Real / Rehau" matches "real/rehau".
 */
export function normalizeForComparison(value: string | null | undefined): string {
  const display = normalizeDisplay(value);
  if (!display) return "";
  return display
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s*([/&+._])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/** Safe code token: uppercase ASCII, hyphens, no accents or spaces. */
export function toCodeToken(value: string | null | undefined): string {
  const display = normalizeDisplay(value);
  if (!display) return "";
  return display
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeInternalCode(value: string | null | undefined): string {
  return toCodeToken(value);
}
