import { StatCard, LocationCode } from "@/components/ui/surfaces";
import {
  areaInactiveBadge,
  formatOccupancyPercent,
  STORAGE_AREA_STATUS_LABEL,
  type AreaOccupancy,
  type StorageArea,
} from "@orion/domain";

type AreaSummaryProps = {
  area: StorageArea;
  summary: AreaOccupancy;
};

export function AreaSummary({ area, summary }: AreaSummaryProps) {
  const percent = formatOccupancyPercent(summary.occupancyRatio);
  const badge = areaInactiveBadge(area.status);
  return (
    <section
      className="mt-6 rounded-lg border border-line bg-surface p-4"
      aria-label="Resumo da área"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-ink">{area.name}</h2>
        <LocationCode className="text-muted">{area.code}</LocationCode>
        {badge ? (
          <span className="rounded-md border border-dashed border-ink px-2 py-0.5 text-xs font-medium">
            {badge}
          </span>
        ) : (
          <span className="text-xs text-muted">{STORAGE_AREA_STATUS_LABEL[area.status]}</span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Posições" value={String(summary.locations)} />
        <StatCard label="Ocupadas" value={String(summary.occupied)} />
        <StatCard label="Livres" value={String(summary.free)} />
        <StatCard label="Bloqueadas" value={String(summary.blocked)} />
        <StatCard label="Inativas" value={String(summary.inactive)} />
        <StatCard label="Caixas armazenadas" value={String(summary.storedBoxes)} />
        <StatCard
          label="Capacidade conhecida"
          value={summary.knownCapacity == null ? "não definida" : `${summary.knownCapacity} caixas`}
        />
        <StatCard label="Ocupação" value={percent ?? "—"} />
      </div>
      <p className="mt-3 text-xs text-muted">
        O percentual usa só posições com capacidade: caixas nessas posições divididas pela soma das
        capacidades. Posição sem capacidade não entra na conta. O resumo é da área inteira; a matriz
        abaixo segue os filtros.
      </p>
    </section>
  );
}
