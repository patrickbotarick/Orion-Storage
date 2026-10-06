import { calculatedTotalLengthM } from "./length";

export type BoxContentSuggestion = {
  rollsQuantity?: number;
  totalLengthM?: number;
};

export type BoxContentSource = {
  rollsPerBox?: number;
  rollLengthM?: number;
};

/**
 * Suggests the physical content from the product standard.
 * Uses rollsPerBox and rollLengthM. Does not copy totalLengthPerBoxM and does not overwrite
 * values the operator already informed.
 */
export function suggestBoxContent(product: BoxContentSource): BoxContentSuggestion {
  const suggestion: BoxContentSuggestion = {};
  if (isPositiveInteger(product.rollsPerBox)) {
    suggestion.rollsQuantity = product.rollsPerBox;
  }
  if (suggestion.rollsQuantity != null && isPositiveFinite(product.rollLengthM)) {
    suggestion.totalLengthM = calculatedTotalLengthM(product.rollLengthM, suggestion.rollsQuantity);
  }
  return suggestion;
}

export function mergeBoxContentSuggestion(
  current: BoxContentSuggestion,
  suggestion: BoxContentSuggestion,
  informed: { rollsQuantity: boolean; totalLengthM: boolean },
): BoxContentSuggestion {
  return {
    rollsQuantity: informed.rollsQuantity ? current.rollsQuantity : suggestion.rollsQuantity,
    totalLengthM: informed.totalLengthM ? current.totalLengthM : suggestion.totalLengthM,
  };
}

function isPositiveInteger(value: number | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
