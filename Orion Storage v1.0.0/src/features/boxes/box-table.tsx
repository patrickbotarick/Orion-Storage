import type { BoxListItem } from "@orion/domain";
import { formatDatePt, formatMeters, formatMillimeters, formatQuantity } from "@orion/shared";

import { Button } from "@/components/ui/button";
import { BoxStatusBadge } from "@/features/boxes/box-status-badge";

type BoxTableProps = {
  items: BoxListItem[];
  onOpen: (item: BoxListItem) => void;
  onEdit: (item: BoxListItem) => void;
};

export function BoxTable({ items, onOpen, onEdit }: BoxTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
        <p className="text-base font-medium text-ink">Nenhuma caixa encontrada</p>
        <p className="mt-1 text-sm text-muted">
          Ajuste a busca ou os filtros, ou registre uma caixa nova.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface lg:block">
        <table className="w-full min-w-max border-collapse text-left text-sm">
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
                <td className="px-3 py-3 font-mono text-xs text-ink">{item.box.code}</td>
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
                <td className="px-3 py-3 whitespace-nowrap">
                  {formatMeters(item.box.totalLengthM)}
                </td>
                <td className="px-3 py-3">{item.box.manufacturerBatch ?? "—"}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDatePt(item.box.receivedAt)}</td>
                <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                  {item.locationCode ?? "Sem localização"}
                </td>
                <td className="px-3 py-3">
                  <BoxStatusBadge status={item.box.status} />
                </td>
                <td className="px-3 py-3">
                  <RowActions item={item} onOpen={onOpen} onEdit={onEdit} layout="row" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 lg:hidden">
        {items.map((item) => (
          <li key={item.box.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">{item.box.code}</p>
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
              <RowActions item={item} onOpen={onOpen} onEdit={onEdit} layout="wrap" />
            </div>
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
  layout,
}: {
  item: BoxListItem;
  onOpen: (item: BoxListItem) => void;
  onEdit: (item: BoxListItem) => void;
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
    </div>
  );
}
