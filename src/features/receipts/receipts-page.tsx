import { Alert, LoadingState, EmptyState } from "@/components/ui/feedback";
import { SearchInput, Input, Select } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/surfaces";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RECEIPT_STATUS_LABEL,
  filterReceipts,
  type Box,
  type Product,
  type Receipt,
  type ReceiptDraft,
  type ReceiptPlan,
  type ReceiptQuery,
} from "@orion/domain";
import { formatDatePt, formatQuantity } from "@orion/shared";

import { getBrowserBoxService } from "@/application/boxes/box-service";
import { getBrowserProductService } from "@/application/products/product-service";
import { getBrowserReceiptService } from "@/application/receipts/receipt-service";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { BoxLabel } from "@/features/identification/box-label";
import { PrintLabelDialog } from "@/features/identification/print-label-dialog";
import { ReceiptForm } from "@/features/receipts/receipt-form";
import { ReceiptLabelSheet } from "@/features/receipts/receipt-label-sheet";

const INITIAL_QUERY: ReceiptQuery = { text: "", date: "", productId: "", brand: "", status: "ALL" };

type Screen =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; receiptId: string }
  | { kind: "done"; receiptId: string; created: number };

type PrintJob = { kind: "batch"; boxes: Box[] } | { kind: "single"; box: Box };

export function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState<ReceiptQuery>(INITIAL_QUERY);
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const [preview, setPreview] = useState<ReceiptPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);

  const reload = useCallback(async () => {
    const [nextReceipts, nextProducts, nextBoxes] = await Promise.all([
      getBrowserReceiptService().list(),
      getBrowserProductService().list(),
      getBrowserBoxService().list(),
    ]);
    setReceipts(nextReceipts);
    setProducts(nextProducts);
    setBoxes(nextBoxes);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload().catch((caught: unknown) => {
      if (!cancelled)
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar.");
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const items = useMemo(() => {
    return (receipts ?? []).map((receipt) => {
      const ownBoxes = boxes.filter((box) => box.receiptId === receipt.id);
      const lines = receipt.items.map((item) =>
        products.find((product) => product.id === item.productId),
      );
      return {
        receipt,
        productLabels: lines.map(
          (product, index) => product?.name ?? receipt.items[index]?.productId ?? "",
        ),
        brands: lines
          .map((product) => product?.brand)
          .filter((brand): brand is string => Boolean(brand)),
        batches: receipt.items
          .map((item) => item.manufacturerBatch)
          .filter((batch): batch is string => Boolean(batch)),
        boxCodes: ownBoxes.map((box) => box.code),
        boxCount:
          ownBoxes.length || receipt.items.reduce((sum, item) => sum + item.boxesQuantity, 0),
      };
    });
  }, [boxes, products, receipts]);
  const visible = useMemo(() => filterReceipts(items, query), [items, query]);
  const brands = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.brand)
            .filter((brand): brand is string => Boolean(brand)),
        ),
      ].sort(),
    [products],
  );
  const detail =
    screen.kind === "detail" || screen.kind === "done"
      ? (receipts?.find((receipt) => receipt.id === screen.receiptId) ?? null)
      : null;
  const detailBoxes = detail
    ? boxes
        .filter((box) => box.receiptId === detail.id)
        .sort((a, b) => a.code.localeCompare(b.code))
    : [];

  async function previewDraft(draft: ReceiptDraft) {
    setError(null);
    const plan = await getBrowserReceiptService().preview(draft);
    setPreview(plan);
  }

  async function confirmDraft(draft: ReceiptDraft) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await getBrowserReceiptService().confirm(draft);
      await reload();
      setPreview(null);
      setScreen({ kind: "done", receiptId: result.receipt.id, created: result.boxes.length });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível confirmar o recebimento.",
      );
      throw caught;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell section="receipts">
      <PageHeader
        title="Recebimentos"
        eyebrow="Entrada"
        description="Gera várias caixas de uma vez, sem endereço. A etiqueta sai agora; a posição entra depois, no scanner."
        actions={
          <>
            {screen.kind === "list" ? (
              <Button
                variant="primary"
                onClick={() => {
                  setPreview(null);
                  setError(null);
                  setScreen({ kind: "create" });
                }}
              >
                + Novo recebimento
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setPreview(null);
                  setError(null);
                  setScreen({ kind: "list" });
                }}
              >
                Voltar à lista
              </Button>
            )}
          </>
        }
      />

      {screen.kind === "create" ? (
        <div className="mt-6">
          <ReceiptForm
            products={products}
            submitting={submitting}
            preview={preview}
            error={error}
            onPreview={previewDraft}
            onConfirm={confirmDraft}
            onCancel={() => {
              setPreview(null);
              setError(null);
              setScreen({ kind: "list" });
            }}
          />
        </div>
      ) : null}

      {screen.kind === "done" && detail ? (
        <section className="mt-6 rounded-card border border-success-border bg-success-bg p-5">
          <h2 className="text-lg font-semibold text-ink">Recebimento concluído.</h2>
          <p className="mt-2 font-mono text-sm">{detail.code}</p>
          <p className="mt-1 text-sm text-ink">{detailBoxes.length} caixas criadas.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => setPrintJob({ kind: "batch", boxes: detailBoxes })}
            >
              Imprimir etiquetas
            </Button>
            <Button
              variant="secondary"
              onClick={() => setScreen({ kind: "detail", receiptId: detail.id })}
            >
              Ver recebimento
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPreview(null);
                setScreen({ kind: "create" });
              }}
            >
              Novo recebimento
            </Button>
          </div>
        </section>
      ) : null}

      {screen.kind === "detail" && detail ? (
        <ReceiptDetail
          receipt={detail}
          boxes={detailBoxes}
          products={products}
          onPrintAll={() => setPrintJob({ kind: "batch", boxes: detailBoxes })}
          onPrintOne={(box) => setPrintJob({ kind: "single", box })}
        />
      ) : null}

      {screen.kind === "list" ? (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SearchInput
              value={query.text ?? ""}
              aria-label="Buscar recebimentos"
              placeholder="Código, produto, marca, lote ou caixa"

              onChange={(event) => setQuery({ ...query, text: event.target.value })}
            />
            <Input
              type="date"
              aria-label="Filtrar por data"
              value={query.date ?? ""}

              onChange={(event) => setQuery({ ...query, date: event.target.value })}
            />
            <Select
              aria-label="Filtrar por produto"
              value={query.productId ?? ""}

              onChange={(event) => setQuery({ ...query, productId: event.target.value })}
            >
              <option value="">Todos os produtos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por marca"
              value={query.brand ?? ""}

              onChange={(event) => setQuery({ ...query, brand: event.target.value })}
            >
              <option value="">Todas as marcas</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </Select>
          </div>
          {error ? (
            <Alert tone="danger" className="mt-4">
              {error}
            </Alert>
          ) : null}
          <div className="mt-4">
            {receipts == null ? (
              <LoadingState label="Carregando recebimentos…" className="mt-6" />
            ) : visible.length === 0 ? (
              <EmptyState
                title="Nenhum recebimento encontrado. Caixas antigas continuam válidas sem vínculo com um recebimento."
                className="mt-4"
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((item) => (
                  <li key={item.receipt.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-line bg-surface p-4 text-left text-sm transition-colors hover:border-accent hover:bg-selected"
                      onClick={() => setScreen({ kind: "detail", receiptId: item.receipt.id })}
                    >
                      <p className="font-mono">{item.receipt.code}</p>
                      <p className="mt-1 text-muted">
                        {formatDatePt(item.receipt.receivedAt)} ·{" "}
                        {formatQuantity(item.receipt.items.length)}{" "}
                        {item.receipt.items.length === 1 ? "produto" : "produtos"} ·{" "}
                        {formatQuantity(item.boxCount)} caixas
                      </p>
                      <p className="mt-1">{item.productLabels.join(" · ") || "Sem produto"}</p>
                      <p className="text-xs text-muted">
                        {RECEIPT_STATUS_LABEL[item.receipt.status]}
                        {item.receipt.supplierName ? ` · ${item.receipt.supplierName}` : ""}
                        {item.batches.length > 0 ? ` · ${item.batches.join(", ")}` : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <PrintLabelDialog
        open={printJob != null}
        wide={printJob?.kind === "batch"}
        title={printJob?.kind === "single" ? "Etiqueta da caixa" : "Etiquetas do recebimento"}
        onOpenChange={(open) => {
          if (!open) setPrintJob(null);
        }}
      >
        {printJob?.kind === "batch" ? (
          <ReceiptLabelSheet boxes={printJob.boxes} products={products} />
        ) : null}
        {printJob?.kind === "single" ? (
          <BoxLabel
            box={printJob.box}
            product={products.find((product) => product.id === printJob.box.productId) ?? null}
          />
        ) : null}
      </PrintLabelDialog>
    </AppShell>
  );
}

function ReceiptDetail({
  receipt,
  boxes,
  products,
  onPrintAll,
  onPrintOne,
}: {
  receipt: Receipt;
  boxes: Box[];
  products: Product[];
  onPrintAll: () => void;
  onPrintOne: (box: Box) => void;
}) {
  return (
    <section className="mt-6 flex flex-col gap-5">
      <div>
        <p className="font-mono text-sm text-ink">{receipt.code}</p>
        <p className="mt-1 text-sm text-muted">
          {formatDatePt(receipt.receivedAt)} · {RECEIPT_STATUS_LABEL[receipt.status]}
          {receipt.supplierName ? ` · ${receipt.supplierName}` : ""}
        </p>
        <p className="mt-2 text-sm text-ink">{receipt.notes ?? "Sem observações."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onPrintAll} disabled={boxes.length === 0}>
          Imprimir todas as etiquetas
        </Button>
      </div>
      {receipt.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId) ?? null;
        return (
          <article key={item.id} className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">
              {[product?.brand, product?.name].filter(Boolean).join(" · ") || "Produto"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatQuantity(item.boxesQuantity)} caixas · {formatQuantity(item.rollsQuantity)}{" "}
              rolos por caixa · {item.totalLengthM} m
              {item.manufacturerBatch ? ` · lote ${item.manufacturerBatch}` : ""}
            </p>
            {item.notes ? <p className="mt-1 text-sm">{item.notes}</p> : null}
          </article>
        );
      })}
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Caixas geradas</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {boxes.map((box) => (
            <li key={box.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm">{box.code}</span>
              <Button variant="secondary" onClick={() => onPrintOne(box)}>
                Etiqueta
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
