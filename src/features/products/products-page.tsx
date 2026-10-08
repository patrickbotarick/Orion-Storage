import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  EMPTY_PRODUCT_FORM,
  buildDuplicateInput,
  productToFormValues,
  type Product,
  type ProductFormValues,
  type ProductInput,
} from "@orion/domain";

import { AppShell } from "@/components/app-shell";
import { Button, IconButton } from "@/components/ui/button";
import { Modal, ModalOverlay } from "@/components/ui/modal";
import { Alert, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/surfaces";
import { ProductFilters } from "@/features/products/product-filters";
import { ProductForm } from "@/features/products/product-form";
import { ProductTable } from "@/features/products/product-table";
import { useProductCatalog } from "@/features/products/use-product-catalog";

type EditorState =
  { mode: "create" } | { mode: "edit"; product: Product } | { mode: "duplicate"; product: Product };

export function ProductsPage() {
  const catalog = useProductCatalog();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(input: ProductInput) {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editor?.mode === "edit") await catalog.update(editor.product.id, input);
      else await catalog.create(input);
      setEditor(null);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível salvar o produto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(product: Product) {
    setFormError(null);
    try {
      await catalog.toggleStatus(product);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Não foi possível alterar o status.");
    }
  }

  const formValues = editorValues(editor);

  return (
    <>
      <AppShell section="products">
        <PageHeader
          title="Produtos"
          eyebrow="Catálogo"
          description="Cadastro padronizado do Orion Storage. Medidas de fita são opcionais e ficam em milímetros e metros, sem unidade gravada no valor."
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setEditor({ mode: "create" });
              }}
            >
              Novo produto
            </Button>
          }
        />

        <div className="mt-6">
          <ProductFilters
            query={catalog.query}
            categories={catalog.categories}
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
        {formError && !editor ? (
          <Alert tone="danger" className="mt-4">
            {formError}
          </Alert>
        ) : null}

        <div className="mt-4">
          {catalog.loading ? (
            <LoadingState label="Carregando catálogo…" />
          ) : (
            <ProductTable
              products={catalog.visible}
              onEdit={(product) => {
                setFormError(null);
                setEditor({ mode: "edit", product });
              }}
              onDuplicate={(product) => {
                setFormError(null);
                setEditor({ mode: "duplicate", product });
              }}
              onToggleStatus={(product) => void handleToggle(product)}
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
                    ? "Editar produto"
                    : editor?.mode === "duplicate"
                      ? "Duplicar produto"
                      : "Novo produto"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  Campos com * são obrigatórios. Atributos de fita podem ficar vazios.
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
            {editor ? (
              <ProductForm
                key={`${editor.mode}-${"product" in editor ? editor.product.id : "new"}`}
                mode={editor.mode}
                initialValues={formValues}
                sourceName={"product" in editor ? editor.product.name : undefined}
                submitting={submitting}
                onSubmit={handleSubmit}
                onCancel={() => {
                  if (!submitting) setEditor(null);
                }}
              />
            ) : null}
          </Modal>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function editorValues(editor: EditorState | null): ProductFormValues {
  if (!editor || editor.mode === "create") return EMPTY_PRODUCT_FORM;
  if (editor.mode === "edit") return productToFormValues(editor.product);
  return productToFormValues({ ...editor.product, ...buildDuplicateInput(editor.product) });
}
