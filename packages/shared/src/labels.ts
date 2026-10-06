import type { ProductStatus } from "@orion/domain";

export const STATUS_LABEL: Record<ProductStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};
