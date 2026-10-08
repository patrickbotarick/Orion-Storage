import type { Movement, MovementSource, MovementType } from "./movement";
import { normalizeForComparison } from "./normalize";

export type MovementTypeFilter = MovementType | "ALL";
export type MovementSourceFilter = MovementSource | "ALL";

export type MovementListItem = {
  movement: Movement;
  boxCode: string;
  productLabel: string;
  fromCode?: string;
  toCode?: string;
};

export type MovementQuery = {
  text?: string;
  type?: MovementTypeFilter;
  source?: MovementSourceFilter;
  date?: string;
  boxId?: string;
};

export function filterMovements(
  items: readonly MovementListItem[],
  query: MovementQuery,
): MovementListItem[] {
  const text = normalizeForComparison(query.text);
  const type = query.type ?? "ALL";
  const source = query.source ?? "ALL";
  const date = query.date?.trim() ?? "";
  const boxId = query.boxId?.trim() ?? "";
  return items.filter((item) => {
    if (type !== "ALL" && item.movement.type !== type) return false;
    if (source !== "ALL" && item.movement.source !== source) return false;
    if (boxId && item.movement.boxId !== boxId) return false;
    if (date && saoPauloDate(item.movement.createdAt) !== date) return false;
    if (!text) return true;
    const haystack = [item.boxCode, item.productLabel, item.fromCode, item.toCode]
      .map((value) => normalizeForComparison(value))
      .join(" ");
    return haystack.includes(text);
  });
}

function saoPauloDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
