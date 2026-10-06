const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export function formatNumberPt(value: number): string {
  return numberFormat.format(value);
}

export function formatMillimeters(value: number | undefined): string {
  if (value == null) return "—";
  return `${formatNumberPt(value)} mm`;
}

export function formatMeters(value: number | undefined): string {
  if (value == null) return "—";
  return `${formatNumberPt(value)} m`;
}

export function formatQuantity(value: number | undefined): string {
  if (value == null) return "—";
  return formatNumberPt(value);
}
