import { Select, Input, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/feedback";
import { useState, type FormEvent } from "react";
import {
  calculatedTotalLengthM,
  formatBoxFormNumber,
  parseOptionalInteger,
  suggestBoxContent,
  validateBoxCreateForm,
  validateBoxEditForm,
  type Box,
  type BoxCreateInput,
  type BoxEditFormValues,
  type BoxFormValues,
  type BoxUpdateInput,
  type Product,
} from "@orion/domain";
import { formatMeters, formatMillimeters, formatQuantity } from "@orion/shared";

import { Button } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";

type BoxFormProps = {
  mode: "create" | "edit";
  products: Product[];
  box?: Box;
  product?: Product | null;
  initialValues: BoxFormValues | BoxEditFormValues;
  submitting: boolean;
  onSubmit: (input: BoxCreateInput | BoxUpdateInput) => Promise<void>;
  onCancel: () => void;
};

export function BoxForm({
  mode,
  products,
  box,
  product,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
}: BoxFormProps) {
  const [values, setValues] = useState<BoxFormValues>(() => ({
    productId: "productId" in initialValues ? initialValues.productId : "",
    rollsQuantity: initialValues.rollsQuantity,
    totalLengthM: initialValues.totalLengthM,
    manufacturerBatch: initialValues.manufacturerBatch,
    receivedAt: initialValues.receivedAt,
    notes: initialValues.notes,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rollsTouched, setRollsTouched] = useState(mode === "edit");
  const [lengthTouched, setLengthTouched] = useState(mode === "edit");

  const selected = products.find((item) => item.id === values.productId) ?? null;

  function applyProduct(productId: string) {
    setValues((current) => {
      const next = { ...current, productId };
      const match = products.find((item) => item.id === productId);
      const suggestion = match ? suggestBoxContent(match) : {};
      if (!rollsTouched) {
        next.rollsQuantity =
          suggestion.rollsQuantity != null ? String(suggestion.rollsQuantity) : "";
      }
      if (!lengthTouched) {
        next.totalLengthM =
          suggestion.totalLengthM != null ? formatBoxFormNumber(suggestion.totalLengthM) : "";
      }
      return next;
    });
  }

  function updateRolls(raw: string) {
    setRollsTouched(true);
    setValues((current) => {
      const next = { ...current, rollsQuantity: raw };
      if (lengthTouched) return next;
      const match = products.find((item) => item.id === current.productId);
      const parsed = parseOptionalInteger(raw, "Quantidade de rolos");
      if (match?.rollLengthM != null && parsed.ok && parsed.value != null) {
        next.totalLengthM = formatBoxFormNumber(
          calculatedTotalLengthM(match.rollLengthM, parsed.value),
        );
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "create") {
      const result = validateBoxCreateForm(values);
      if (!result.ok) {
        setErrors(result.fieldErrors);
        return;
      }
      setErrors({});
      await onSubmit(result.input);
      return;
    }
    const result = validateBoxEditForm(values);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    await onSubmit(result.input);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6" noValidate>
      {mode === "create" ? (
        <p className="text-sm text-muted">
          O código CX-AAAAMMDD-NNNNNN é gerado ao confirmar. Ele não pode ser digitado nem alterado
          depois.
        </p>
      ) : (
        <div className="rounded-md border border-line bg-bg px-3 py-3">
          <p className="font-mono text-sm text-ink">{box?.code}</p>
          <p className="mt-1 text-sm text-ink">{product?.name ?? "Produto não encontrado"}</p>
          <p className="mt-1 text-xs text-muted">O código e o produto não podem ser alterados.</p>
        </div>
      )}

      {mode === "create" ? (
        products.length === 0 ? (
          <EmptyState
            title="Nenhum produto ativo. Cadastre ou reative um produto antes de registrar uma caixa."
            className="mt-4"
          />
        ) : (
          <Field label="Produto" htmlFor="box-product" required error={errors.productId}>
            <Select
              id="box-product"
              value={values.productId}
              onChange={(event) => applyProduct(event.target.value)}

              aria-invalid={Boolean(errors.productId)}
            >
              <option value="">Selecione</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
        )
      ) : null}

      {mode === "create" && selected ? <ProductSummary product={selected} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Quantidade de rolos"
          htmlFor="rollsQuantity"
          required
          error={errors.rollsQuantity}
          hint="Conteúdo real desta caixa. Pode ser diferente do padrão do produto."
        >
          <Input
            id="rollsQuantity"
            inputMode="numeric"
            value={values.rollsQuantity}
            onChange={(event) => updateRolls(event.target.value)}

            aria-invalid={Boolean(errors.rollsQuantity)}
          />
        </Field>
        <Field
          label="Metragem total"
          htmlFor="totalLengthM"
          required
          hint="Metros. Não é sobrescrita se você informar outro valor."
          error={errors.totalLengthM}
        >
          <Input
            id="totalLengthM"
            inputMode="decimal"
            value={values.totalLengthM}
            onChange={(event) => {
              setLengthTouched(true);
              setValues((current) => ({ ...current, totalLengthM: event.target.value }));
            }}

            aria-invalid={Boolean(errors.totalLengthM)}
          />
        </Field>
        <Field
          label="Lote"
          htmlFor="manufacturerBatch"
          hint="Opcional. Texto ou código informado pelo fornecedor."
          error={errors.manufacturerBatch}
        >
          <Input
            id="manufacturerBatch"
            value={values.manufacturerBatch}
            onChange={(event) =>
              setValues((current) => ({ ...current, manufacturerBatch: event.target.value }))
            }

            aria-invalid={Boolean(errors.manufacturerBatch)}
          />
        </Field>
        <Field label="Data de recebimento" htmlFor="receivedAt" required error={errors.receivedAt}>
          <Input
            id="receivedAt"
            type="date"
            value={values.receivedAt}
            onChange={(event) =>
              setValues((current) => ({ ...current, receivedAt: event.target.value }))
            }

            aria-invalid={Boolean(errors.receivedAt)}
          />
        </Field>
      </div>

      <Field label="Observações" htmlFor="box-notes" error={errors.notes}>
        <Textarea
          id="box-notes"
          value={values.notes}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          rows={3}
          className={`${controlClass} min-h-24 py-2`}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={submitting || (mode === "create" && products.length === 0)}
          loading={submitting}
        >
          {submitting ? "Salvando…" : mode === "create" ? "Registrar caixa" : "Salvar caixa"}
        </Button>
      </div>
    </form>
  );
}

function ProductSummary({ product }: { product: Product }) {
  const suggestion = suggestBoxContent(product);
  return (
    <div className="rounded-md border border-line bg-bg px-3 py-3 text-sm">
      <p className="font-medium text-ink">{product.name}</p>
      <p className="mt-1 font-mono text-xs text-muted">{product.internalCode}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <SummaryItem label="Marca" value={product.brand ?? "—"} />
        <SummaryItem label="Cor" value={product.colorName ?? "—"} />
        <SummaryItem label="Largura" value={formatMillimeters(product.widthMm)} />
        <SummaryItem label="Rolo" value={formatMeters(product.rollLengthM)} />
      </dl>
      <p className="mt-3 text-muted">
        {suggestion.rollsQuantity != null
          ? `Sugestão calculada: ${formatQuantity(suggestion.rollsQuantity)} rolos${
              suggestion.totalLengthM != null ? ` e ${formatMeters(suggestion.totalLengthM)}` : ""
            }.`
          : "Este produto não tem padrão de rolos. Informe o conteúdo real da caixa."}
        {product.totalLengthPerBoxM != null
          ? ` Total informado no cadastro: ${formatMeters(product.totalLengthPerBoxM)}.`
          : ""}
      </p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
