import { Alert } from "@/components/ui/feedback";
import { Input, Textarea, Select } from "@/components/ui/controls";
import { useState } from "react";
import {
  MAX_BOXES_PER_RECEIPT,
  formatOperationalDate,
  parseOptionalDecimal,
  parseOptionalInteger,
  suggestBoxContent,
  type Product,
  type ReceiptDraft,
  type ReceiptPlan,
} from "@orion/domain";
import { formatMeters, formatQuantity } from "@orion/shared";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type ItemForm = {
  key: string;
  productId: string;
  boxesQuantity: string;
  rollsQuantity: string;
  totalLengthM: string;
  manufacturerBatch: string;
  notes: string;
  rollsTouched: boolean;
  lengthTouched: boolean;
};

type FormState = {
  requestId: string;
  receivedAt: string;
  supplierName: string;
  notes: string;
  items: ItemForm[];
};

type ReceiptFormProps = {
  products: Product[];
  submitting: boolean;
  preview: ReceiptPlan | null;
  error: string | null;
  onPreview: (draft: ReceiptDraft) => Promise<void>;
  onConfirm: (draft: ReceiptDraft) => Promise<void>;
  onCancel: () => void;
};

export function ReceiptForm({
  products,
  submitting,
  preview,
  error,
  onPreview,
  onConfirm,
  onCancel,
}: ReceiptFormProps) {
  const [form, setForm] = useState<FormState>(() => ({
    requestId: crypto.randomUUID(),
    receivedAt: formatOperationalDate(new Date()),
    supplierName: "",
    notes: "",
    items: [emptyItem()],
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const active = products.filter((product) => product.status === "ACTIVE");
  const draftKey = JSON.stringify(readDraft(form).draft ?? null);
  const previewReady = preview != null && previewKey === draftKey;
  const total = form.items.reduce((sum, item) => sum + (integerOrZero(item.boxesQuantity) ?? 0), 0);

  function update(next: FormState) {
    setForm(next);
    setPreviewKey(null);
    setFormError(null);
  }

  function updateItem(key: string, patch: Partial<ItemForm>) {
    update({
      ...form,
      items: form.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    });
  }

  function chooseProduct(key: string, productId: string) {
    const item = form.items.find((candidate) => candidate.key === key);
    if (!item) return;
    const product = active.find((candidate) => candidate.id === productId);
    const suggestion = suggestBoxContent(product ?? {});
    updateItem(key, {
      productId,
      rollsQuantity: item.rollsTouched
        ? item.rollsQuantity
        : quantityText(suggestion.rollsQuantity),
      totalLengthM: item.lengthTouched ? item.totalLengthM : quantityText(suggestion.totalLengthM),
    });
  }

  async function previewNow() {
    const parsed = readDraft(form);
    if (parsed.error || !parsed.draft) {
      setFormError(parsed.error ?? "Revise os dados do recebimento.");
      setPreviewKey(null);
      return;
    }
    setFormError(null);
    try {
      await onPreview(parsed.draft);
      setPreviewKey(JSON.stringify(parsed.draft));
    } catch (caught) {
      setPreviewKey(null);
      setFormError(caught instanceof Error ? caught.message : "Não foi possível gerar a prévia.");
    }
  }

  async function confirmNow() {
    const parsed = readDraft(form);
    if (!previewReady || parsed.error || !parsed.draft || submitting) return;
    try {
      await onConfirm(parsed.draft);
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Não foi possível confirmar o recebimento.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data de recebimento" htmlFor="receipt-date" required>
          <Input
            id="receipt-date"
            type="date"
            value={form.receivedAt}

            onChange={(event) => update({ ...form, receivedAt: event.target.value })}
          />
        </Field>
        <Field
          label="Fornecedor"
          htmlFor="receipt-supplier"
          hint="Nome livre para a entrega. Não é um cadastro fiscal."
        >
          <Input
            id="receipt-supplier"
            value={form.supplierName}

            onChange={(event) => update({ ...form, supplierName: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Observações do recebimento" htmlFor="receipt-notes">
        <Textarea
          id="receipt-notes"
          value={form.notes}
          rows={2}

          onChange={(event) => update({ ...form, notes: event.target.value })}
        />
      </Field>

      <div className="flex flex-col gap-4">
        {form.items.map((item, index) => {
          const product = active.find((candidate) => candidate.id === item.productId) ?? null;
          return (
            <section key={item.key} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">Item {index + 1}</h2>
                {form.items.length > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update({ ...form, items: form.items.filter((line) => line.key !== item.key) })
                    }
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Produto" htmlFor={`product-${item.key}`} required>
                  <Select
                    id={`product-${item.key}`}
                    value={item.productId}

                    onChange={(event) => chooseProduct(item.key, event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {active.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.brand ? `${option.brand} · ` : ""}
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quantidade de caixas" htmlFor={`qty-${item.key}`} required>
                  <Input
                    id={`qty-${item.key}`}
                    inputMode="numeric"
                    value={item.boxesQuantity}

                    onChange={(event) =>
                      updateItem(item.key, { boxesQuantity: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Rolos por caixa"
                  htmlFor={`rolls-${item.key}`}
                  required
                  hint={
                    product ? "Sugestão do produto. Pode ajustar só neste recebimento." : undefined
                  }
                >
                  <Input
                    id={`rolls-${item.key}`}
                    inputMode="numeric"
                    value={item.rollsQuantity}

                    onChange={(event) =>
                      updateItem(item.key, {
                        rollsQuantity: event.target.value,
                        rollsTouched: true,
                      })
                    }
                  />
                </Field>
                <Field label="Metragem por caixa" htmlFor={`length-${item.key}`} required>
                  <Input
                    id={`length-${item.key}`}
                    inputMode="decimal"
                    value={item.totalLengthM}

                    onChange={(event) =>
                      updateItem(item.key, {
                        totalLengthM: event.target.value,
                        lengthTouched: true,
                      })
                    }
                  />
                </Field>
                <Field label="Lote" htmlFor={`batch-${item.key}`}>
                  <Input
                    id={`batch-${item.key}`}
                    value={item.manufacturerBatch}

                    onChange={(event) =>
                      updateItem(item.key, { manufacturerBatch: event.target.value })
                    }
                  />
                </Field>
                <Field label="Observação do item" htmlFor={`item-notes-${item.key}`}>
                  <Input
                    id={`item-notes-${item.key}`}
                    value={item.notes}

                    onChange={(event) => updateItem(item.key, { notes: event.target.value })}
                  />
                </Field>
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => update({ ...form, items: [...form.items, emptyItem()] })}
        >
          Adicionar produto
        </Button>
        <p className="text-sm text-muted">
          Total: {total} {total === 1 ? "caixa" : "caixas"}. Máximo de {MAX_BOXES_PER_RECEIPT} por
          recebimento.
        </p>
      </div>

      {formError || error ? (
        <Alert tone="danger" className="">
          {formError || error}
        </Alert>
      ) : null}

      {previewReady && preview ? <Preview plan={preview} products={products} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={submitting} onClick={() => void previewNow()}>
          Gerar prévia
        </Button>
        <Button
          variant="primary"
          disabled={!previewReady || submitting}
          loading={submitting}
          onClick={() => void confirmNow()}
        >
          {submitting ? "Confirmando…" : "Confirmar recebimento"}
        </Button>
        <Button variant="ghost" disabled={submitting} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function Preview({ plan, products }: { plan: ReceiptPlan; products: Product[] }) {
  return (
    <section className="rounded-card border border-accent bg-selected p-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Prévia</h2>
      <p className="mt-2 text-sm text-ink">
        Recebimento previsto: <span className="font-mono">{plan.receiptCode}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        Estes códigos só são reservados na confirmação. Cancelar não consome a sequência.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {plan.items.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId) ?? null;
          return (
            <div key={`${item.productId}-${item.boxCodes[0]}`}>
              <p className="text-sm font-medium text-ink">
                {[product?.brand, product?.name, product?.colorName].filter(Boolean).join(" · ") ||
                  "Produto"}
              </p>
              <p className="text-sm text-muted">
                {formatQuantity(item.boxesQuantity)} caixas · {formatQuantity(item.rollsQuantity)}{" "}
                rolos por caixa · {formatMeters(item.totalLengthM)} por caixa
                {item.manufacturerBatch ? ` · lote ${item.manufacturerBatch}` : ""}
              </p>
              <ul className="mt-2 max-h-40 overflow-y-auto font-mono text-code text-ink">
                {item.boxCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function emptyItem(): ItemForm {
  return {
    key: crypto.randomUUID(),
    productId: "",
    boxesQuantity: "1",
    rollsQuantity: "",
    totalLengthM: "",
    manufacturerBatch: "",
    notes: "",
    rollsTouched: false,
    lengthTouched: false,
  };
}

function quantityText(value: number | undefined): string {
  return value == null ? "" : String(value);
}

function integerOrZero(raw: string): number | null {
  const parsed = parseOptionalInteger(raw, "Quantidade");
  if (!parsed.ok || parsed.value == null || parsed.value <= 0) return null;
  return parsed.value;
}

function readDraft(form: FormState): { draft?: ReceiptDraft; error?: string } {
  if (form.items.length === 0) return { error: "Inclua pelo menos um produto." };
  const items: ReceiptDraft["items"] = [];
  for (const item of form.items) {
    if (!item.productId) return { error: "Selecione o produto." };
    const quantity = parseOptionalInteger(item.boxesQuantity, "Quantidade de caixas");
    if (!quantity.ok) return { error: quantity.message };
    if (quantity.value == null || quantity.value <= 0) {
      return { error: "A quantidade de caixas deve ser um número inteiro maior que zero." };
    }
    const rolls = parseOptionalInteger(item.rollsQuantity, "Rolos por caixa");
    if (!rolls.ok) return { error: rolls.message };
    if (rolls.value == null) return { error: "Informe os rolos por caixa." };
    const length = parseOptionalDecimal(item.totalLengthM, "Metragem por caixa");
    if (!length.ok) return { error: length.message };
    if (length.value == null) return { error: "Informe a metragem por caixa." };
    const line: ReceiptDraft["items"][number] = {
      productId: item.productId,
      boxesQuantity: quantity.value,
      rollsQuantity: rolls.value,
      totalLengthM: length.value,
    };
    if (item.manufacturerBatch.trim()) line.manufacturerBatch = item.manufacturerBatch.trim();
    if (item.notes.trim()) line.notes = item.notes.trim();
    items.push(line);
  }
  const draft: ReceiptDraft = {
    requestId: form.requestId,
    receivedAt: form.receivedAt,
    items,
  };
  if (form.supplierName.trim()) draft.supplierName = form.supplierName.trim();
  if (form.notes.trim()) draft.notes = form.notes.trim();
  return { draft };
}
