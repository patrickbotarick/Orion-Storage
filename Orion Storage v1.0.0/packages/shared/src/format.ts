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

export function formatDatePt(value: string | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatDateTimePt(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormat.format(date);
}
