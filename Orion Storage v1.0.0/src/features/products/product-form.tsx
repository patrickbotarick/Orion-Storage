import { Input, Select, Textarea } from "@/components/ui/controls";
import { useState, type FormEvent } from "react";
import {
  detectLengthDivergence,
  parseOptionalDecimal,
  parseOptionalInteger,
  suggestInternalCodeFromForm,
  validateProductForm,
  type ProductFormValues,
  type ProductInput,
} from "@orion/domain";
import { formatMeters } from "@orion/shared";

import { Button } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";

type ProductFormProps = {
  mode: "create" | "edit" | "duplicate";
  initialValues: ProductFormValues;
  sourceName?: string;
  submitting: boolean;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel: () => void;
};

export function ProductForm({
  mode,
  initialValues,
  sourceName,
  submitting,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codeTouched, setCodeTouched] = useState(mode === "edit");

  function update(patch: Partial<ProductFormValues>) {
    setValues((current) => {
      const next = { ...current, ...patch };
      if (!codeTouched && !("internalCode" in patch)) {
        next.internalCode = suggestInternalCodeFromForm(next);
      }
      return next;
    });
  }

  const length = lengthPreview(values);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateProductForm(values);
    if (!result.ok) {
      setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    await onSubmit(result.input);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6" noValidate>
      {mode === "duplicate" ? (
        <p className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink">
          Cópia de {sourceName}. Ajuste o que muda antes de salvar. O código interno precisa ser
          diferente dos produtos já cadastrados. Um novo identificador será gerado.
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">Identificação</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              value={values.name}
              onChange={(event) => update({ name: event.target.value })}

              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
          </Field>
          <Field
            label="Categoria"
            htmlFor="category"
            required
            error={errors.category}
            hint="Obrigatória para qualquer tipo de produto."
          >
            <Input
              id="category"
              value={values.category}
              onChange={(event) => update({ category: event.target.value })}
              placeholder="Ex.: Fita de borda"

              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? "category-error" : undefined}
            />
          </Field>
          <Field label="Marca" htmlFor="brand" error={errors.brand}>
            <Input
              id="brand"
              value={values.brand}
              onChange={(event) => update({ brand: event.target.value })}
            />
          </Field>
          <Field label="Linha / modelo" htmlFor="line" error={errors.line}>
            <Input
              id="line"
              value={values.line}
              onChange={(event) => update({ line: event.target.value })}
            />
          </Field>
          <Field label="Fabricante" htmlFor="manufacturer" error={errors.manufacturer}>
            <Input
              id="manufacturer"
              value={values.manufacturer}
              onChange={(event) => update({ manufacturer: event.target.value })}
            />
          </Field>
          <Field label="Fornecedor" htmlFor="supplier" error={errors.supplier}>
            <Input
              id="supplier"
              value={values.supplier}
              onChange={(event) => update({ supplier: event.target.value })}
            />
          </Field>
          <Field label="Status" htmlFor="status" required error={errors.status}>
            <Select
              id="status"
              value={values.status}
              onChange={(event) =>
                update({ status: event.target.value === "INACTIVE" ? "INACTIVE" : "ACTIVE" })
              }
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </Select>
          </Field>
        </div>
        <Field
          label="Código interno"
          htmlFor="internalCode"
          required
          error={errors.internalCode}
          hint="Sugestão automática. Você pode editar. Letras, números e hífens."
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="internalCode"
              value={values.internalCode}
              onChange={(event) => {
                setCodeTouched(true);
                update({ internalCode: event.target.value });
              }}
              className={`${controlClass} font-mono`}
              aria-invalid={Boolean(errors.internalCode)}
              aria-describedby={errors.internalCode ? "internalCode-error" : undefined}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setCodeTouched(false);
                setValues((current) => ({
                  ...current,
                  internalCode: suggestInternalCodeFromForm(current),
                }));
              }}
            >
              Sugerir
            </Button>
          </div>
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Códigos externos
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Código do fabricante"
            htmlFor="manufacturerCode"
            error={errors.manufacturerCode}
          >
            <Input
              id="manufacturerCode"
              value={values.manufacturerCode}
              onChange={(event) => update({ manufacturerCode: event.target.value })}
            />
          </Field>
          <Field
            label="Código de barras original"
            htmlFor="originalBarcode"
            error={errors.originalBarcode}
          >
            <Input
              id="originalBarcode"
              value={values.originalBarcode}
              onChange={(event) => update({ originalBarcode: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Atributos de fita
          </h3>
          <p className="mt-1 text-sm text-muted">
            Opcionais. Outras categorias podem ficar com estes campos em branco. Informe só o
            número.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cor" htmlFor="colorName" error={errors.colorName}>
            <Input
              id="colorName"
              value={values.colorName}
              onChange={(event) => update({ colorName: event.target.value })}
            />
          </Field>
          <Field label="Código da cor" htmlFor="colorCode" error={errors.colorCode}>
            <Input
              id="colorCode"
              value={values.colorCode}
              onChange={(event) => update({ colorCode: event.target.value })}
            />
          </Field>
          <Field label="Largura" htmlFor="widthMm" hint="Milímetros" error={errors.widthMm}>
            <Input
              id="widthMm"
              inputMode="decimal"
              value={values.widthMm}
              onChange={(event) => update({ widthMm: event.target.value })}

              aria-invalid={Boolean(errors.widthMm)}
              aria-describedby={errors.widthMm ? "widthMm-error" : undefined}
            />
          </Field>
          <Field
            label="Espessura"
            htmlFor="thicknessMm"
            hint="Milímetros"
            error={errors.thicknessMm}
          >
            <Input
              id="thicknessMm"
              inputMode="decimal"
              value={values.thicknessMm}
              onChange={(event) => update({ thicknessMm: event.target.value })}

              aria-invalid={Boolean(errors.thicknessMm)}
              aria-describedby={errors.thicknessMm ? "thicknessMm-error" : undefined}
            />
          </Field>
          <Field
            label="Comprimento por rolo"
            htmlFor="rollLengthM"
            hint="Metros"
            error={errors.rollLengthM}
          >
            <Input
              id="rollLengthM"
              inputMode="decimal"
              value={values.rollLengthM}
              onChange={(event) => update({ rollLengthM: event.target.value })}

              aria-invalid={Boolean(errors.rollLengthM)}
              aria-describedby={errors.rollLengthM ? "rollLengthM-error" : undefined}
            />
          </Field>
          <Field
            label="Rolos por caixa"
            htmlFor="rollsPerBox"
            hint="Inteiro"
            error={errors.rollsPerBox}
          >
            <Input
              id="rollsPerBox"
              inputMode="numeric"
              value={values.rollsPerBox}
              onChange={(event) => update({ rollsPerBox: event.target.value })}

              aria-invalid={Boolean(errors.rollsPerBox)}
              aria-describedby={errors.rollsPerBox ? "rollsPerBox-error" : undefined}
            />
          </Field>
          <Field
            label="Metragem total informada"
            htmlFor="totalLengthPerBoxM"
            hint="Metros informados pelo fabricante. Não é sobrescrita pelo cálculo."
            error={errors.totalLengthPerBoxM}
          >
            <Input
              id="totalLengthPerBoxM"
              inputMode="decimal"
              value={values.totalLengthPerBoxM}
              onChange={(event) => update({ totalLengthPerBoxM: event.target.value })}

              aria-invalid={Boolean(errors.totalLengthPerBoxM)}
              aria-describedby={errors.totalLengthPerBoxM ? "totalLengthPerBoxM-error" : undefined}
            />
          </Field>
        </div>
        <LengthNotice length={length} />
      </section>

      <Field label="Observações" htmlFor="notes" error={errors.notes}>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(event) => update({ notes: event.target.value })}
          rows={3}
          className={`${controlClass} min-h-24 py-2`}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={submitting} loading={submitting}>
          {submitting ? "Salvando…" : "Salvar produto"}
        </Button>
      </div>
    </form>
  );
}

function lengthPreview(values: ProductFormValues) {
  const roll = parseOptionalDecimal(values.rollLengthM, "Comprimento do rolo");
  const rolls = parseOptionalInteger(values.rollsPerBox, "Rolos por caixa");
  const informed = parseOptionalDecimal(values.totalLengthPerBoxM, "Metragem total informada");
  if (!roll.ok || !rolls.ok || !informed.ok) return null;
  if (roll.value == null || rolls.value == null) return null;
  return detectLengthDivergence({
    rollLengthM: roll.value,
    rollsPerBox: rolls.value,
    informedTotalLengthM: informed.value,
  });
}

function LengthNotice({ length }: { length: ReturnType<typeof detectLengthDivergence> | null }) {
  if (!length || length.calculatedTotalLengthM == null) {
    return (
      <p className="text-sm text-muted">
        A metragem calculada aparece quando o comprimento do rolo e a quantidade de rolos são
        válidos.
      </p>
    );
  }
  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${
        length.hasDivergence ? "border-accent bg-bg text-ink" : "border-line bg-bg text-ink"
      }`}
    >
      <p>
        Total calculado: <strong>{formatMeters(length.calculatedTotalLengthM)}</strong>
        {length.informedTotalLengthM != null
          ? ` · Total informado: ${formatMeters(length.informedTotalLengthM)}`
          : ""}
      </p>
      {length.hasDivergence ? (
        <p className="mt-1 text-accent">
          Os valores divergem e o total informado será mantido. Nada é sobrescrito.
        </p>
      ) : null}
    </div>
  );
}
