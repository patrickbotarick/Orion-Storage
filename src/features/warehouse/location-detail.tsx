import { EmptyState } from "@/components/ui/feedback";
import { ModalOverlay, Modal } from "@/components/ui/modal";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BOX_STATUS_LABEL,
  LOCATION_STATUS_LABEL,
  OCCUPANCY_LABEL,
  formatOccupancyCount,
  type MapCell,
  type Product,
  type StorageArea,
} from "@orion/domain";
import { formatMillimeters } from "@orion/shared";
import { X } from "lucide-react";

import { IconButton } from "@/components/ui/button";

type LocationDetailProps = {
  cell: MapCell | null;
  area: StorageArea | null;
  products: readonly Product[];
  onClose: () => void;
};

export function LocationDetail({ cell, area, products, onClose }: LocationDetailProps) {
  const location = cell?.location;
  return (
    <Dialog.Root
      open={cell != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <ModalOverlay className="" />
        <Modal className="md:max-w-3xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-mono text-xl font-semibold text-ink">
                {location?.code ?? "Endereço"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Visualização do estoque. Este mapa não move nem edita.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton variant="ghost" aria-label="Fechar">
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </Dialog.Close>
          </div>
          {cell && location ? (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Item label="Área" value={area?.name ?? "—"} />
                <Item label="Corredor" value={location.aisle} />
                <Item label="Prateleira" value={location.rack} />
                <Item label="Nível" value={location.level} />
                <Item label="Posição" value={location.position} />
                <Item label="Status" value={LOCATION_STATUS_LABEL[location.status]} />
                <Item
                  label="Capacidade"
                  value={
                    cell.occupancy.capacityBoxes == null
                      ? "não definida"
                      : `${cell.occupancy.capacityBoxes} caixas`
                  }
                />
                <Item label="Ocupação" value={formatOccupancyCount(cell.occupancy)} />
                <Item label="Estado" value={OCCUPANCY_LABEL[cell.occupancy.kind]} />
              </dl>
              <a
                href={`/enderecamento?endereco=${encodeURIComponent(location.id)}`}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-line px-3 text-sm font-medium"
              >
                Ver endereço
              </a>
              <div>
                <h3 className="text-sm font-semibold text-ink">Caixas armazenadas</h3>
                {cell.boxes.length === 0 ? (
                  <EmptyState title="Nenhuma caixa nesta posição." className="mt-4" />
                ) : (
                  <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                    {cell.boxes.map((box) => {
                      const product = products.find((item) => item.id === box.productId) ?? null;
                      return (
                        <li
                          key={box.id}
                          className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-mono font-medium">{box.code}</p>
                            <p>{product?.name ?? "Produto não encontrado"}</p>
                            <p className="text-muted">
                              {product?.brand ?? "—"} · {product?.colorName ?? "—"} ·{" "}
                              {formatMillimeters(product?.widthMm)} · {BOX_STATUS_LABEL[box.status]}
                            </p>
                          </div>
                          <a
                            href={`/caixas?caixa=${encodeURIComponent(box.id)}`}
                            className="inline-flex min-h-11 items-center font-medium text-accent underline"
                          >
                            Ver caixa
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
