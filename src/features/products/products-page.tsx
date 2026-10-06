import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Boxes, X } from "lucide-react";
import {
  EMPTY_PRODUCT_FORM,
  buildDuplicateInput,
  productToFormValues,
  type Product,
  type ProductFormValues,
  type ProductInput,
} from "@orion/domain";

import { Button } from "@/components/ui/button";
import { ProductFilters } from "@/features/products/product-filters";
import { ProductForm } from "@/features/products/product-form";
import { ProductTable } from "@/features/products/product-table";
import { useProductCatalog } from "@/features/products/use-product-catalog";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; product: Product }
  | { mode: "duplicate"; product: Product };

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
    <div className="min-h-screen bg-bg text-ink">
      <div className="md:flex">
        <aside className="bg-ink text-on-ink md:min-h-screen md:w-56 md:shrink-0">
          <div className="flex items-center gap-3 px-4 py-5">
            <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-fg">
              <Boxes className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">ORION STORAGE</p>
              <p className="text-xs text-on-ink-muted">Estoque físico</p>
            </div>
          </div>
          <nav className="px-3 pb-4" aria-label="Seções">
            <span className="flex min-h-11 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg">
              Produtos
            </span>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Catálogo</p>
              <h1 className="text-2xl font-semibold text-ink">Produtos</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Cadastro padronizado do Orion Storage. Medidas de fita são opcionais e ficam em milímetros e
                metros, sem unidade gravada no valor.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setFormError(null);
                setEditor({ mode: "create" });
              }}
            >
              Novo produto
            </Button>
          </header>

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
            <p className="mt-4 rounded-md border border-danger px-3 py-2 text-sm text-danger" role="alert">
              {catalog.error}
            </p>
          ) : null}
          {formError && !editor ? (
            <p className="mt-4 rounded-md border border-danger px-3 py-2 text-sm text-danger" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="mt-4">
            {catalog.loading ? (
              <p className="text-sm text-muted">Carregando catálogo…</p>
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
        </main>
      </div>

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
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
          <Dialog.Content className="catalog-dialog fixed top-4 right-4 left-4 z-50 mx-auto overflow-y-auto rounded-lg border border-line bg-surface p-5 shadow-xl md:top-10 md:max-w-3xl">
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
                <Button variant="ghost" aria-label="Fechar" disabled={submitting}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            {formError ? (
              <p className="mb-4 rounded-md border border-danger px-3 py-2 text-sm text-danger" role="alert">
                {formError}
              </p>
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function editorValues(editor: EditorState | null): ProductFormValues {
  if (!editor || editor.mode === "create") return EMPTY_PRODUCT_FORM;
  if (editor.mode === "edit") return productToFormValues(editor.product);
  return productToFormValues({ ...editor.product, ...buildDuplicateInput(editor.product) });
}
