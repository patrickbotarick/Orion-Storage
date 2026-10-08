import type { BoxListItem } from "@orion/domain";
import { formatDatePt, formatMeters, formatMillimeters, formatQuantity } from "@orion/shared";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Card, DataTable, BoxCode, LocationCode } from "@/components/ui/surfaces";
import { BoxStatusBadge } from "@/features/boxes/box-status-badge";

type BoxTableProps = {
  items: BoxListItem[];
  onOpen: (item: BoxListItem) => void;
  onEdit: (item: BoxListItem) => void;
  onLabel: (item: BoxListItem) => void;
};

export function BoxTable({ items, onOpen, onEdit, onLabel }: BoxTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma caixa encontrada"
        description="Ajuste a busca ou os filtros, ou registre uma caixa nova."
      />
    );
  }

  return (
    <>
      <DataTable label="Caixas cadastradas" className="hidden lg:block">
        <thead className="bg-bg text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-3 py-3 font-medium">Código</th>
            <th className="px-3 py-3 font-medium">Produto</th>
            <th className="px-3 py-3 font-medium">Marca</th>
            <th className="px-3 py-3 font-medium">Cor</th>
            <th className="px-3 py-3 font-medium">Largura</th>
            <th className="px-3 py-3 font-medium">Rolos</th>
            <th className="px-3 py-3 font-medium">Metragem</th>
            <th className="px-3 py-3 font-medium">Lote</th>
            <th className="px-3 py-3 font-medium">Recebimento</th>
            <th className="px-3 py-3 font-medium">Localização</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.box.id} className="border-t border-line align-top">
              <td className="px-3 py-3 font-mono text-xs text-ink">
                <BoxCode>{item.box.code}</BoxCode>
              </td>
              <td className="px-3 py-3">
                <p className="font-medium text-ink">
                  {item.product?.name ?? "Produto não encontrado"}
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {item.product?.internalCode ?? "—"}
                </p>
              </td>
              <td className="px-3 py-3">{item.product?.brand ?? "—"}</td>
              <td className="px-3 py-3">{item.product?.colorName ?? "—"}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                {formatMillimeters(item.product?.widthMm)}
              </td>
              <td className="px-3 py-3">{formatQuantity(item.box.rollsQuantity)}</td>
              <td className="px-3 py-3 whitespace-nowrap">{formatMeters(item.box.totalLengthM)}</td>
              <td className="px-3 py-3">{item.box.manufacturerBatch ?? "—"}</td>
              <td className="px-3 py-3 whitespace-nowrap">{formatDatePt(item.box.receivedAt)}</td>
              <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                {item.locationCode ? (
                  <LocationCode>{item.locationCode}</LocationCode>
                ) : (
                  "Sem localização"
                )}
              </td>
              <td className="px-3 py-3">
                <BoxStatusBadge status={item.box.status} />
              </td>
              <td className="px-3 py-3">
                <RowActions
                  item={item}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onLabel={onLabel}
                  layout="row"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <ul className="flex flex-col gap-3 lg:hidden">
        {items.map((item) => (
          <li key={item.box.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted">
                    <BoxCode>{item.box.code}</BoxCode>
                  </p>
                  <p className="mt-1 font-medium text-ink">
                    {item.product?.name ?? "Produto não encontrado"}
                  </p>
                </div>
                <BoxStatusBadge status={item.box.status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Data label="Marca" value={item.product?.brand ?? "—"} />
                <Data label="Cor" value={item.product?.colorName ?? "—"} />
                <Data label="Largura" value={formatMillimeters(item.product?.widthMm)} />
                <Data label="Rolos" value={formatQuantity(item.box.rollsQuantity)} />
                <Data label="Metragem" value={formatMeters(item.box.totalLengthM)} />
                <Data label="Lote" value={item.box.manufacturerBatch ?? "—"} />
                <Data label="Recebimento" value={formatDatePt(item.box.receivedAt)} />
                <Data label="Localização" value={item.locationCode ?? "Sem localização"} />
              </dl>
              <div className="mt-4">
                <RowActions
                  item={item}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onLabel={onLabel}
                  layout="wrap"
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RowActions({
  item,
  onOpen,
  onEdit,
  onLabel,
  layout,
}: {
  item: BoxListItem;
  onOpen: (item: BoxListItem) => void;
  onEdit: (item: BoxListItem) => void;
  onLabel: (item: BoxListItem) => void;
  layout: "row" | "wrap";
}) {
  return (
    <div className={layout === "row" ? "flex flex-nowrap gap-1" : "flex flex-wrap gap-2"}>
      <Button variant="ghost" className="px-2" onClick={() => onOpen(item)}>
        Detalhe
      </Button>
      <Button variant="ghost" className="px-2" onClick={() => onEdit(item)}>
        Editar
      </Button>
      <Button variant="ghost" className="px-2" onClick={() => onLabel(item)}>
        Etiqueta
      </Button>
    </div>
  );
}
