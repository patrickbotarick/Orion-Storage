import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type PrintLabelDialogProps = {
  open: boolean;
  title: string;
  autoPrint?: boolean;
  wide?: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function PrintLabelDialog({
  open,
  title,
  autoPrint = false,
  wide = false,
  onOpenChange,
  children,
}: PrintLabelDialogProps) {
  useEffect(() => {
    if (!open) {
      clearPrintMode();
      return;
    }
    if (!autoPrint) return;
    const timer = window.setTimeout(() => {
      startPrint();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [autoPrint, open]);

  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) clearPrintMode();
          onOpenChange(next);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="print-hide fixed inset-0 z-[60] bg-ink/50" />
          <Dialog.Content
            className={`print-hide catalog-dialog fixed top-4 right-4 left-4 z-[70] mx-auto overflow-y-auto rounded-lg border border-line bg-surface p-5 shadow-xl md:top-10 ${wide ? "md:max-w-4xl" : "md:max-w-xl"}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-ink">{title}</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  Esta é a arte impressa. Menu, filtros e botões ficam de fora da folha.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" aria-label="Fechar">
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="flex justify-center overflow-x-auto rounded-md bg-bg p-4">
              {children}
            </div>
            <p className="mt-3 text-xs text-muted">
              Para PDF, use o diálogo de impressão do navegador e escolha salvar como PDF.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" onClick={startPrint}>
                Imprimir
              </Button>
              <Dialog.Close asChild>
                <Button variant="secondary">Fechar</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {open ? <PrintSheet>{children}</PrintSheet> : null}
    </>
  );
}

function PrintSheet({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(<div className="orion-print-sheet">{children}</div>, document.body);
}

function startPrint() {
  document.body.dataset.orionPrint = "label";
  const finish = () => {
    clearPrintMode();
    window.removeEventListener("afterprint", finish);
  };
  window.addEventListener("afterprint", finish);
  window.print();
  window.setTimeout(finish, 1500);
}

function clearPrintMode() {
  if (typeof document === "undefined") return;
  delete document.body.dataset.orionPrint;
}
