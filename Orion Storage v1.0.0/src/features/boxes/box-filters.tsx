import {
  BOX_STATUSES,
  BOX_STATUS_LABEL,
  type BoxPlacementFilter,
  type BoxQuery,
  type BoxStatusFilter,
  type Product,
} from "@orion/domain";

import { SearchInput, Select } from "@/components/ui/controls";
import { TableToolbar } from "@/components/ui/surfaces";

type BoxFiltersProps = {
  query: BoxQuery;
  products: Product[];
  brands: string[];
  resultCount: number;
  onChange: (query: BoxQuery) => void;
};

export function BoxFilters({ query, products, brands, resultCount, onChange }: BoxFiltersProps) {
  return (
    <TableToolbar>
      <SearchInput
        id="box-search"

        value={query.text ?? ""}
        onChange={(event) => onChange({ ...query, text: event.target.value })}
        placeholder="Buscar por caixa, produto, marca, cor, lote ou localização"
        aria-label="Buscar por caixa, produto, marca, cor, lote ou localização"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-box-product"
            className="text-xs font-medium tracking-wide text-muted uppercase"
          >
            Produto
          </label>
          <Select
            id="filter-box-product"
            value={query.productId ?? ""}
            onChange={(event) => onChange({ ...query, productId: event.target.value })}
          >
            <option value="">Todos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </div>
        <FilterSelect
          id="filter-box-brand"
          label="Marca"
          value={query.brand ?? ""}
          options={brands}
          onChange={(brand) => onChange({ ...query, brand })}
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-box-status"
            className="text-xs font-medium tracking-wide text-muted uppercase"
          >
            Status
          </label>
          <Select
            id="filter-box-status"
            value={query.status ?? "ALL"}
            onChange={(event) =>
              onChange({ ...query, status: event.target.value as BoxStatusFilter })
            }
          >
            <option value="ALL">Todos</option>
            {BOX_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOX_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-box-date"
            className="text-xs font-medium tracking-wide text-muted uppercase"
          >
            Recebimento
          </label>
          <input
            id="filter-box-date"
            type="date"
            value={query.receivedAt ?? ""}
            onChange={(event) => onChange({ ...query, receivedAt: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-box-placement"
            className="text-xs font-medium tracking-wide text-muted uppercase"
          >
            Localização
          </label>
          <Select
            id="filter-box-placement"
            value={query.placement ?? "ALL"}
            onChange={(event) =>
              onChange({ ...query, placement: event.target.value as BoxPlacementFilter })
            }
          >
            <option value="ALL">Todas</option>
            <option value="WITH_LOCATION">Com localização</option>
            <option value="WITHOUT_LOCATION">Sem localização</option>
          </Select>
        </div>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {resultCount === 1 ? "1 caixa" : `${resultCount} caixas`}
      </p>
    </TableToolbar>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </label>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todas</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}
