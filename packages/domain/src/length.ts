const LENGTH_DECIMALS = 1000;
const DIVERGENCE_EPSILON_M = 0.001;

export function roundLengthM(value: number): number {
  return Math.round(value * LENGTH_DECIMALS) / LENGTH_DECIMALS;
}

/** Calculated box length in meters. Does not read or write the manufacturer total. */
export function calculatedTotalLengthM(rollLengthM: number, rollsPerBox: number): number {
  return roundLengthM(rollLengthM * rollsPerBox);
}

export type LengthDivergence = {
  hasDivergence: boolean;
  calculatedTotalLengthM: number | null;
  informedTotalLengthM: number | null;
  differenceM: number | null;
};

export type LengthDivergenceInput = {
  rollLengthM?: number | null;
  rollsPerBox?: number | null;
  informedTotalLengthM?: number | null;
};

/**
 * Compares the calculated total with the manufacturer-informed total.
 * Never overwrites either value. Missing data is not treated as a divergence.
 */
export function detectLengthDivergence(input: LengthDivergenceInput): LengthDivergence {
  const rollLengthM = input.rollLengthM;
  const rollsPerBox = input.rollsPerBox;
  const informedRaw = input.informedTotalLengthM;
  const canCalculate = isFiniteNumber(rollLengthM) && isFiniteNumber(rollsPerBox);
  const calculated = canCalculate ? calculatedTotalLengthM(rollLengthM, rollsPerBox) : null;
  const informed = isFiniteNumber(informedRaw) ? informedRaw : null;

  if (calculated == null || informed == null) {
    return {
      hasDivergence: false,
      calculatedTotalLengthM: calculated,
      informedTotalLengthM: informed,
      differenceM: null,
    };
  }

  const differenceM = roundLengthM(informed - calculated);
  const hasDivergence = Math.abs(differenceM) > DIVERGENCE_EPSILON_M;
  return {
    hasDivergence,
    calculatedTotalLengthM: calculated,
    informedTotalLengthM: informed,
    differenceM: hasDivergence ? differenceM : 0,
  };
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
