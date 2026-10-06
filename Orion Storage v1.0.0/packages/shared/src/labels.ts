import type { BoxHistoryType, LocationStatus, ProductStatus, StorageAreaStatus } from "@orion/domain";

export { BOX_STATUS_LABEL, LOCATION_STATUS_LABEL, STORAGE_AREA_STATUS_LABEL } from "@orion/domain";

export const STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const AREA_STATUS_LABEL: Record<StorageAreaStatus, string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
};

export const ADDRESS_STATUS_LABEL: Record<LocationStatus, string> = {
  ACTIVE: "Ativa",
  BLOCKED: "Bloqueada",
  INACTIVE: "Inativa",
};

export const BOX_HISTORY_LABEL: Record<BoxHistoryType, string> = {
  CREATED: "Criação",
  UPDATED: "Atualização",
  STATUS_CHANGED: "Mudança de status",
  LOCATION_ASSIGNED: "Endereçamento",
  LOCATION_CHANGED: "Troca de endereço",
  LOCATION_CLEARED: "Saída do endereço",
};
