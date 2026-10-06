import { useState } from "react";
import {
  BOX_STATUSES,
  BOX_STATUS_LABEL,
  createBoxQrPayload,
  MOVEMENT_SOURCE_LABEL,
  MOVEMENT_TYPE_LABEL,
  type Box,
  type BoxStatus,
  type Location,
  type Movement,
  type Product,
} from "@orion/domain";
import {
  BOX_HISTORY_LABEL,
  formatDatePt,
  formatDateTimePt,
  formatMeters,
  formatMillimeters,
  formatQuantity,
} from "@orion/shared";

import { Button } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import { BoxStatusBadge } from "@/features/boxes/box-status-badge";
import { QrCode } from "@/features/identification/qr-code";

type BoxDetailProps = {
  box: Box;
  product: Product | null;
  locations: Location[];
  locationCode?: string;
  movements: Movement[];
  submitting: boolean;
  onEdit: () => void;
  onStatus: (status: BoxStatus) => Promise<void>;
  onAssign: (locationId: string) => Promise<void>;
  onClear: () => Promise<void>;
  onPreviewLabel: () => void;
  onPrintLabel: () => void;
};

export function BoxDetail({
  box,
  product,
  locations,
  locationCode,
  movements,
  submitting,
  onEdit,
  onStatus,
  onAssign,
  onClear,
  onPreviewLabel,
  onPrintLabel,
}: BoxDetailProps) {
  const [nextStatus, setNextStatus] = useState<BoxStatus>(box.status);
  const [nextLocationId, setNextLocationId] = useState(box.currentLocationId ?? "");
  const events = [...box.history].reverse();
  const choices = locations.filter(
    (location) => location.status === "ACTIVE" || location.id === box.currentLocationId,
  );
  const receiptCode = [...box.history]
    .reverse()
    .map((entry) => entry.metadata?.receiptCode)
    .find((code) => code);
  const origin = receiptCode
    ? `Recebimento ${receiptCode}`
    : box.receiptId
      ? "Recebimento"
      : "Cadastro avulso";
  const payload = createBoxQrPayload(box.code);
  const identity = [
    product?.brand,
    product?.colorName,
    product?.widthMm != null ? `${product.widthMm} mm` : null,
  ]
    .filter((part) => part)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <BoxStatusBadge status={box.status} />
        <p className="font-mono text-xs text-muted">{product?.internalCode ?? "Sem produto"}</p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Item label="Produto" value={product?.name ?? "Produto não encontrado"} />
        <Item label="Marca" value={product?.brand ?? "—"} />
        <Item label="Cor" value={product?.colorName ?? "—"} />
        <Item label="Largura" value={formatMillimeters(product?.widthMm)} />
        <Item label="Espessura" value={formatMillimeters(product?.thicknessMm)} />
        <Item label="Rolos" value={formatQuantity(box.rollsQuantity)} />
        <Item label="Metragem" value={formatMeters(box.totalLengthM)} />
        <Item label="Lote" value={box.manufacturerBatch ?? "—"} />
        <Item label="Recebimento" value={formatDatePt(box.receivedAt)} />
        <Item label="Origem" value={origin} />
        <Item label="Localização atual" value={locationCode ?? "Sem localização"} />
      </dl>

      <div>
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">Observações</h3>
        <p className="mt-1 text-sm text-ink">{box.notes ?? "Sem observações."}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:min-w-56">
          <Field label="Status da caixa" htmlFor="box-next-status">
            <select
              id="box-next-status"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as BoxStatus)}
              className={controlClass}
              disabled={submitting}
            >
              {BOX_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {BOX_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button
          variant="primary"
          disabled={submitting || nextStatus === box.status}
          onClick={() => void onStatus(nextStatus)}
        >
          {submitting ? "Salvando…" : "Alterar status"}
        </Button>
        <Button variant="secondary" disabled={submitting} onClick={onEdit}>
          Editar conteúdo
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:min-w-72 sm:flex-1">
          <Field label="Definir localização" htmlFor="box-next-location">
            <select
              id="box-next-location"
              value={nextLocationId}
              onChange={(event) => setNextLocationId(event.target.value)}
              className={controlClass}
              disabled={submitting}
            >
              <option value="">Sem localização</option>
              {choices.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code}
                  {location.status !== "ACTIVE" ? ` (${location.status})` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button
          variant="primary"
          disabled={
            submitting || nextLocationId === (box.currentLocationId ?? "") || nextLocationId === ""
          }
          onClick={() => void onAssign(nextLocationId)}
        >
          {box.currentLocationId ? "Alterar localização" : "Definir localização"}
        </Button>
        <Button
          variant="secondary"
          disabled={submitting || !box.currentLocationId}
          onClick={() => void onClear()}
        >
          Remover localização
        </Button>
      </div>

      <section>
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">Identificação</h3>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
          <QrCode value={payload} title={`QR da caixa ${box.code}`} />
          <div className="min-w-0">
            <p className="font-mono text-sm text-ink">{box.code}</p>
            <p className="mt-1 text-sm text-ink">{identity || product?.name || "Sem produto"}</p>
            <p className="mt-1 font-mono text-xs break-all text-muted">{payload}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" disabled={submitting} onClick={onPreviewLabel}>
                Visualizar etiqueta
              </Button>
              <Button variant="primary" disabled={submitting} onClick={onPrintLabel}>
                Imprimir etiqueta
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">Movimentações</h3>
        {movements.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nenhuma movimentação registrada. Uma localização anterior a esta fase não gera histórico
            retroativo.
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {movements.map((movement) => (
              <li key={movement.id} className="border-l-2 border-line pl-3">
                <p className="text-xs text-muted">
                  {formatDateTimePt(movement.createdAt)} · {MOVEMENT_TYPE_LABEL[movement.type]} ·{" "}
                  {MOVEMENT_SOURCE_LABEL[movement.source]}
                </p>
                <p className="text-sm text-ink">
                  {movement.metadata?.fromLocationCode ?? "Sem localização"} →{" "}
                  {movement.metadata?.toLocationCode ?? "Sem localização"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">Histórico</h3>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Sem eventos.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {events.map((entry) => (
              <li key={entry.id} className="border-l-2 border-line pl-3">
                <p className="text-xs text-muted">
                  {formatDateTimePt(entry.createdAt)} · {BOX_HISTORY_LABEL[entry.type]}
                </p>
                <p className="text-sm text-ink">{entry.description}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
