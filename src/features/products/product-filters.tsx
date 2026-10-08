import type { ProductQuery, ProductStatusFilter } from "@orion/domain";
import { STATUS_LABEL } from "@orion/shared";

import { SearchInput, Select } from "@/components/ui/controls";
import { TableToolbar } from "@/components/ui/surfaces";

type ProductFiltersProps = {
  query: ProductQuery;
  categories: string[];
  brands: string[];
  resultCount: number;
  onChange: (query: ProductQuery) => void;
};

export function ProductFilters({
  query,
  categories,
  brands,
  resultCount,
  onChange,
}: ProductFiltersProps) {
  return (
    <TableToolbar>
      <SearchInput
        id="product-search"

        value={query.text ?? ""}
        onChange={(event) => onChange({ ...query, text: event.target.value })}
        placeholder="Buscar por código, nome, marca ou cor"
        aria-label="Buscar por código, nome, marca ou cor"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <FilterSelect
          id="filter-category"
          label="Categoria"
          value={query.category ?? ""}
          options={categories}
          onChange={(category) => onChange({ ...query, category })}
        />
        <FilterSelect
          id="filter-brand"
          label="Marca"
          value={query.brand ?? ""}
          options={brands}
          onChange={(brand) => onChange({ ...query, brand })}
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-status"
            className="text-xs font-medium tracking-wide text-muted uppercase"
          >
            Status
          </label>
          <Select
            id="filter-status"
            value={query.status ?? "ALL"}
            onChange={(event) =>
              onChange({ ...query, status: event.target.value as ProductStatusFilter })
            }
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">{STATUS_LABEL.ACTIVE}</option>
            <option value="INACTIVE">{STATUS_LABEL.INACTIVE}</option>
          </Select>
        </div>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {resultCount === 1 ? "1 produto" : `${resultCount} produtos`}
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
