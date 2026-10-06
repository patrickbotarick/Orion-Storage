import { detectLengthDivergence, type Product } from "@orion/domain";
import { STATUS_LABEL, formatMeters, formatMillimeters, formatQuantity } from "@orion/shared";

import { Button } from "@/components/ui/button";

type ProductTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
};

export function ProductTable({ products, onEdit, onDuplicate, onToggleStatus }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
        <p className="text-base font-medium text-ink">Nenhum produto encontrado</p>
        <p className="mt-1 text-sm text-muted">
          Ajuste a busca ou os filtros, ou cadastre um produto novo.
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
              <th className="px-3 py-3 font-medium">Nome</th>
              <th className="px-3 py-3 font-medium">Categoria</th>
              <th className="px-3 py-3 font-medium">Marca</th>
              <th className="px-3 py-3 font-medium">Cor</th>
              <th className="px-3 py-3 font-medium">Largura</th>
              <th className="px-3 py-3 font-medium">Espessura</th>
              <th className="px-3 py-3 font-medium whitespace-nowrap">Rolo</th>
              <th className="px-3 py-3 font-medium whitespace-nowrap">Rolos/caixa</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-line align-top">
                <td className="px-3 py-3 font-mono text-xs text-ink">{product.internalCode}</td>
                <td className="px-3 py-3">
                  <ProductName product={product} />
                </td>
                <td className="px-3 py-3">{product.category}</td>
                <td className="px-3 py-3">{product.brand ?? "—"}</td>
                <td className="px-3 py-3">{product.colorName ?? "—"}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {formatMillimeters(product.widthMm)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {formatMillimeters(product.thicknessMm)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">{formatMeters(product.rollLengthM)}</td>
                <td className="px-3 py-3">{formatQuantity(product.rollsPerBox)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={product.status} />
                </td>
                <td className="px-3 py-3">
                  <RowActions
                    layout="row"
                    product={product}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onToggleStatus={onToggleStatus}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 lg:hidden">
        {products.map((product) => (
          <li key={product.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <ProductName product={product} />
              <StatusBadge status={product.status} />
            </div>
            <p className="mt-2 font-mono text-xs text-muted">{product.internalCode}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Data label="Categoria" value={product.category} />
              <Data label="Marca" value={product.brand ?? "—"} />
              <Data label="Cor" value={product.colorName ?? "—"} />
              <Data label="Largura" value={formatMillimeters(product.widthMm)} />
              <Data label="Espessura" value={formatMillimeters(product.thicknessMm)} />
              <Data label="Rolo" value={formatMeters(product.rollLengthM)} />
              <Data label="Rolos por caixa" value={formatQuantity(product.rollsPerBox)} />
            </dl>
            <div className="mt-4">
              <RowActions
                layout="wrap"
                product={product}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onToggleStatus={onToggleStatus}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProductName({ product }: { product: Product }) {
  const divergence = detectLengthDivergence({
    rollLengthM: product.rollLengthM,
    rollsPerBox: product.rollsPerBox,
    informedTotalLengthM: product.totalLengthPerBoxM,
  });
  return (
    <div>
      <p className="font-medium text-ink">{product.name}</p>
      {divergence.hasDivergence ? (
        <p className="mt-1 text-xs text-accent">Divergência de metragem</p>
      ) : null}
    </div>
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

function StatusBadge({ status }: { status: Product["status"] }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-md px-2 text-xs font-medium ${
        active ? "bg-ink text-on-ink" : "bg-bg text-muted"
      }`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function RowActions({
  layout,
  product,
  onEdit,
  onDuplicate,
  onToggleStatus,
}: {
  layout: "row" | "wrap";
  product: Product;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}) {
  return (
    <div className={layout === "row" ? "flex flex-nowrap gap-1" : "flex flex-wrap gap-2"}>
      <Button variant="ghost" className="px-2" onClick={() => onEdit(product)}>
        Editar
      </Button>
      <Button variant="ghost" className="px-2" onClick={() => onDuplicate(product)}>
        Duplicar
      </Button>
      <Button variant="ghost" className="px-2" onClick={() => onToggleStatus(product)}>
        {product.status === "ACTIVE" ? "Desativar" : "Ativar"}
      </Button>
    </div>
  );
}
