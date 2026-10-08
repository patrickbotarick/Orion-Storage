import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  boxToEditFormValues,
  emptyBoxForm,
  type Box,
  type BoxCreateInput,
  type BoxStatus,
  type BoxUpdateInput,
  type Product,
} from "@orion/domain";
import { X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button, IconButton } from "@/components/ui/button";
import { Modal, ModalOverlay } from "@/components/ui/modal";
import { Alert, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/surfaces";
import { BoxDetail } from "@/features/boxes/box-detail";
import { BoxFilters } from "@/features/boxes/box-filters";
import { BoxForm } from "@/features/boxes/box-form";
import { BoxTable } from "@/features/boxes/box-table";
import { useBoxCatalog } from "@/features/boxes/use-box-catalog";
import { BoxLabel } from "@/features/identification/box-label";
import { PrintLabelDialog } from "@/features/identification/print-label-dialog";

type EditorState =
  | { mode: "create"; values: ReturnType<typeof emptyBoxForm> }
  | { mode: "edit"; box: Box }
  | { mode: "detail"; box: Box };

export function BoxesPage() {
  const catalog = useBoxCatalog();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [label, setLabel] = useState<{ box: Box; autoPrint: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const openedFromQuery = useRef(false);

  useEffect(() => {
    if (openedFromQuery.current || catalog.boxes == null) return;
    openedFromQuery.current = true;
    const id = new URLSearchParams(window.location.search).get("caixa");
    if (!id) return;
    const box = catalog.boxes.find((item) => item.id === id);
    if (box) setEditor({ mode: "detail", box });
  }, [catalog.boxes]);

  const activeBox = editor && editor.mode !== "create" ? editor.box : null;
  const linkedProduct = findProduct(catalog.products, activeBox?.productId);

  async function handleCreate(input: BoxCreateInput) {
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await catalog.create(input);
      setEditor({ mode: "detail", box: created });
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Não foi possível registrar a caixa.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(input: BoxUpdateInput) {
    if (editor?.mode !== "edit") return;
    setSubmitting(true);
    setFormError(null);
    try {
      const updated = await catalog.update(editor.box.id, input);
      setEditor({ mode: "detail", box: updated });
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível salvar a caixa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLocation(locationId: string | null) {
    if (editor?.mode !== "detail") return;
    setSubmitting(true);
    setFormError(null);
    try {
      const updated = await catalog.setLocation(editor.box.id, locationId);
      setEditor({ mode: "detail", box: updated });
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Não foi possível alterar a localização.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function handleStatus(status: BoxStatus) {
    if (editor?.mode !== "detail") return;
    setSubmitting(true);
    setFormError(null);
    try {
      const updated = await catalog.setStatus(editor.box.id, status);
      setEditor({ mode: "detail", box: updated });
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível alterar o status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppShell section="boxes">
        <PageHeader
          title="Caixas"
          eyebrow="Rastreabilidade"
          description="Cada caixa física tem código próprio, conteúdo e histórico. A localização é opcional."
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setEditor({ mode: "create", values: emptyBoxForm() });
              }}
            >
              Nova caixa
            </Button>
          }
        />

        <div className="mt-6">
          <BoxFilters
            query={catalog.query}
            products={catalog.products ?? []}
            brands={catalog.brands}
            resultCount={catalog.visible.length}
            onChange={catalog.setQuery}
          />
        </div>

        {catalog.error ? (
          <Alert tone="danger" className="mt-4">
            {catalog.error}
          </Alert>
        ) : null}

        <div className="mt-4">
          {catalog.loading ? (
            <LoadingState label="Carregando caixas…" />
          ) : (
            <BoxTable
              items={catalog.visible}
              onOpen={(item) => {
                setFormError(null);
                setEditor({ mode: "detail", box: item.box });
              }}
              onEdit={(item) => {
                setFormError(null);
                setEditor({ mode: "edit", box: item.box });
              }}
              onLabel={(item) => setLabel({ box: item.box, autoPrint: false })}
            />
          )}
        </div>
      </AppShell>

      <Dialog.Root
        open={editor != null}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setEditor(null);
            setFormError(null);
          }
        }}
      >
        <Dialog.Portal>
          <ModalOverlay />
          <Modal>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-ink">
                  {editor?.mode === "edit"
                    ? "Editar caixa"
                    : editor?.mode === "detail"
                      ? editor.box.code
                      : "Nova caixa"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {editor?.mode === "detail"
                    ? "Condição, conteúdo e histórico desta caixa física."
                    : editor?.mode === "edit"
                      ? "Altere só o conteúdo. Código e produto permanecem."
                      : "Escolha um produto ativo e informe o que veio nesta caixa."}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton variant="ghost" aria-label="Fechar" disabled={submitting}>
                  <X className="size-4" aria-hidden="true" />
                </IconButton>
              </Dialog.Close>
            </div>
            {formError ? (
              <Alert tone="danger" className="mb-4">
                {formError}
              </Alert>
            ) : null}
            {editor?.mode === "create" ? (
              <BoxForm
                key="create"
                mode="create"
                products={catalog.activeProducts}
                initialValues={editor.values}
                submitting={submitting}
                onSubmit={async (input) => handleCreate(input as BoxCreateInput)}
                onCancel={() => {
                  if (!submitting) setEditor(null);
                }}
              />
            ) : null}
            {editor?.mode === "edit" ? (
              <BoxForm
                key={`edit-${editor.box.id}-${editor.box.updatedAt}`}
                mode="edit"
                products={catalog.activeProducts}
                box={editor.box}
                product={linkedProduct}
                initialValues={boxToEditFormValues(editor.box)}
                submitting={submitting}
                onSubmit={async (input) => handleUpdate(input as BoxUpdateInput)}
                onCancel={() => {
                  if (!submitting) setEditor({ mode: "detail", box: editor.box });
                }}
              />
            ) : null}
            {editor?.mode === "detail" ? (
              <BoxDetail
                key={`${editor.box.id}-${editor.box.updatedAt}`}
                box={editor.box}
                product={findProduct(catalog.products, editor.box.productId)}
                locations={catalog.locations}
                locationCode={
                  catalog.locations.find((location) => location.id === editor.box.currentLocationId)
                    ?.code
                }
                submitting={submitting}
                movements={catalog.movements.filter((movement) => movement.boxId === editor.box.id)}
                onEdit={() => setEditor({ mode: "edit", box: editor.box })}
                onStatus={handleStatus}
                onAssign={(locationId) => handleLocation(locationId)}
                onClear={() => handleLocation(null)}
                onPreviewLabel={() => setLabel({ box: editor.box, autoPrint: false })}
                onPrintLabel={() => setLabel({ box: editor.box, autoPrint: true })}
              />
            ) : null}
          </Modal>
        </Dialog.Portal>
      </Dialog.Root>
      <PrintLabelDialog
        open={label != null}
        title="Etiqueta da caixa"
        autoPrint={label?.autoPrint ?? false}
        onOpenChange={(open) => {
          if (!open) setLabel(null);
        }}
      >
        {label ? (
          <BoxLabel box={label.box} product={findProduct(catalog.products, label.box.productId)} />
        ) : null}
      </PrintLabelDialog>
    </>
  );
}

function findProduct(products: Product[] | null, productId: string | undefined): Product | null {
  if (!products || !productId) return null;
  return products.find((product) => product.id === productId) ?? null;
}
