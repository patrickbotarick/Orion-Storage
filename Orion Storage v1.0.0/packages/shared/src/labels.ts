import type { BoxHistoryType, ProductStatus } from "@orion/domain";

export { BOX_STATUS_LABEL } from "@orion/domain";

export const STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export const BOX_HISTORY_LABEL: Record<BoxHistoryType, string> = {
  CREATED: "Criação",
  UPDATED: "Atualização",
  STATUS_CHANGED: "Mudança de status",
};
