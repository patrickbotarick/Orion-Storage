import {
  BOX_STATUSES,
  BOX_STATUS_LABEL,
  type BoxQuery,
  type BoxStatusFilter,
  type Product,
} from "@orion/domain";
import { Search } from "lucide-react";

import { controlClass } from "@/components/ui/field";

type BoxFiltersProps = {
  query: BoxQuery;
  products: Product[];
  brands: string[];
  resultCount: number;
  onChange: (query: BoxQuery) => void;
};

export function BoxFilters({ query, products, brands, resultCount, onChange }: BoxFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          id="box-search"
          type="search"
          value={query.text ?? ""}
          onChange={(event) => onChange({ ...query, text: event.target.value })}
          placeholder="Buscar por caixa, produto, marca, cor ou lote"
          aria-label="Buscar por caixa, produto, marca, cor ou lote"
          className={`${controlClass} pl-10`}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-box-product"
            className="text-xs font-medium tracking-wide text-muted uppercase"
          >
            Produto
          </label>
          <select
            id="filter-box-product"
            value={query.productId ?? ""}
            onChange={(event) => onChange({ ...query, productId: event.target.value })}
            className={controlClass}
          >
            <option value="">Todos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
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
          <select
            id="filter-box-status"
            value={query.status ?? "ALL"}
            onChange={(event) =>
              onChange({ ...query, status: event.target.value as BoxStatusFilter })
            }
            className={controlClass}
          >
            <option value="ALL">Todos</option>
            {BOX_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOX_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
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
            className={controlClass}
          />
        </div>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {resultCount === 1 ? "1 caixa" : `${resultCount} caixas`}
      </p>
    </div>
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
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      >
        <option value="">Todas</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
