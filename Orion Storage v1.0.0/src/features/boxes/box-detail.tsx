import { useState } from "react";
import {
  BOX_STATUSES,
  BOX_STATUS_LABEL,
  type Box,
  type BoxStatus,
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

type BoxDetailProps = {
  box: Box;
  product: Product | null;
  submitting: boolean;
  onEdit: () => void;
  onStatus: (status: BoxStatus) => Promise<void>;
};

export function BoxDetail({ box, product, submitting, onEdit, onStatus }: BoxDetailProps) {
  const [nextStatus, setNextStatus] = useState<BoxStatus>(box.status);
  const events = [...box.history].reverse();

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
